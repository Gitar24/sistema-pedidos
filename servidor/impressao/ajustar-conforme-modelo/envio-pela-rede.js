// Envio pela rede. O que vale aqui depende de como a impressora está ligada.
//
// Abre uma conexão TCP "crua" (RAW, quase sempre na porta 9100) e manda o papel.
// Serve para dois casos:
//   - impressora com Wi-Fi ou placa de rede (a 9100 é a porta padrão de quase todas);
//   - impressora USB ligada a um notebook que roda notebook-da-impressora/agente.js.
// Se a sua impressora estiver ligada de outro jeito (um cabo serial no servidor,
// por exemplo), crie outro arquivo nesta pasta com a mesma função enviar() e
// registre ele em ../impressora.js.
//
// Como a gente descobre que a impressora está desligada:
//   - notebook ou impressora desligados, ou fora da rede: a conexão é recusada
//     ou demora demais;
//   - agente no ar mas impressora USB desligada: o agente derruba a conexão.
const net = require('net');
const { ErroImpressora } = require('../erro-de-impressao');

// Depois de enviar, esperamos um pouquinho para ver se aparece algum erro antes de
// dar o pedido como impresso. Muita impressora de rede nunca fecha a conexão, então
// não dá para esperar por esse fechamento.
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
