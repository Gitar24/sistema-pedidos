// =============================================================================
// CONFIGURAÇÕES DO SISTEMA
// Todos os valores podem ser trocados por variáveis de ambiente ao iniciar,
// sem mexer no código. Ex.: PORTA=8080 npm start
// =============================================================================
const path = require('path');

const pastaDoProjeto = path.resolve(__dirname, '..');

module.exports = {
  // Porta da página que os notebooks acessam
  porta: Number(process.env.PORTA) || 3000,

  // Onde ficam o banco de dados e o registro de erros
  arquivoDoBanco: process.env.ARQUIVO_BANCO || path.join(pastaDoProjeto, 'dados', 'pedidos.db'),
  arquivoDeErros: process.env.ARQUIVO_LOG || path.join(pastaDoProjeto, 'registros', 'erros.log'),

  impressora: {
    // "simulada": grava o papelzinho em arquivo (protótipo, sem impressora física)
    // "rede":     envia para a impressora pela rede (impressora Wi-Fi ou notebook com o agente)
    modo: process.env.IMPRESSORA_MODO || 'simulada',

    // Usados só no modo "rede"
    endereco: process.env.IMPRESSORA_ENDERECO || '192.168.0.50',
    porta: Number(process.env.IMPRESSORA_PORTA) || 9100,
    tempoLimiteMs: Number(process.env.IMPRESSORA_TEMPO_LIMITE_MS) || 4000,

    // Usados só no modo "simulada"
    pastaDasSimulacoes: process.env.IMPRESSORA_PASTA_SIMULACAO || path.join(pastaDoProjeto, 'impressoes-simuladas'),
    simularFalha: process.env.IMPRESSORA_SIMULAR_FALHA === '1', // para testar o aviso de impressora desligada
  },
};
