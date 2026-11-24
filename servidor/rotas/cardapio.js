// =============================================================================
// ROTAS DO CARDÁPIO
//   GET  /api/cardapio   -> lista os itens (nome e preço)
//   POST /api/cardapio   -> cadastra um item  { "nome": "Tapioca", "preco": 14.90 }
// =============================================================================
const express = require('express');
const { validarNovoItem } = require('../validacao');

function rotasCardapio(consultas) {
  const rotas = express.Router();

  rotas.get('/', (req, res) => {
    res.json({ itens: consultas.listarCardapio() });
  });

  rotas.post('/', (req, res) => {
    const dados = validarNovoItem(req.body);
    const item = consultas.criarItemCardapio(dados);
    res.status(201).json({ item, mensagem: `Item "${item.nome}" cadastrado.` });
  });

  return rotas;
}

module.exports = { rotasCardapio };
