// Atenção: este arquivo depende do modelo da impressora. Quando o modelo for
// confirmado, confira estes valores no manual ESC/POS dele.
//
// Por enquanto usamos o padrão da Epson TM-T20, que as genéricas de 80 mm costumam seguir.
//
// O que muda de um modelo para outro:
//   1. colunas: quantos caracteres cabem numa linha.
//        Papel de 80 mm costuma ter 48 (fonte A); o de 58 mm costuma ter 32.
//   2. tabela de caracteres (os acentos): o número da tabela no comando ESC t n
//        muda de fabricante para fabricante. Na Epson, PC860 (português) é a 3.
//        Se a sua genérica não tiver PC860, use modoAcentos = 'remover'.
//   3. comando de corte: algumas não têm guilhotina e outras usam outro comando.
//   4. linhas de avanço antes do corte: depende da distância entre a cabeça de
//        impressão e a lâmina.

const ESC = 0x1b;
const GS = 0x1d;

const modoAcentos = 'pc860'; // 'pc860' | 'remover'

// De cada letra acentuada para o byte dela na tabela PC860 (português).
const PC860 = {
  'Ç': 0x80, 'ü': 0x81, 'é': 0x82, 'â': 0x83, 'ã': 0x84, 'à': 0x85, 'Á': 0x86, 'ç': 0x87,
  'ê': 0x88, 'Ê': 0x89, 'è': 0x8a, 'Í': 0x8b, 'Ô': 0x8c, 'ì': 0x8d, 'Ã': 0x8e, 'Â': 0x8f,
  'É': 0x90, 'À': 0x91, 'È': 0x92, 'ô': 0x93, 'õ': 0x94, 'ò': 0x95, 'Ú': 0x96, 'ù': 0x97,
  'Ì': 0x98, 'Õ': 0x99, 'Ü': 0x9a, 'Ó': 0x9f, 'á': 0xa0, 'í': 0xa1, 'ó': 0xa2, 'ú': 0xa3,
  'ñ': 0xa4, 'Ñ': 0xa5, 'ª': 0xa6, 'º': 0xa7,
};

function removerAcento(ch) {
  const semAcento = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return /^[\x20-\x7e]$/.test(semAcento) ? semAcento : '?';
}

function codificarTexto(str) {
  const bytes = [];
  for (const ch of str) {
    const codigo = ch.codePointAt(0);
    if (codigo >= 0x20 && codigo <= 0x7e) bytes.push(codigo);
    else if (modoAcentos === 'pc860' && PC860[ch] !== undefined) bytes.push(PC860[ch]);
    else bytes.push(removerAcento(ch).charCodeAt(0));
  }
  return Buffer.from(bytes);
}

const PERFIL_DA_IMPRESSORA = {
  colunas: 48,
  comandoTabelaCaracteres: modoAcentos === 'pc860' ? [ESC, 0x74, 3] : [], // ESC t 3 (Epson: PC860)
  codificarTexto,
  linhasAntesDoCorte: 4,
  comandoCorte: [GS, 0x56, 0x42, 0x00], // GS V 66 0: corte parcial, com avanço do papel. Sem guilhotina, deixe []
};

module.exports = { PERFIL_DA_IMPRESSORA, PC860 };
