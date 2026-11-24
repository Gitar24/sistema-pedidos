// Comandos ESC/POS padrão, os mesmos da documentação da Epson. Funcionam na
// grande maioria das impressoras térmicas. O que muda de um modelo para outro
// fica em perfil-da-impressora.js, não aqui.

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

// Vai juntando comandos e textos, na ordem, até formar o Buffer que a impressora lê.
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

  // Escreve um texto colado à esquerda e outro colado à direita na mesma linha,
  // por exemplo "2x Coxinha      R$ 16,00". Se o da esquerda não couber, é cortado.
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
