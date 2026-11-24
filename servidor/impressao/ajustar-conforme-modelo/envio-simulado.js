// Envio simulado, para o protótipo funcionar sem impressora de verdade.
// Em vez de imprimir, salva dois arquivos na pasta impressoes-simuladas/:
//   pedido-N-....bin   os bytes ESC/POS exatos que iriam para a impressora
//   pedido-N-....txt   uma prévia em texto do papelzinho, para ler
const fs = require('fs/promises');
const path = require('path');
const { ErroImpressora } = require('../erro-de-impressao');

// As letras acentuadas da tabela PC860, para a prévia em texto mostrar os acentos.
const PC860_PARA_TEXTO = {
  0x80: 'Ç', 0x82: 'é', 0x83: 'â', 0x84: 'ã', 0x85: 'à', 0x87: 'ç', 0x88: 'ê',
  0x8e: 'Ã', 0x90: 'É', 0x93: 'ô', 0x94: 'õ', 0xa0: 'á', 0xa1: 'í', 0xa2: 'ó', 0xa3: 'ú',
};

// Transforma os bytes ESC/POS em texto que dá para ler, pulando os comandos.
function previaLegivel(bytes) {
  let texto = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b === 0x1b) { // comando ESC
      i += bytes[i + 1] === 0x40 ? 1 : 2;
    } else if (b === 0x1d) { // comando GS
      i += bytes[i + 1] === 0x56 && bytes[i + 2] >= 65 ? 3 : 2;
    } else if (b === 0x0a) texto += '\n';
    else if (b >= 0x20 && b <= 0x7e) texto += String.fromCharCode(b);
    else texto += PC860_PARA_TEXTO[b] || '?';
  }
  return texto;
}

async function enviar(papel, config, pedido) {
  if (config.simularFalha) {
    throw new ErroImpressora('Não foi possível imprimir: a impressora parece desligada ou desconectada (falha simulada).');
  }
  await fs.mkdir(config.pastaDasSimulacoes, { recursive: true });
  const nomeBase = path.join(config.pastaDasSimulacoes, `pedido-${pedido.id}-${Date.now()}`);
  await fs.writeFile(nomeBase + '.bin', papel);
  await fs.writeFile(nomeBase + '.txt', previaLegivel(papel));
}

module.exports = { enviar, previaLegivel };
