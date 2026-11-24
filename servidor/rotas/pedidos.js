// Rotas dos pedidos:
//   GET  /api/pedidos                os últimos pedidos (?status=impresso|nao_impresso|cancelado filtra)
//   POST /api/pedidos                registra o pedido e manda imprimir,
//                                    ex.: { "itens": [{ "itemId": 1, "quantidade": 2 }] }
//   POST /api/pedidos/:id/imprimir   reimprime um pedido
//   POST /api/pedidos/:id/cancelar   cancela o pedido (o cliente desistiu); ele fica no histórico
//
// A regra que vale para tudo: o pedido é salvo primeiro e só depois tentamos
// imprimir. Se a impressora falhar, o pedido não se perde: fica salvo como "nao_impresso".
const express = require('express');
const { validarNovoPedido, validarIdPedido } = require('../validacao');
const { ErroNaoEncontrado, ErroValidacao } = require('../tipos-de-erro');
const { ErroImpressora } = require('../impressao/impressora');
const { registrarErro, registrarAviso } = require('../registro-de-erros');

function rotasPedidos(consultas, impressora) {
  const rotas = express.Router();

  // Tenta imprimir e atualizar o status. Nunca lança erro; quem chamou recebe o
  // resultado e decide o que mostrar.
  async function tentarImprimir(pedido, reimpressao = false) {
    try {
      await impressora.imprimirPedido({ ...pedido, reimpressao });
    } catch (erro) {
      if (erro instanceof ErroImpressora) {
        registrarAviso(`Pedido #${pedido.id} não impresso: ${erro.message}${erro.cause ? ` (${erro.cause.message})` : ''}`);
      } else {
        registrarErro(`Erro inesperado ao imprimir o pedido #${pedido.id}`, erro);
      }
      return {
        impresso: false,
        aviso: erro instanceof ErroImpressora
          ? `${erro.message} O pedido #${pedido.id} está salvo como NÃO IMPRESSO; reimprima quando a impressora voltar.`
          : `Erro inesperado na impressão. O pedido #${pedido.id} está salvo como NÃO IMPRESSO; tente reimprimir.`,
      };
    }
    try {
      consultas.marcarImpresso(pedido.id);
      return { impresso: true };
    } catch (erro) {
      registrarErro(`Pedido #${pedido.id} impresso, mas o status não foi atualizado no banco`, erro);
      return { impresso: true, aviso: 'O papel foi impresso, mas o banco não registrou a impressão.' };
    }
  }

  rotas.get('/', (req, res) => {
    const { status } = req.query;
    if (status !== undefined && !['impresso', 'nao_impresso', 'cancelado'].includes(status)) {
      throw new ErroValidacao('Status inválido. Use "impresso", "nao_impresso" ou "cancelado".');
    }
    res.json({ pedidos: consultas.listarPedidos({ status }) });
  });

  rotas.post('/', async (req, res) => {
    const itens = validarNovoPedido(req.body);
    const pedido = consultas.criarPedido(itens); // se não gravar, lança ErroBanco e a tela não confirma nada
    const resultado = await tentarImprimir(pedido);
    res.status(201).json({
      pedido: consultas.buscarPedido(pedido.id),
      ...resultado,
      mensagem: resultado.impresso
        ? `Pedido #${pedido.id} registrado e enviado para impressão.`
        : `Pedido #${pedido.id} registrado, mas NÃO foi impresso.`,
    });
  });

  rotas.post('/:id/imprimir', async (req, res) => {
    const id = validarIdPedido(req.params.id);
    const pedido = consultas.buscarPedido(id);
    if (!pedido) throw new ErroNaoEncontrado(`O pedido #${id} não existe.`);
    if (pedido.status === 'cancelado') {
      throw new ErroValidacao(`O pedido #${id} está cancelado e não pode ser reimpresso.`);
    }

    const resultado = await tentarImprimir(pedido, pedido.status === 'impresso');
    res.status(resultado.impresso ? 200 : 503).json({
      pedido: consultas.buscarPedido(id),
      ...resultado,
      mensagem: resultado.impresso ? `Pedido #${id} enviado para impressão.` : resultado.aviso,
    });
  });

  rotas.post('/:id/cancelar', (req, res) => {
    const id = validarIdPedido(req.params.id);
    const { pedido, jaFoiImpresso } = consultas.cancelarPedido(id); // se não conseguir gravar, lança erro
    res.json({
      pedido,
      jaFoiImpresso,
      mensagem: jaFoiImpresso
        ? `Pedido #${id} cancelado. O papel já tinha sido impresso: avise a cozinha.`
        : `Pedido #${id} cancelado.`,
    });
  });

  return rotas;
}

module.exports = { rotasPedidos };
