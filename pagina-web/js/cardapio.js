// Mostra os itens do cardápio, com nome, preço e o botão "Adicionar".

let itensDoCardapio = [];

async function carregarCardapio() {
  try {
    const dados = await falarComServidor('/api/cardapio');
    itensDoCardapio = dados.itens;
    desenharCardapio();
    document.getElementById('botao-exemplo').disabled = itensDoCardapio.length === 0;
  } catch (erro) {
    mostrarFalha(erro, 'Não foi possível carregar o cardápio');
  }
}

function desenharCardapio() {
  const lista = document.getElementById('lista-cardapio');
  lista.replaceChildren();
  for (const item of itensDoCardapio) {
    const nome = criarElemento('span', '', item.nome);
    nome.append(criarElemento('div', 'preco', emReais(item.precoCentavos)));
    const botao = criarElemento('button', 'btn btn-adicionar', 'Adicionar');
    botao.addEventListener('click', () => adicionarAoPedido(item)); // está em pedido-atual.js
    const topo = criarElemento('div', 'linha-topo');
    topo.append(nome, botao);
    const linha = criarElemento('li');
    linha.append(topo);
    lista.append(linha);
  }
  document.getElementById('cardapio-vazio').classList.toggle('oculto', itensDoCardapio.length > 0);
}
