// =============================================================================
// INICIAR PÁGINA — liga os botões e carrega os dados quando a página abre.
// (Carregado por último no index.html, depois de todos os outros arquivos.)
// =============================================================================

document.getElementById('botao-registrar').addEventListener('click', registrarPedido);
document.getElementById('botao-limpar').addEventListener('click', limparPedido);
document.getElementById('botao-atualizar').addEventListener('click', carregarPedidosRecentes);
document.getElementById('mensagem-fechar').addEventListener('click', fecharMensagem);
document.getElementById('form-item').addEventListener('submit', cadastrarItem);

carregarCardapio();
carregarPedidosRecentes();
desenharPedidoAtual();
mostrarAba(location.hash.slice(1)); // abre na aba do endereço (#recentes) ou em "Novo pedido"
