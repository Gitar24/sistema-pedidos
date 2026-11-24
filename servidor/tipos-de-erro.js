// Erros que a gente já espera que aconteçam. Cada um vira uma resposta HTTP com
// uma mensagem que explica o que houve.

class ErroValidacao extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ErroValidacao';
    this.status = 400;
  }
}

class ErroNaoEncontrado extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ErroNaoEncontrado';
    this.status = 404;
  }
}

class ErroBanco extends Error {
  constructor(mensagem, causa) {
    super(mensagem);
    this.name = 'ErroBanco';
    this.status = 500;
    this.cause = causa;
  }
}

module.exports = { ErroValidacao, ErroNaoEncontrado, ErroBanco };
