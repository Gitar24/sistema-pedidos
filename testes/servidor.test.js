const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const pastaTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'pedidos-teste-'));
process.env.ARQUIVO_LOG = path.join(pastaTemp, 'erros.log');

const { abrirBanco } = require('../servidor/banco-de-dados/conexao');
const { criarApp } = require('../servidor/aplicacao');
const { ErroImpressora } = require('../servidor/impressao/impressora');

// Impressora falsa: controla se "está ligada" e guarda o que recebeu.
const impressoraFalsa = {
  ligada: true,
  impressos: [],
  async imprimirPedido(pedido) {
    if (!this.ligada) throw new ErroImpressora('Não foi possível imprimir: a impressora parece desligada ou desconectada.');
    this.impressos.push(pedido);
  },
};

let db, servidor, base;

before(async () => {
  db = abrirBanco(':memory:');
  const app = criarApp({ db, impressora: impressoraFalsa });
  await new Promise((ok) => { servidor = app.listen(0, ok); });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => {
  servidor.close();
  fs.rmSync(pastaTemp, { recursive: true, force: true });
});

async function req(metodo, caminho, corpo, corpoCru) {
  const resposta = await fetch(base + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: corpoCru ?? (corpo === undefined ? undefined : JSON.stringify(corpo)),
  });
  return { status: resposta.status, dados: await resposta.json() };
}

test('cardápio fictício vem carregado', async () => {
  const { status, dados } = await req('GET', '/api/cardapio');
  assert.strictEqual(status, 200);
  assert.strictEqual(dados.itens.length, 10);
  assert.ok(dados.itens.every((i) => i.nome && Number.isInteger(i.precoCentavos)));
});

test('cadastra item válido', async () => {
  const { status, dados } = await req('POST', '/api/cardapio', { nome: 'Tapioca', preco: 14.9 });
  assert.strictEqual(status, 201);
  assert.strictEqual(dados.item.precoCentavos, 1490);
});

for (const [descricao, corpo, trecho] of [
  ['preço negativo', { nome: 'X', preco: -1 }, 'negativo'],
  ['nome vazio', { nome: '   ', preco: 5 }, 'nome'],
  ['preço texto', { nome: 'Y', preco: 'abc' }, 'número'],
  ['3 casas decimais', { nome: 'Z', preco: 1.234 }, 'casas decimais'],
  ['nome repetido', { nome: 'coxinha', preco: 5 }, 'Já existe'],
]) {
  test(`recusa item: ${descricao}`, async () => {
    const { status, dados } = await req('POST', '/api/cardapio', corpo);
    assert.strictEqual(status, 400);
    assert.match(dados.erro, new RegExp(trecho));
  });
}

test('registra pedido e imprime', async () => {
  const { status, dados } = await req('POST', '/api/pedidos', { itens: [{ itemId: 1, quantidade: 2 }, { itemId: 2 }] });
  assert.strictEqual(status, 201);
  assert.strictEqual(dados.impresso, true);
  assert.strictEqual(dados.pedido.status, 'impresso');
  assert.strictEqual(dados.pedido.itens.length, 2);
  const esperado = dados.pedido.itens.reduce((s, i) => s + i.precoCentavos * i.quantidade, 0);
  assert.strictEqual(dados.pedido.totalCentavos, esperado);
});

for (const [descricao, corpo, trecho] of [
  ['sem itens', { itens: [] }, 'pelo menos um item'],
  ['sem campo itens', {}, 'pelo menos um item'],
  ['item inexistente', { itens: [{ itemId: 9999 }] }, 'não existe no cardápio'],
  ['quantidade zero', { itens: [{ itemId: 1, quantidade: 0 }] }, 'quantidade'],
  ['itemId inválido', { itens: [{ itemId: 'a' }] }, 'identificador'],
]) {
  test(`recusa pedido: ${descricao}`, async () => {
    const antes = db.prepare('SELECT COUNT(*) AS n FROM pedidos').get().n;
    const { status, dados } = await req('POST', '/api/pedidos', corpo);
    assert.strictEqual(status, 400);
    assert.match(dados.erro, new RegExp(trecho));
    assert.strictEqual(db.prepare('SELECT COUNT(*) AS n FROM pedidos').get().n, antes);
  });
}

test('recusa JSON malformado', async () => {
  const { status, dados } = await req('POST', '/api/pedidos', undefined, '{itens: [');
  assert.strictEqual(status, 400);
  assert.match(dados.erro, /JSON/);
});

