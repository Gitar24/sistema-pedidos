// Comandos ESC/POS padrão (documentação Epson). Funcionam na grande maioria das
// impressoras térmicas compatíveis. O que costuma variar entre modelos fica em
// perfil-impressora.js, e não aqui.

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const comandos = {
  inicializar: [ESC, 0x40],                         // ESC @
  alinharEsquerda: [ESC, 0x61, 0],                  // ESC a 0
  alinharCentro: [ESC, 0x61, 1],                    // ESC a 1
  negritoLiga: [ESC, 0x45, 1],                      // ESC E 1
  negritoDesliga: [ESC, 0x45, 0],                   // ESC E 0
  tamanhoDuplo: [GS, 0x21, 0x11],                   // GS ! (largura e altura x2)
  tamanhoNormal: [GS, 0x21, 0x00],                  // GS ! 0
  avancarLinhas: (n) => [ESC, 0x64, n],             // ESC d n
};

// Monta um Buffer a partir de uma sequência de comandos e textos.
class PapelEscPos {
  constructor(perfil) {
    this.perfil = perfil;
    this.partes = [];
  }

  cmd(bytes) {
    this.partes.push(Buffer.from(bytes));
    return this;
  }

  texto(str) {
    this.partes.push(this.perfil.codificarTexto(str));
    return this;
  }

  linha(str = '') {
    this.texto(str);
    this.partes.push(Buffer.from([LF]));
    return this;
  }

  separador(caractere = '-') {
    return this.linha(caractere.repeat(this.perfil.colunas));
  }

  // Texto à esquerda e à direita na mesma linha (ex.: "2x Coxinha      R$ 16,00")
  colunas(esquerda, direita, largura = this.perfil.colunas) {
    const espaco = largura - direita.length - 1;
    const esq = esquerda.length > espaco ? esquerda.slice(0, espaco) : esquerda;
    return this.linha(esq + ' '.repeat(largura - esq.length - direita.length) + direita);
  }

  paraBuffer() {
    return Buffer.concat(this.partes);
  }
}

module.exports = { comandos, PapelEscPos };
