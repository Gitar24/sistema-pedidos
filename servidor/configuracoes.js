// Configurações do sistema. Qualquer valor daqui pode ser trocado por uma variável
// de ambiente na hora de iniciar, sem editar o código. Por exemplo:
//   PORTA=8080 npm start
const path = require('path');

const pastaDoProjeto = path.resolve(__dirname, '..');

module.exports = {
  // Porta em que os celulares abrem a página
  porta: Number(process.env.PORTA) || 3000,

  // Onde ficam o banco de dados e o registro de erros
  arquivoDoBanco: process.env.ARQUIVO_BANCO || path.join(pastaDoProjeto, 'dados', 'pedidos.db'),
  arquivoDeErros: process.env.ARQUIVO_LOG || path.join(pastaDoProjeto, 'registros', 'erros.log'),

  impressora: {
    // "simulada": em vez de imprimir, salva o papelzinho num arquivo (para testar sem impressora)
    // "rede":     manda para a impressora pela rede (uma impressora Wi-Fi ou um notebook com o agente)
    modo: process.env.IMPRESSORA_MODO || 'simulada',

    // Só valem no modo "rede"
    endereco: process.env.IMPRESSORA_ENDERECO || '192.168.0.50',
    porta: Number(process.env.IMPRESSORA_PORTA) || 9100,
    tempoLimiteMs: Number(process.env.IMPRESSORA_TEMPO_LIMITE_MS) || 4000,

    // Só valem no modo "simulada"
    pastaDasSimulacoes: process.env.IMPRESSORA_PASTA_SIMULACAO || path.join(pastaDoProjeto, 'impressoes-simuladas'),
    simularFalha: process.env.IMPRESSORA_SIMULAR_FALHA === '1', // liga a falha de propósito, para ver o aviso de impressora desligada
  },
};
