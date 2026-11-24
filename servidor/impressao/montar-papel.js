// Desenha o papelzinho do pedido. Só usa comandos ESC/POS padrão e o que o perfil
// da impressora declara, então este arquivo não muda de um modelo para outro.
const { comandos, PapelEscPos } = require('./comandos-escpos');

function formatarReais(centavos) {
  return 'R$ ' + (centavos / 100).toFixed(2).replace('.', ',');
}

const RECUO = '  > ';

// Divide o texto em linhas que cabem na largura do papel, sem partir palavra
// ao meio (a não ser que a palavra sozinha seja maior que a linha).
function quebrarTexto(texto, largura) {
  const linhas = [];
  let atual = '';
  for (const palavra of texto.split(' ')) {
    const pedacos = palavra.match(new RegExp(`.{1,${largura}}`, 'g')) || [''];  // palavra maior que a linha inteira
    for (const pedaco of pedacos) {
      if (atual && (atual + ' ' + pedaco).length > largura) { linhas.push(atual); atual = pedaco; }
      else atual = atual ? atual + ' ' + pedaco : pedaco;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

function montarPapelDoPedido(pedido, perfil) {
  const doc = new PapelEscPos(perfil);

  doc.cmd(comandos.inicializar).cmd(perfil.comandoTabelaCaracteres);

  doc.cmd(comandos.alinharCentro)
    .cmd(comandos.negritoLiga).cmd(comandos.tamanhoDuplo)
    .linha(`PEDIDO #${pedido.id}`)
    .cmd(comandos.tamanhoNormal).cmd(comandos.negritoDesliga)
    .linha(pedido.criadoEm)
    .cmd(comandos.alinharEsquerda)
    .separador();

  for (const item of pedido.itens) {
    doc.colunas(`${item.quantidade}x ${item.nome}`, formatarReais(item.precoCentavos * item.quantidade));
    if (item.observacao) {
      // A observação vai logo abaixo do item, em negrito e com recuo, para a cozinha
      // não deixar passar.
      doc.cmd(comandos.negritoLiga);
      for (const linha of quebrarTexto(item.observacao, perfil.colunas - RECUO.length)) doc.linha(RECUO + linha);
      doc.cmd(comandos.negritoDesliga);
    }
  }

  doc.separador()
    .cmd(comandos.negritoLiga)
    .colunas('TOTAL', formatarReais(pedido.totalCentavos))
    .cmd(comandos.negritoDesliga);

  if (pedido.reimpressao) {
    doc.cmd(comandos.alinharCentro).linha('*** REIMPRESSAO ***').cmd(comandos.alinharEsquerda);
  }

  doc.cmd(comandos.avancarLinhas(perfil.linhasAntesDoCorte)).cmd(perfil.comandoCorte);

  return doc.paraBuffer();
}

module.exports = { montarPapelDoPedido, formatarReais, quebrarTexto };
