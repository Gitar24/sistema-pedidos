// =============================================================================
// ⚠ TEMPORÁRIO — rota da prévia da nota (veja como remover em
// servidor/impressao/previa-temporaria.js).
//   GET /previa-nota/:id  -> página HTML com o recibo do pedido, sem imprimir nada
// =============================================================================
const express = require('express');
const { montarPapelDoPedido } = require('../impressao/montar-papel');
const { PERFIL_DA_IMPRESSORA } = require('../impressao/ajustar-conforme-modelo/perfil-da-impressora');
const { gerarPaginaDaNota } = require('../impressao/previa-temporaria');

function paginaDeAviso(texto) {
  return `<!doctype html><meta charset="utf-8"><title>Prévia da nota</title><p style="font-family:sans-serif;padding:1rem">${texto}</p>`;
}

function rotasPreviaTemporaria(consultas) {
  const rotas = express.Router();

  rotas.get('/:id', (req, res) => {
    const id = Number(req.params.id);
    const pedido = Number.isInteger(id) && id > 0 ? consultas.buscarPedido(id) : null;
    if (!pedido) return res.status(404).send(paginaDeAviso('Pedido não encontrado.'));

    const bytes = montarPapelDoPedido(pedido, PERFIL_DA_IMPRESSORA);
    res.type('html').send(gerarPaginaDaNota(bytes, { numeroDoPedido: pedido.id, colunas: PERFIL_DA_IMPRESSORA.colunas }));
  });

  return rotas;
}

module.exports = { rotasPreviaTemporaria };
