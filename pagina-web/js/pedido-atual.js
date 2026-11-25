// O pedido que o garçom está montando, e o botão "Enviar para a cozinha".
// O pedido só sai da tela depois que o servidor confirma que salvou.
//
// Cada linha tem um campo de observação ("sem verduras", "queijo extra"):
//   - itens iguais e sem observação se juntam numa linha só (2x Coxinha);
//   - se só uma unidade precisa ser diferente, o botão "Separar 1" tira ela da
//     linha e cria outra, onde dá para escrever a observação sem afetar as demais.

let pedidoAtual = []; // [{ chave, itemId, nome, precoCentavos, quantidade, observacao }]
let proximaChave = 1; // identifica cada linha na tela (o mesmo item pode ter várias linhas)
let enviando = false;

function adicionarAoPedido(item) {
  // Só soma numa linha que já exista se ela ainda não tiver observação.
  const jaNoPedido = pedidoAtual.find((linha) => linha.itemId === item.id && linha.observacao === '');
  if (jaNoPedido) jaNoPedido.quantidade++;
  else pedidoAtual.push({ chave: proximaChave++, itemId: item.id, nome: item.nome, precoCentavos: item.precoCentavos, quantidade: 1, observacao: '' });
  desenharPedidoAtual();
}

function mudarQuantidade(chave, quanto) {
  const linha = pedidoAtual.find((l) => l.chave === chave);
  linha.quantidade += quanto;
  if (linha.quantidade <= 0) pedidoAtual = pedidoAtual.filter((l) => l.chave !== chave);
  desenharPedidoAtual();
}

// Tira uma unidade da linha e cria uma linha nova, sem observação, logo abaixo.
function separarUmaUnidade(chave) {
  const posicao = pedidoAtual.findIndex((l) => l.chave === chave);
  const linha = pedidoAtual[posicao];
  linha.quantidade--;
  pedidoAtual.splice(posicao + 1, 0, { ...linha, chave: proximaChave++, quantidade: 1, observacao: '' });
  desenharPedidoAtual();
  // Já deixa o cursor no campo de observação da linha nova.
  document.querySelector(`[data-chave="${pedidoAtual[posicao + 1].chave}"] input`).focus();
}

function desenharPedidoAtual() {
  const lista = document.getElementById('lista-pedido');
  lista.replaceChildren();
  let total = 0;
  for (const item of pedidoAtual) {
    const subtotal = item.precoCentavos * item.quantidade;
    total += subtotal;
    const linha = criarElemento('li');
    linha.dataset.chave = item.chave;

    const topo = criarElemento('div', 'linha-topo');
    topo.append(criarElemento('span', '', `${item.quantidade}x ${item.nome}`), criarElemento('span', 'preco', emReais(subtotal)));

    const campo = criarElemento('input', 'campo-observacao');
    campo.placeholder = 'Observação (ex.: sem verduras)';
    campo.maxLength = 80;
    campo.value = item.observacao;
    // Guarda o que foi digitado sem redesenhar a lista, senão o cursor sairia do campo.
    campo.addEventListener('input', () => { item.observacao = campo.value; });

    const botoes = criarElemento('div', 'botoes');
    for (const [simbolo, quanto] of [['−', -1], ['+', 1]]) {
      const botao = criarElemento('button', 'btn btn-mini', simbolo);
      botao.title = quanto > 0 ? 'Mais um' : 'Menos um (se zerar, o item sai do pedido)';
      botao.addEventListener('click', () => mudarQuantidade(item.chave, quanto));
      botoes.append(botao);
    }
    if (item.quantidade > 1) {
      const separar = criarElemento('button', 'btn btn-neutro', 'Separar 1');
      separar.title = 'Cria uma linha só para 1 unidade, para personalizar apenas ela';
      separar.addEventListener('click', () => separarUmaUnidade(item.chave));
      botoes.append(separar);
    }

    linha.append(topo, campo, botoes);
    lista.append(linha);
  }
  document.getElementById('total-pedido').textContent = emReais(total);
  document.getElementById('pedido-vazio').classList.toggle('oculto', pedidoAtual.length > 0);
  document.getElementById('botao-registrar').disabled = pedidoAtual.length === 0 || enviando;
  document.getElementById('botao-limpar').disabled = pedidoAtual.length === 0 || enviando;
}

// O cliente desistiu antes de o pedido ser registrado, então é só esvaziar a tela.
// Nada tinha sido salvo. Para cancelar um pedido que já foi registrado, o caminho
// é o botão "Cancelar" em Pedidos.
function limparPedido() {
  if (pedidoAtual.length === 0) return;
  if (!confirm('Limpar o pedido atual? Os itens e observações serão descartados.')) return;
  pedidoAtual = [];
  document.getElementById('mesa').value = '';
  desenharPedidoAtual();
}

async function registrarPedido() {
  if (enviando) return; // toque duplo não pode registrar o pedido duas vezes
  const campoDaMesa = document.getElementById('mesa');
  if (!campoDaMesa.value.trim()) { // o servidor também recusa; aqui só poupamos a viagem
    mostrarMensagem('Informe a mesa do pedido.', 'erro');
    campoDaMesa.focus();
    return;
  }
  enviando = true;
  const botao = document.getElementById('botao-registrar');
  botao.textContent = 'Enviando...';
  desenharPedidoAtual();
  try {
    const dados = await falarComServidor('/api/pedidos', {
      method: 'POST',
      body: JSON.stringify({
        mesa: campoDaMesa.value,
        itens: pedidoAtual.map(({ itemId, quantidade, observacao }) => ({ itemId, quantidade, observacao })),
      }),
    });
    // Se chegou até aqui, o servidor confirmou que o pedido está salvo no banco.
    pedidoAtual = [];
    campoDaMesa.value = '';
    if (dados.impresso) mostrarMensagem(dados.mensagem, 'sucesso');
    else mostrarMensagem(dados.aviso || dados.mensagem, 'aviso'); // o pedido foi salvo, mas a impressora falhou
    carregarPedidosRecentes(); // está em pedidos-recentes.js
  } catch (erro) {
    // O pedido continua na tela, com a mesa e as observações, para tentar de novo.
    // Se a conexão caiu no meio do envio, não dá para saber se o servidor chegou a
    // salvar: o garçom precisa conferir, senão a cozinha pode receber o prato duas vezes.
    if (erro instanceof ErroDeConexao) {
      mostrarMensagem('Sem conexão: não deu para confirmar o pedido. Quando o Wi-Fi voltar, confira a aba "Pedidos" antes de enviar de novo.', 'conexao');
    } else mostrarFalha(erro, 'Pedido NÃO registrado');
  } finally {
    enviando = false;
    botao.textContent = 'Enviar para a cozinha';
    desenharPedidoAtual();
  }
}
