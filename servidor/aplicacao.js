// Aqui as peças do servidor web se encontram: a página que o navegador abre
// (pasta pagina-web/), as rotas da API (pasta rotas/) e, no fim, o tratador que
// transforma qualquer erro numa resposta com uma mensagem que dá para entender.
const path = require('path');
const express = require('express');
const { criarConsultas } = require('./banco-de-dados/consultas');
const { rotasCardapio } = require('./rotas/cardapio');
const { rotasPedidos } = require('./rotas/pedidos');
const { rotasPreviaTemporaria } = require('./rotas/previa-temporaria'); // temporário: prévia da nota
const { mostrarAcessoCelular } = require('./rotas/acesso-celular');
const { registrarErro } = require('./registro-de-erros');

function criarApp({ db, impressora, demonstracao = false }) {
  const app = express(); // No Express 5, erro em rota async já cai no tratador lá embaixo
  const consultas = criarConsultas(db);

  app.get('/api/saude', (_req, res) => {
    res.set('Cache-Control', 'no-store').json({ aplicativo: 'comandas', demonstracao });
  });
  app.use(express.json({ limit: '50kb' }));
  app.use(express.static(path.join(__dirname, '..', 'pagina-web')));

  app.get('/api/configuracao', (_req, res) => {
    res.json({ demonstracao });
  });
  app.get('/api/acesso-celular', mostrarAcessoCelular);
  app.use('/api/cardapio', rotasCardapio(consultas));
  app.use('/api/pedidos', rotasPedidos(consultas, impressora));
  app.use('/previa-nota', rotasPreviaTemporaria(consultas)); // temporário: prévia da nota

  app.use('/api', (req, res) => {
    res.status(404).json({ erro: 'Endereço da API não encontrado.' });
  });

  // Todo erro que as rotas deixarem escapar chega aqui. Os que a gente já esperava
  // (JSON torto, validação, pedido inexistente) viram uma mensagem curta para a tela;
  // o resto vai para o log e a tela só recebe um aviso genérico.
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
