// Consultas e gravações no banco. Erros de gravação viram ErroBanco, para que a
// tela nunca confirme algo que não foi salvo.
const { emTransacao } = require('./conexao');
const { ErroValidacao, ErroBanco, ErroNaoEncontrado } = require('../tipos-de-erro');

function criarConsultas(db) {
  function listarCardapio() {
    return db.prepare('SELECT id, nome, preco_centavos AS precoCentavos FROM itens_cardapio ORDER BY nome').all()
      .map((linha) => ({ ...linha }));
  }

  function criarItemCardapio({ nome, precoCentavos }) {
    try {
      const resultado = db.prepare('INSERT INTO itens_cardapio (nome, preco_centavos) VALUES (?, ?)')
        .run(nome, precoCentavos);
      return { id: Number(resultado.lastInsertRowid), nome, precoCentavos };
    } catch (erro) {
      if (String(erro.message).includes('UNIQUE')) {
        throw new ErroValidacao(`Já existe um item chamado "${nome}" no cardápio.`);
      }
      throw new ErroBanco('Não foi possível gravar o item no banco de dados. O item NÃO foi cadastrado.', erro);
    }
  }

  // Grava o pedido e seus itens numa única transação: ou grava tudo, ou nada.
  function criarPedido(itensSolicitados) {
    const buscarItem = db.prepare('SELECT id, nome, preco_centavos AS precoCentavos FROM itens_cardapio WHERE id = ?');

    const itens = itensSolicitados.map((solicitado, i) => {
      const item = buscarItem.get(solicitado.itemId);
      if (!item) {
        throw new ErroValidacao(`Item ${i + 1} do pedido: o item #${solicitado.itemId} não existe no cardápio.`);
      }
      return { itemId: item.id, nome: item.nome, precoCentavos: item.precoCentavos, quantidade: solicitado.quantidade, observacao: solicitado.observacao };
    });
    const totalCentavos = itens.reduce((soma, item) => soma + item.precoCentavos * item.quantidade, 0);

    let pedidoId;
    try {
      pedidoId = emTransacao(db, () => {
        const { lastInsertRowid } = db.prepare('INSERT INTO pedidos (total_centavos) VALUES (?)').run(totalCentavos);
        const inserirItem = db.prepare(
          'INSERT INTO itens_pedido (pedido_id, item_id, nome, preco_centavos, quantidade, observacao) VALUES (?, ?, ?, ?, ?, ?)',
        );
        for (const item of itens) {
          inserirItem.run(lastInsertRowid, item.itemId, item.nome, item.precoCentavos, item.quantidade, item.observacao);
        }
        return Number(lastInsertRowid);
      });
    } catch (erro) {
      throw new ErroBanco('Não foi possível gravar o pedido no banco de dados. O pedido NÃO foi registrado.', erro);
    }
    return buscarPedido(pedidoId);
  }

  function buscarPedido(id) {
    const pedido = db.prepare(
      // O status mostrado ao usuário é "cancelado" quando há data de cancelamento.
      `SELECT id,
              CASE WHEN cancelado_em IS NOT NULL THEN 'cancelado' ELSE status END AS status,
              total_centavos AS totalCentavos, criado_em AS criadoEm,
              impresso_em AS impressoEm, cancelado_em AS canceladoEm
       FROM pedidos WHERE id = ?`,
    ).get(id);
    if (!pedido) return null;
    const itens = db.prepare(
      `SELECT item_id AS itemId, nome, preco_centavos AS precoCentavos, quantidade, observacao
       FROM itens_pedido WHERE pedido_id = ? ORDER BY id`,
    ).all(id).map((linha) => ({ ...linha }));
    return { ...pedido, itens };
  }

  function listarPedidos({ status, limite = 30 } = {}) {
    const FILTROS = {
      impresso: "WHERE status = 'impresso' AND cancelado_em IS NULL",
      nao_impresso: "WHERE status = 'nao_impresso' AND cancelado_em IS NULL",
      cancelado: 'WHERE cancelado_em IS NOT NULL',
    };
    const ids = db.prepare(`SELECT id FROM pedidos ${FILTROS[status] || ''} ORDER BY id DESC LIMIT ?`).all(limite);
    return ids.map(({ id }) => buscarPedido(id));
  }

  function marcarImpresso(id) {
    db.prepare(
      `UPDATE pedidos SET status = 'impresso', impresso_em = datetime('now', 'localtime')
       WHERE id = ? AND cancelado_em IS NULL`,
    ).run(id);
  }

  // Cancela o pedido (o cliente desistiu). Não apaga nada: guarda a data e mantém o histórico.
  function cancelarPedido(id) {
    const pedido = buscarPedido(id);
    if (!pedido) throw new ErroNaoEncontrado(`O pedido #${id} não existe.`);
    if (pedido.status === 'cancelado') throw new ErroValidacao(`O pedido #${id} já está cancelado.`);
    try {
      db.prepare(`UPDATE pedidos SET cancelado_em = datetime('now', 'localtime') WHERE id = ? AND cancelado_em IS NULL`).run(id);
    } catch (erro) {
      throw new ErroBanco(`Não foi possível cancelar o pedido #${id} no banco de dados. O pedido continua ativo.`, erro);
    }
    return { pedido: buscarPedido(id), jaFoiImpresso: pedido.status === 'impresso' };
  }

  return { listarCardapio, criarItemCardapio, criarPedido, buscarPedido, listarPedidos, marcarImpresso, cancelarPedido };
}

module.exports = { criarConsultas };
