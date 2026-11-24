// =============================================================================
// CADASTRO DE ITEM — formulário para incluir um item novo no cardápio.
// Quem decide se os dados são válidos é o servidor; a tela só mostra a resposta.
// =============================================================================

async function cadastrarItem(evento) {
  evento.preventDefault();
  const formulario = evento.target;
  const botao = formulario.querySelector('button');

  // Aceita "12,50" ou "12.50". Se não for número, manda o texto mesmo:
  // o servidor recusa e explica o motivo.
  const precoDigitado = formulario.preco.value.trim().replace(',', '.');
  const preco = precoDigitado !== '' && !Number.isNaN(Number(precoDigitado)) ? Number(precoDigitado) : formulario.preco.value;

  botao.disabled = true;
  try {
    const dados = await falarComServidor('/api/cardapio', {
      method: 'POST',
      body: JSON.stringify({ nome: formulario.nome.value, preco }),
    });
    mostrarMensagem(dados.mensagem, 'sucesso');
    formulario.reset();
    carregarCardapio(); // em cardapio.js
  } catch (erro) {
    mostrarFalha(erro, 'Item não cadastrado');
  } finally {
    botao.disabled = false;
  }
}
