// Usado quando a impressora não responde: desligada, sem papel, fora da rede...
class ErroImpressora extends Error {
  constructor(mensagem, causa) {
    super(mensagem);
    this.name = 'ErroImpressora';
    this.cause = causa;
  }
}

module.exports = { ErroImpressora };
