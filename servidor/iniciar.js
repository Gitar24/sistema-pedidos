// Este é o arquivo que o "npm start" executa. Ele abre o banco, prepara a
// impressora e liga o servidor na rede local.
const fs = require('node:fs');
const config = require('./configuracoes');

if (config.demonstracao) {
  process.on('exit', () => {
    fs.rmSync(config.pastaDaDemonstracao, { recursive: true, force: true });
  });
  process.once('SIGINT', () => process.exit(130));
  process.once('SIGTERM', () => process.exit(143));
}

const { abrirBanco } = require('./banco-de-dados/conexao');
const { criarImpressora } = require('./impressao/impressora');
const { criarApp } = require('./aplicacao');
const { registrarErro } = require('./registro-de-erros');
const { enderecosNaRede } = require('./rede-local');

process.on('uncaughtException', (erro) => {
  registrarErro('Exceção não tratada (servidor será encerrado)', erro);
  process.exit(1);
});
process.on('unhandledRejection', (motivo) => {
  registrarErro('Promise rejeitada sem tratamento', motivo);
});

const db = abrirBanco(config.arquivoDoBanco);
const impressora = criarImpressora(config.impressora);
const app = criarApp({ db, impressora, demonstracao: config.demonstracao });

const socketDoSystemd = process.platform === 'linux' && !config.demonstracao
  && Number(process.env.LISTEN_PID) === process.pid && process.env.LISTEN_FDS === '1';
const enderecoDeEscuta = socketDoSystemd ? { fd: 3 } : { port: config.porta, host: '0.0.0.0' };
const servidor = app.listen(enderecoDeEscuta, (erro) => {
  if (erro) {
    const portaOcupada = erro.code === 'EADDRINUSE';
    registrarErro(portaOcupada
      ? `A porta ${config.porta} está ocupada por outro programa.`
      : `Não foi possível iniciar o servidor na porta ${config.porta}`, erro);
    process.exit(portaOcupada ? 98 : 1);
  }
  console.log(config.demonstracao
    ? 'Demonstração de comandas com dados de exemplo e impressão simulada.'
    : `Servidor de pedidos rodando na porta ${config.porta}. Impressora: ${config.impressora.modo}.`);
  console.log(`Neste computador: http://localhost:${config.porta}`);
  console.log('Acesse pelo celular, no Wi-Fi do estabelecimento, em:');
  for (const ip of enderecosNaRede()) console.log(`  http://${ip}:${config.porta}`);
});

function encerrarServidor() {
  servidor.close(() => {
    db.close();
    process.exit(0);
  });
}

if (!config.demonstracao) {
  process.once('SIGTERM', encerrarServidor);
  process.once('SIGINT', encerrarServidor);
}
if (process.argv.includes('--servico-windows')) {
  process.stdin.once('end', encerrarServidor);
  process.stdin.resume();
}