test('impressora desligada: pedido fica salvo como não impresso e pode ser reimpresso', async () => {
  impressoraFalsa.ligada = false;
  const r1 = await req('POST', '/api/pedidos', { itens: [{ itemId: 3 }] });
  assert.strictEqual(r1.status, 201);
  assert.strictEqual(r1.dados.impresso, false);
  assert.match(r1.dados.aviso, /desligada/);
  const id = r1.dados.pedido.id;

  const lista = await req('GET', '/api/pedidos?status=nao_impresso');
  assert.ok(lista.dados.pedidos.some((p) => p.id === id));

  const r2 = await req('POST', `/api/pedidos/${id}/imprimir`);
  assert.strictEqual(r2.status, 503);
  assert.strictEqual(r2.dados.pedido.status, 'nao_impresso');

  impressoraFalsa.ligada = true;
  const r3 = await req('POST', `/api/pedidos/${id}/imprimir`);
  assert.strictEqual(r3.status, 200);
  assert.strictEqual(r3.dados.pedido.status, 'impresso');
});

test('reimpressão de pedido já impresso é marcada como reimpressão', async () => {
  const { dados } = await req('POST', '/api/pedidos', { itens: [{ itemId: 4 }] });
  await req('POST', `/api/pedidos/${dados.pedido.id}/imprimir`);
  assert.strictEqual(impressoraFalsa.impressos.at(-1).reimpressao, true);
});

test('reimprimir pedido inexistente dá 404', async () => {
  const { status, dados } = await req('POST', '/api/pedidos/99999/imprimir');
  assert.strictEqual(status, 404);
  assert.match(dados.erro, /não existe/);
});

test('falha do banco: pedido não é confirmado, nada fica gravado e o erro vai para o log', async () => {
  const antes = db.prepare('SELECT COUNT(*) AS n FROM pedidos').get().n;
  const impressosAntes = impressoraFalsa.impressos.length;
  db.exec(`CREATE TRIGGER falha_simulada BEFORE INSERT ON itens_pedido
           BEGIN SELECT RAISE(ABORT, 'disco cheio simulado'); END;`);
  try {
    const { status, dados } = await req('POST', '/api/pedidos', { itens: [{ itemId: 1 }] });
    assert.strictEqual(status, 500);
    assert.match(dados.erro, /NÃO foi registrado/);
    assert.strictEqual(dados.pedido, undefined);
  } finally {
    db.exec('DROP TRIGGER falha_simulada');
  }
  assert.strictEqual(db.prepare('SELECT COUNT(*) AS n FROM pedidos').get().n, antes, 'transação desfeita');
  assert.strictEqual(impressoraFalsa.impressos.length, impressosAntes, 'nada impresso');
  assert.match(fs.readFileSync(process.env.ARQUIVO_LOG, 'utf8'), /disco cheio simulado/);
});

test('rota inexistente da API dá 404 em JSON', async () => {
  const { status } = await req('GET', '/api/nada');
  assert.strictEqual(status, 404);
});

// ---------- Personalização do item (observação) ----------

test('pedido com observação guarda o texto limpo e devolve na resposta', async () => {
  const { status, dados } = await req('POST', '/api/pedidos', {
    itens: [
      { itemId: 4, quantidade: 1, observacao: '  sem   verduras\ne sem tomate ' },
      { itemId: 4, quantidade: 1 },
    ],
  });
  assert.strictEqual(status, 201);
  assert.strictEqual(dados.pedido.itens[0].observacao, 'sem verduras e sem tomate');
  assert.strictEqual(dados.pedido.itens[1].observacao, '');
  assert.strictEqual(impressoraFalsa.impressos.at(-1).itens[0].observacao, 'sem verduras e sem tomate');
});

test('recusa observação grande demais ou que não é texto', async () => {
  const grande = await req('POST', '/api/pedidos', { itens: [{ itemId: 1, observacao: 'a'.repeat(81) }] });
  assert.strictEqual(grande.status, 400);
  assert.match(grande.dados.erro, /no máximo 80 caracteres/);
  const numero = await req('POST', '/api/pedidos', { itens: [{ itemId: 1, observacao: 123 }] });
  assert.strictEqual(numero.status, 400);
  assert.match(numero.dados.erro, /deve ser um texto/);
});

