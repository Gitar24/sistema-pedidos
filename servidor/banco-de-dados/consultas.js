// Tudo o que o sistema lê ou grava no banco passa por aqui. Se uma gravação falhar,
// o erro vira ErroBanco, para a tela nunca dizer que salvou o que não foi salvo.
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

  // O pedido e os itens dele são gravados juntos, numa transação só: ou entra tudo,
  // ou não entra nada.
  function criarPedido({ mesa, itens: itensSolicitados }) {
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
        const { lastInsertRowid } = db.prepare('INSERT INTO pedidos (mesa, total_centavos) VALUES (?, ?)').run(mesa, totalCentavos);
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
      // Se existe data de cancelamento, quem vê o pedido enxerga o status "cancelado".
      `SELECT id, mesa,
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

  // O cliente desistiu. Não apagamos o pedido: só anotamos a data do cancelamento,
  // para ele continuar aparecendo no histórico.
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
