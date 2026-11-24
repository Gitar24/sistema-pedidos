// =============================================================================
// APLICAÇÃO — junta as peças do servidor web:
//   1. entrega a página (pasta pagina-web/)
//   2. liga as rotas da API (pasta rotas/)
//   3. transforma qualquer erro numa resposta com mensagem clara
// =============================================================================
const path = require('path');
const express = require('express');
const { criarConsultas } = require('./banco-de-dados/consultas');
const { rotasCardapio } = require('./rotas/cardapio');
const { rotasPedidos } = require('./rotas/pedidos');
const { rotasPreviaTemporaria } = require('./rotas/previa-temporaria'); // TEMPORÁRIO: prévia da nota
const { registrarErro } = require('./registro-de-erros');

function criarApp({ db, impressora }) {
  const app = express(); // Express 5: erros em rotas async chegam ao tratador central
  const consultas = criarConsultas(db);

  app.use(express.json({ limit: '50kb' }));
  app.use(express.static(path.join(__dirname, '..', 'pagina-web')));

  app.use('/api/cardapio', rotasCardapio(consultas));
  app.use('/api/pedidos', rotasPedidos(consultas, impressora));
  app.use('/previa-nota', rotasPreviaTemporaria(consultas)); // TEMPORÁRIO: prévia da nota

  app.use('/api', (req, res) => {
    res.status(404).json({ erro: 'Endereço da API não encontrado.' });
  });

  // Tratador central de erros.
  // eslint-disable-next-line no-unused-vars
  app.use((erro, req, res, next) => {
    if (erro.type === 'entity.parse.failed') {
      return res.status(400).json({ erro: 'Os dados enviados não estão em formato JSON válido.' });
    }
    if (erro.type === 'entity.too.large') {
      return res.status(413).json({ erro: 'Os dados enviados são grandes demais.' });
    }
    if (erro.name === 'ErroValidacao' || erro.name === 'ErroNaoEncontrado') {
      return res.status(erro.status).json({ erro: erro.message });
    }
    if (erro.name === 'ErroBanco') {
      registrarErro(`Falha no banco em ${req.method} ${req.originalUrl}`, erro.cause || erro);
      return res.status(500).json({ erro: erro.message });
    }
    registrarErro(`Erro inesperado em ${req.method} ${req.originalUrl}`, erro);
    res.status(500).json({ erro: 'Erro inesperado no servidor. O problema foi registrado no log.' });
  });

  return app;
}

module.exports = { criarApp };
