// =============================================================================
// ⚠ TEMPORÁRIO — PRÉVIA DA NOTA NO NAVEGADOR (enquanto não há impressora)
//
// Lê os MESMOS bytes ESC/POS que iriam para a impressora e desenha o recibo em HTML,
// respeitando alinhamento, negrito e tamanho dobrado. É uma aproximação: a fonte e
// o espaçamento reais dependem do modelo da impressora.
//
// COMO REMOVER (quando tiver a impressora): apague estes 5 itens e nada mais quebra.
//   1. servidor/impressao/previa-temporaria.js        (este arquivo)
//   2. servidor/rotas/previa-temporaria.js
//   3. as 2 linhas marcadas "TEMPORÁRIO" em servidor/aplicacao.js
//   4. pagina-web/js/ver-nota-temporario.js  e a <script> dele em pagina-web/index.html
//   5. testes/previa-temporaria.test.js
// =============================================================================
const { PC860 } = require('./ajustar-conforme-modelo/perfil-da-impressora');

// Tabela inversa: byte PC860 -> letra (para mostrar os acentos).
const PC860_PARA_LETRA = Object.fromEntries(Object.entries(PC860).map(([letra, byte]) => [byte, letra]));

function escaparHtml(texto) {
  return texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Interpreta os bytes e devolve a lista de linhas do papel.
function interpretarBytes(bytes) {
  const linhas = [];
  let estado = { alinhamento: 'left', negrito: false, largura: 1, altura: 1 };
  let pedacos = []; // trechos da linha atual: { texto, negrito, largura, altura }

  const fecharLinha = () => {
    linhas.push({ tipo: 'texto', alinhamento: estado.alinhamento, pedacos });
    pedacos = [];
  };
  const acrescentar = (letra) => {
    const ultimo = pedacos[pedacos.length - 1];
    if (ultimo && ultimo.negrito === estado.negrito && ultimo.largura === estado.largura && ultimo.altura === estado.altura) {
      ultimo.texto += letra;
    } else {
      pedacos.push({ texto: letra, negrito: estado.negrito, largura: estado.largura, altura: estado.altura });
    }
  };

  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b === 0x1b) {                       // comandos ESC
      const comando = bytes[i + 1];
      const valor = bytes[i + 2];
      if (comando === 0x40) { estado = { alinhamento: 'left', negrito: false, largura: 1, altura: 1 }; i += 1; }
      else if (comando === 0x61) { estado.alinhamento = ['left', 'center', 'right'][valor] || 'left'; i += 2; }
      else if (comando === 0x45) { estado.negrito = valor === 1; i += 2; }
      else if (comando === 0x64) { for (let n = 0; n < valor; n++) linhas.push({ tipo: 'texto', alinhamento: 'left', pedacos: [] }); i += 2; }
      else i += 2;                          // ESC t n e outros: sem efeito visual
    } else if (b === 0x1d) {                // comandos GS
      const comando = bytes[i + 1];
      if (comando === 0x21) { const v = bytes[i + 2]; estado.largura = (v >> 4) + 1; estado.altura = (v & 15) + 1; i += 2; }
      else if (comando === 0x56) { if (pedacos.length) fecharLinha(); linhas.push({ tipo: 'corte' }); i += bytes[i + 2] >= 65 ? 3 : 2; }
      else i += 2;
    } else if (b === 0x0a) fecharLinha();
    else if (b >= 0x20 && b <= 0x7e) acrescentar(String.fromCharCode(b));
    else acrescentar(PC860_PARA_LETRA[b] || '?');
  }
  if (pedacos.length) fecharLinha();
  return linhas;
}

function gerarPaginaDaNota(bytes, { numeroDoPedido, colunas }) {
  const html = interpretarBytes(bytes).map((linha) => {
    if (linha.tipo === 'corte') return '<div class="corte">✂ - - - - - - - - - corte - - - - - - - - - ✂</div>';
    if (linha.pedacos.length === 0) return '<div class="linha">&nbsp;</div>';
    const alturaMaxima = Math.max(...linha.pedacos.map((p) => p.altura));
    const trechos = linha.pedacos.map((p) => {
      const estilo = `${p.negrito ? 'font-weight:bold;' : ''}${p.largura > 1 ? `font-size:${p.largura}em;` : ''}`;
      return `<span style="${estilo}">${escaparHtml(p.texto).replace(/ /g, '&nbsp;')}</span>`;
    }).join('');
    return `<div class="linha" style="text-align:${linha.alinhamento};${alturaMaxima > 1 ? `line-height:${alturaMaxima * 1.3}em;` : ''}">${trechos}</div>`;
  }).join('\n');

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nota do pedido #${numeroDoPedido}</title>
<style>
  body { background: #d8d8d8; font-family: system-ui, sans-serif; margin: 0; padding: 1rem; }
  .aviso { max-width: 60ch; margin: 0 auto 1rem; background: #fff1c9; color: #6b4e00; padding: .6rem .8rem; border-radius: 4px; font-size: .85rem; }
  .papel { width: ${colunas}ch; max-width: 100%; margin: 0 auto; background: #fff; padding: 1rem 0.8ch; box-shadow: 0 2px 8px #0005;
           font-family: "DejaVu Sans Mono", Consolas, "Courier New", monospace; font-size: 15px; line-height: 1.3; overflow-x: auto; }
  .linha { white-space: pre; }
  .corte { margin: .6rem 0 0; text-align: center; color: #999; font-size: .75em; white-space: nowrap; }
</style></head><body>
<div class="aviso">PRÉVIA TEMPORÁRIA: aproximação do papel de ${colunas} colunas. A fonte e o espaçamento reais dependem do modelo da impressora.</div>
<div class="papel">
${html}
</div></body></html>`;
}

module.exports = { gerarPaginaDaNota, interpretarBytes };
