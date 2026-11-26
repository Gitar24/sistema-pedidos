// Liga os botões e carrega os dados assim que a página abre. É o último script do
// index.html, porque precisa de todos os outros já carregados.

let demonstracao = false;

async function carregarConfiguracao() {
  try {
    const dados = await falarComServidor('/api/configuracao');
    demonstracao = dados.demonstracao === true;
    document.getElementById('inicio-demo').classList.toggle('oculto', !demonstracao);
    document.getElementById('selo-demo').classList.toggle('oculto', !demonstracao);
  } catch (erro) {
    mostrarFalha(erro, 'Não foi possível carregar a configuração');
  }
}

document.getElementById('botao-registrar').addEventListener('click', registrarPedido);
document.getElementById('botao-exemplo').addEventListener('click', preencherPedidoDeExemplo);
document.getElementById('botao-limpar').addEventListener('click', limparPedido);
document.getElementById('botao-atualizar').addEventListener('click', carregarPedidosRecentes);
document.getElementById('mensagem-fechar').addEventListener('click', fecharMensagem);
document.getElementById('form-item').addEventListener('submit', cadastrarItem);

window.addEventListener('offline', conferirConexao);
window.addEventListener('online', conferirConexao);
setInterval(conferirConexao, INTERVALO_DA_CONFERENCIA_MS);

carregarCardapio();
desenharPedidoAtual();
carregarConfiguracao().then(() => {
  const abaInicial = location.hash.slice(1);
  mostrarAba(abaInicial);
  if (abaInicial !== 'recentes') carregarPedidosRecentes();
});
