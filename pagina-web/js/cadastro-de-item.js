// Formulário para cadastrar um item novo no cardápio. Quem decide se os dados
// servem é o servidor; a tela só mostra o que ele responder.

async function cadastrarItem(evento) {
  evento.preventDefault();
  const formulario = evento.target;
  const botao = formulario.querySelector('button');

  // Aceita "12,50" ou "12.50". Se nem for número, manda o texto assim mesmo:
  // o servidor recusa e explica por quê.
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
    carregarCardapio(); // está em cardapio.js
  } catch (erro) {
    mostrarFalha(erro, 'Item não cadastrado');
  } finally {
    botao.disabled = false;
  }
}
