// TEMPORÁRIO — apague junto com a prévia da nota.
const { test } = require('node:test');
const assert = require('node:assert');
const { montarPapelDoPedido } = require('../servidor/impressao/montar-papel');
const { PERFIL_DA_IMPRESSORA } = require('../servidor/impressao/ajustar-conforme-modelo/perfil-da-impressora');
const { gerarPaginaDaNota } = require('../servidor/impressao/previa-temporaria');

const pedido = { id: 9, criadoEm: '2026-11-24 12:00:00', totalCentavos: 2200, itens: [
  { nome: 'Pão <b>', precoCentavos: 2200, quantidade: 1, observacao: 'sem verduras' }] };

test('prévia mostra título grande e centralizado, observação em negrito, acentos e corte', () => {
  const html = gerarPaginaDaNota(montarPapelDoPedido(pedido, PERFIL_DA_IMPRESSORA), { numeroDoPedido: 9, colunas: 48 });
  assert.match(html, /text-align:center;[^>]*>.*font-weight:bold;font-size:2em;[^>]*>PEDIDO&nbsp;#9/s);
  assert.match(html, /font-weight:bold;[^>]*>&nbsp;&nbsp;&gt;&nbsp;sem&nbsp;verduras/);
  assert.match(html, /Pão&nbsp;&lt;b&gt;/, 'acento correto e HTML do usuário escapado');
  assert.match(html, /class="corte"/);
  assert.match(html, /PRÉVIA TEMPORÁRIA/);
});

test('rota /previa-nota/:id devolve HTML do pedido e 404 se não existir', async () => {
  const { abrirBanco } = require('../servidor/banco-de-dados/conexao');
  const { criarApp } = require('../servidor/aplicacao');
  const db = abrirBanco(':memory:');
  const servidor = await new Promise((ok) => { const s = criarApp({ db, impressora: {} }).listen(0, () => ok(s)); });
  const base = `http://127.0.0.1:${servidor.address().port}`;
  try {
    db.exec("INSERT INTO pedidos (total_centavos) VALUES (800); INSERT INTO itens_pedido (pedido_id, item_id, nome, preco_centavos, quantidade, observacao) VALUES (1, 1, 'Coxinha', 800, 1, 'bem quente');");
    const ok = await fetch(base + '/previa-nota/1');
    assert.strictEqual(ok.status, 200);
    assert.match(ok.headers.get('content-type'), /html/);
    assert.match(await ok.text(), /bem&nbsp;quente/);
    assert.strictEqual((await fetch(base + '/previa-nota/999')).status, 404);
    assert.strictEqual((await fetch(base + '/previa-nota/abc')).status, 404);
  } finally {
    servidor.close();
  }
});
