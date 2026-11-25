const { test } = require('node:test');
const assert = require('node:assert');
const net = require('net');
const { montarPapelDoPedido } = require('../servidor/impressao/montar-papel');
const { PERFIL_DA_IMPRESSORA } = require('../servidor/impressao/ajustar-conforme-modelo/perfil-da-impressora');
const { previaLegivel } = require('../servidor/impressao/ajustar-conforme-modelo/envio-simulado');
const { criarImpressora, ErroImpressora } = require('../servidor/impressao/impressora');

const pedido = {
  id: 7,
  mesa: '4',
  criadoEm: '2026-11-24 12:30:00',
  totalCentavos: 2900,
  itens: [
    { nome: 'Pão de queijo', precoCentavos: 650, quantidade: 2 },
    { nome: 'Café expresso', precoCentavos: 800, quantidade: 2 },
  ],
};

test('papelzinho tem comandos ESC/POS e texto correto', () => {
  const bytes = montarPapelDoPedido(pedido, PERFIL_DA_IMPRESSORA);
  assert.deepStrictEqual([...bytes.subarray(0, 2)], [0x1b, 0x40], 'começa com ESC @');
  assert.deepStrictEqual([...bytes.subarray(-4)], [0x1d, 0x56, 0x42, 0x00], 'termina com corte');
  assert.ok(bytes.includes(Buffer.from([0x50, 0x84, 0x6f])), '"Pão" codificado em PC860');
  const texto = previaLegivel(bytes);
  assert.match(texto, /PEDIDO #7/);
  assert.match(texto, /^2x Pão de queijo$/m);
  for (const linha of texto.split('\n')) assert.ok(linha.length <= PERFIL_DA_IMPRESSORA.colunas);
});

test('comanda destaca a mesa em letra grande, no topo, e não traz preços', () => {
  const bytes = montarPapelDoPedido(pedido, PERFIL_DA_IMPRESSORA);
  const grande = Buffer.concat([Buffer.from([0x1d, 0x21, 0x11]), Buffer.from('MESA 4\n')]);
  assert.ok(bytes.includes(grande), 'MESA 4 em tamanho duplo');
  const texto = previaLegivel(bytes);
  assert.ok(texto.indexOf('MESA 4') < texto.indexOf('Pão de queijo'));
  assert.doesNotMatch(texto, /R\$|TOTAL/);
});

test('pedido antigo, sem mesa, é impresso como SEM MESA', () => {
  const texto = previaLegivel(montarPapelDoPedido({ ...pedido, mesa: '' }, PERFIL_DA_IMPRESSORA));
  assert.match(texto, /SEM MESA/);
});

test('reimpressão é avisada antes dos itens', () => {
  const texto = previaLegivel(montarPapelDoPedido({ ...pedido, reimpressao: true }, PERFIL_DA_IMPRESSORA));
  assert.ok(texto.indexOf('REIMPRESSAO') > -1 && texto.indexOf('REIMPRESSAO') < texto.indexOf('Pão de queijo'));
});

test('nome de item longo continua na linha seguinte, sem ser cortado', () => {
  const nome = 'Prato feito com arroz feijao bife acebolado e fritas';
  const texto = previaLegivel(montarPapelDoPedido({ ...pedido, itens: [{ nome, quantidade: 10, observacao: '' }] }, PERFIL_DA_IMPRESSORA));
  assert.match(texto.replace(/\n +/g, ' '), new RegExp(`10x ${nome}`));
  for (const l of texto.split('\n')) assert.ok(l.length <= PERFIL_DA_IMPRESSORA.colunas, `linha larga: ${l}`);
});

function configRede(porta) {
  return { modo: 'rede', endereco: '127.0.0.1', porta, tempoLimiteMs: 1500 };
}

function servidorTcp(aoConectar) {
  return new Promise((ok) => {
    const s = net.createServer(aoConectar);
    s.listen(0, '127.0.0.1', () => ok(s));
  });
}

test('rede: impressora ligada recebe os bytes', async () => {
  let recebido = Buffer.alloc(0);
  const s = await servidorTcp((c) => {
    c.on('data', (d) => { recebido = Buffer.concat([recebido, d]); });
    c.on('end', () => c.end());
  });
  await criarImpressora(configRede(s.address().port)).imprimirPedido(pedido);
  s.close();
  assert.ok(recebido.length > 0);
  assert.deepStrictEqual([...recebido.subarray(0, 2)], [0x1b, 0x40]);
});

test('rede: impressora desligada (conexão recusada) gera ErroImpressora', async () => {
  const s = await servidorTcp(() => {});
  const porta = s.address().port;
  await new Promise((ok) => s.close(ok));
  await assert.rejects(criarImpressora(configRede(porta)).imprimirPedido(pedido), ErroImpressora);
});

test('rede: agente sem impressora USB (derruba conexão) gera ErroImpressora', async () => {
  const s = await servidorTcp((c) => c.resetAndDestroy());
  await assert.rejects(criarImpressora(configRede(s.address().port)).imprimirPedido(pedido), ErroImpressora);
  s.close();
});

test('observação sai logo abaixo do item, com recuo, em negrito e quebrando linha longa', () => {
  const { quebrarTexto } = require('../servidor/impressao/montar-papel');
  const comObs = {
    ...pedido,
    itens: [{ nome: 'X-Salada', precoCentavos: 2200, quantidade: 1,
              observacao: 'sem verduras, sem tomate, maionese a parte e pao bem tostado por favor' }],
    totalCentavos: 2200,
  };
  const bytes = montarPapelDoPedido(comObs, PERFIL_DA_IMPRESSORA);
  const linhas = previaLegivel(bytes).split('\n');
  const posicaoItem = linhas.findIndex((l) => l.startsWith('1x X-Salada'));
  assert.match(linhas[posicaoItem + 1], /^  > sem verduras/);
  assert.match(linhas[posicaoItem + 2], /^  > /, 'observação longa continua na linha seguinte');
  for (const l of linhas) assert.ok(l.length <= PERFIL_DA_IMPRESSORA.colunas, `linha larga: ${l}`);
  assert.ok(bytes.includes(Buffer.from([0x1b, 0x45, 0x01, 0x20, 0x20, 0x3e])), 'negrito ligado antes da observação');
  assert.deepStrictEqual(quebrarTexto('a'.repeat(10), 4), ['aaaa', 'aaaa', 'aa'], 'palavra maior que a linha é partida');
});

test('item sem observação não ganha linha extra', () => {
  const linhas = previaLegivel(montarPapelDoPedido(pedido, PERFIL_DA_IMPRESSORA)).split('\n');
  assert.ok(!linhas.some((l) => l.includes('>')));
});
