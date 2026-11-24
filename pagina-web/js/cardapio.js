// Mostra os itens do cardápio, com nome, preço e o botão "Adicionar".

let itensDoCardapio = [];

async function carregarCardapio() {
  try {
    const dados = await falarComServidor('/api/cardapio');
    itensDoCardapio = dados.itens;
    desenharCardapio();
  } catch (erro) {
    mostrarFalha(erro, 'Não foi possível carregar o cardápio');
  }
}

function desenharCardapio() {
  const tabela = document.querySelector('#tabela-cardapio tbody');
  tabela.replaceChildren();
  for (const item of itensDoCardapio) {
    const linha = tabela.insertRow();
    linha.insertCell().textContent = item.nome;
    const preco = linha.insertCell();
    preco.className = 'num';
    preco.textContent = emReais(item.precoCentavos);
    const botao = document.createElement('button');
    botao.textContent = 'Adicionar';
    botao.className = 'btn btn-adicionar';
    botao.addEventListener('click', () => adicionarAoPedido(item)); // está em pedido-atual.js
    linha.insertCell().append(botao);
  }
  document.getElementById('cardapio-vazio').classList.toggle('oculto', itensDoCardapio.length > 0);
}
