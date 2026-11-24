// =============================================================================
// PONTO DE PARTIDA — é este arquivo que roda com "npm start".
// Abre o banco, prepara a impressora e liga o servidor na rede local.
// =============================================================================
const os = require('os');
const config = require('./configuracoes');
const { abrirBanco } = require('./banco-de-dados/conexao');
const { criarImpressora } = require('./impressao/impressora');
const { criarApp } = require('./aplicacao');
const { registrarErro } = require('./registro-de-erros');

process.on('uncaughtException', (erro) => {
  registrarErro('Exceção não tratada (servidor será encerrado)', erro);
  process.exit(1);
});
process.on('unhandledRejection', (motivo) => {
  registrarErro('Promise rejeitada sem tratamento', motivo);
});

function enderecosNaRede() {
  return Object.values(os.networkInterfaces()).flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

const db = abrirBanco(config.arquivoDoBanco);
const impressora = criarImpressora(config.impressora);
const app = criarApp({ db, impressora });

app.listen(config.porta, '0.0.0.0', () => {
  console.log(`Servidor de pedidos rodando na porta ${config.porta}`);
  console.log(`Impressora: modo "${config.impressora.modo}"`);
  console.log('Acesse pelos notebooks da rede em:');
  for (const ip of enderecosNaRede()) console.log(`  http://${ip}:${config.porta}`);
  console.log(`  (neste computador: http://localhost:${config.porta})`);
});
