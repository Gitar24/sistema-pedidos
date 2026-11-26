// Configurações do sistema. Qualquer valor daqui pode ser trocado por uma variável
// de ambiente na hora de iniciar, sem editar o código. Por exemplo:
//   PORTA=8080 npm start
const path = require('path');
const fs = require('node:fs');
const os = require('node:os');

const pastaDoProjeto = path.resolve(__dirname, '..');
const demonstracao = process.argv.includes('--demo');
const pastaDaDemonstracao = demonstracao
  ? fs.mkdtempSync(path.join(os.tmpdir(), 'comandas-demo-'))
  : null;

module.exports = {
  demonstracao,
  pastaDaDemonstracao,
  // Porta em que os celulares abrem a página
  porta: Number(process.env.PORTA) || (demonstracao ? 3001 : 3000),

  // Onde ficam o banco de dados e o registro de erros
  arquivoDoBanco: demonstracao ? ':memory:' : process.env.ARQUIVO_BANCO || path.join(pastaDoProjeto, 'dados', 'pedidos.db'),
  arquivoDeErros: demonstracao
    ? path.join(pastaDaDemonstracao, 'erros.log')
    : process.env.ARQUIVO_LOG || path.join(pastaDoProjeto, 'registros', 'erros.log'),

  impressora: {
    // "simulada": em vez de imprimir, salva o papelzinho num arquivo (para testar sem impressora)
    // "rede":     manda para a impressora pela rede (uma impressora Wi-Fi ou um notebook com o agente)
    modo: demonstracao ? 'simulada' : process.env.IMPRESSORA_MODO || 'simulada',

    // Só valem no modo "rede"
    endereco: process.env.IMPRESSORA_ENDERECO || '192.168.0.50',
    porta: Number(process.env.IMPRESSORA_PORTA) || 9100,
    tempoLimiteMs: Number(process.env.IMPRESSORA_TEMPO_LIMITE_MS) || 4000,

    // Só valem no modo "simulada"
    pastaDasSimulacoes: demonstracao
      ? path.join(pastaDaDemonstracao, 'impressoes')
      : process.env.IMPRESSORA_PASTA_SIMULACAO || path.join(pastaDoProjeto, 'impressoes-simuladas'),
    simularFalha: !demonstracao && process.env.IMPRESSORA_SIMULAR_FALHA === '1',
  },
};
