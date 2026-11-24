// #############################################################################
// ###  ENVIO PELA REDE — depende de como a impressora está ligada            ###
// #############################################################################
// Abre uma conexão TCP "crua" (RAW, normalmente na porta 9100) e envia o papel.
// Serve para:
//   - impressora com Wi-Fi/placa de rede (a porta 9100 é o padrão de quase todas);
//   - impressora USB ligada a um notebook que roda notebook-da-impressora/agente.js.
// Se a impressora for ligada de outro jeito (ex.: cabo serial no servidor),
// crie outro arquivo nesta pasta com a mesma função enviar() e registre em ../impressora.js.
//
// Como percebemos que a impressora está desligada:
//   - notebook/impressora desligados ou fora da rede -> conexão recusada ou demora demais;
//   - agente ligado mas impressora USB desligada -> o agente derruba a conexão.
const net = require('net');
const { ErroImpressora } = require('../erro-de-impressao');

// Depois de enviar, espera um pouco por um eventual erro antes de considerar impresso.
// Muitas impressoras de rede não fecham a conexão, então não dá para esperar o fechamento.
const ESPERA_POR_ERRO_MS = 800;

function enviar(papel, config) {
  return new Promise((resolve, reject) => {
    const conexao = net.createConnection({ host: config.endereco, port: config.porta });
    let terminou = false;
    let espera;

    const finalizar = (erro) => {
      if (terminou) return;
      terminou = true;
      clearTimeout(espera);
      conexao.destroy();
      if (!erro) return resolve();
      reject(new ErroImpressora(
        `Não foi possível imprimir: a impressora (${config.endereco}:${config.porta}) parece desligada ou desconectada.`,
        erro,
      ));
    };

    conexao.setTimeout(config.tempoLimiteMs, () => finalizar(new Error('Tempo esgotado')));
    conexao.on('error', finalizar);
    conexao.on('close', () => finalizar());
    conexao.on('connect', () => {
      conexao.end(papel, () => {
        espera = setTimeout(() => finalizar(), ESPERA_POR_ERRO_MS);
      });
    });
  });
}

module.exports = { enviar };
