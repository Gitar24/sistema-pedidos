// Liga os botões e carrega os dados assim que a página abre. É o último script do
// index.html, porque precisa de todos os outros já carregados.

document.getElementById('botao-registrar').addEventListener('click', registrarPedido);
document.getElementById('botao-limpar').addEventListener('click', limparPedido);
document.getElementById('botao-atualizar').addEventListener('click', carregarPedidosRecentes);
document.getElementById('mensagem-fechar').addEventListener('click', fecharMensagem);
document.getElementById('form-item').addEventListener('submit', cadastrarItem);

carregarCardapio();
carregarPedidosRecentes();
desenharPedidoAtual();
mostrarAba(location.hash.slice(1)); // abre na aba que está no endereço (#recentes) ou, se não tiver, em "Novo pedido"