test('banco antigo (sem coluna observacao) é atualizado sem perder pedidos', () => {
  const { DatabaseSync } = require('node:sqlite');
  const arquivo = path.join(pastaTemp, 'antigo.db');
  const velho = new DatabaseSync(arquivo);
  velho.exec(`
    CREATE TABLE itens_cardapio (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL UNIQUE COLLATE NOCASE,
      preco_centavos INTEGER NOT NULL, criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')));
    CREATE TABLE pedidos (id INTEGER PRIMARY KEY AUTOINCREMENT, status TEXT NOT NULL DEFAULT 'nao_impresso',
      total_centavos INTEGER NOT NULL, criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')), impresso_em TEXT);
    CREATE TABLE itens_pedido (id INTEGER PRIMARY KEY AUTOINCREMENT, pedido_id INTEGER NOT NULL, item_id INTEGER NOT NULL,
      nome TEXT NOT NULL, preco_centavos INTEGER NOT NULL, quantidade INTEGER NOT NULL);
    INSERT INTO itens_cardapio (nome, preco_centavos) VALUES ('Coxinha', 800);
    INSERT INTO pedidos (total_centavos) VALUES (800);
    INSERT INTO itens_pedido (pedido_id, item_id, nome, preco_centavos, quantidade) VALUES (1, 1, 'Coxinha', 800, 1);
  `);
  velho.close();
  const atualizado = abrirBanco(arquivo);
  const linha = atualizado.prepare('SELECT nome, observacao FROM itens_pedido').get();
  assert.strictEqual(linha.nome, 'Coxinha');
  assert.strictEqual(linha.observacao, '');
  assert.strictEqual(atualizado.prepare('SELECT cancelado_em FROM pedidos').get().cancelado_em, null, 'coluna de cancelamento criada');
  atualizado.close();
});

// ---------- Cancelamento de pedido ----------

test('cancelar pedido não impresso: fica no histórico como cancelado e não pode ser reimpresso', async () => {
  impressoraFalsa.ligada = false;
  const { dados: criado } = await req('POST', '/api/pedidos', { itens: [{ itemId: 1 }] });
  impressoraFalsa.ligada = true;
  const id = criado.pedido.id;

  const r = await req('POST', `/api/pedidos/${id}/cancelar`);
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.dados.pedido.status, 'cancelado');
  assert.ok(r.dados.pedido.canceladoEm);
  assert.strictEqual(r.dados.jaFoiImpresso, false);
  assert.strictEqual(r.dados.pedido.itens.length, 1, 'itens preservados no histórico');

  const nao = await req('GET', '/api/pedidos?status=nao_impresso');
  assert.ok(!nao.dados.pedidos.some((p) => p.id === id), 'cancelado não aparece como "a reimprimir"');
  const cancelados = await req('GET', '/api/pedidos?status=cancelado');
  assert.ok(cancelados.dados.pedidos.some((p) => p.id === id));
  assert.ok(cancelados.dados.pedidos.every((p) => p.status === 'cancelado'));

  const reimp = await req('POST', `/api/pedidos/${id}/imprimir`);
  assert.strictEqual(reimp.status, 400);
  assert.match(reimp.dados.erro, /cancelado e não pode ser reimpresso/);
});

test('cancelar pedido já impresso avisa para avisar a cozinha', async () => {
  const { dados: criado } = await req('POST', '/api/pedidos', { itens: [{ itemId: 2 }] });
  assert.strictEqual(criado.pedido.status, 'impresso');
  const r = await req('POST', `/api/pedidos/${criado.pedido.id}/cancelar`);
  assert.strictEqual(r.dados.jaFoiImpresso, true);
  assert.match(r.dados.mensagem, /avise a cozinha/);
});

test('cancelar duas vezes ou pedido inexistente é recusado com motivo', async () => {
  const { dados: criado } = await req('POST', '/api/pedidos', { itens: [{ itemId: 3 }] });
  await req('POST', `/api/pedidos/${criado.pedido.id}/cancelar`);
  const de_novo = await req('POST', `/api/pedidos/${criado.pedido.id}/cancelar`);
  assert.strictEqual(de_novo.status, 400);
  assert.match(de_novo.dados.erro, /já está cancelado/);
  const inexistente = await req('POST', '/api/pedidos/99999/cancelar');
  assert.strictEqual(inexistente.status, 404);
  const invalido = await req('POST', '/api/pedidos/abc/cancelar');
  assert.strictEqual(invalido.status, 400);
});

test('falha do banco ao cancelar: pedido continua ativo e a tela recebe erro', async () => {
  const { dados: criado } = await req('POST', '/api/pedidos', { itens: [{ itemId: 4 }] });
  const id = criado.pedido.id;
  db.exec(`CREATE TRIGGER falha_cancelar BEFORE UPDATE OF cancelado_em ON pedidos
           BEGIN SELECT RAISE(ABORT, 'banco travado simulado'); END;`);
  try {
    const r = await req('POST', `/api/pedidos/${id}/cancelar`);
    assert.strictEqual(r.status, 500);
    assert.match(r.dados.erro, /continua ativo/);
  } finally {
    db.exec('DROP TRIGGER falha_cancelar');
  }
  const { dados } = await req('GET', '/api/pedidos?status=impresso');
  assert.ok(dados.pedidos.some((p) => p.id === id), 'continua ativo');
});

test('filtro de status inválido é recusado', async () => {
  const r = await req('GET', '/api/pedidos?status=qualquer');
  assert.strictEqual(r.status, 400);
});
