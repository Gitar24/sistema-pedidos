// Lista os últimos pedidos com a situação de cada um (impresso, não impresso ou
// cancelado) e os botões Reimprimir e Cancelar.

const ROTULOS_DA_SITUACAO = { impresso: 'Impresso', nao_impresso: 'Não impresso', cancelado: 'Cancelado' };

async function carregarPedidosRecentes() {
  try {
    const dados = await falarComServidor('/api/pedidos');
    desenharPedidosRecentes(dados.pedidos);
    mostrarContagemDeNaoImpressos(dados.pedidos); // está em abas.js
  } catch (erro) {
    mostrarFalha(erro, 'Não foi possível carregar os pedidos');
  }
}

function criarBotao(texto, classe, aoClicar, dica) {
  const botao = document.createElement('button');
  botao.textContent = texto;
  botao.className = 'btn ' + classe;
  if (dica) botao.title = dica;
  botao.addEventListener('click', () => aoClicar(botao));
  return botao;
}

function desenharPedidosRecentes(pedidos) {
  const lista = document.getElementById('lista-pedidos');
  lista.replaceChildren();
  document.getElementById('pedidos-vazio').classList.toggle('oculto', pedidos.length > 0);

  for (const pedido of pedidos) {
    const cancelado = pedido.status === 'cancelado';
    const linha = criarElemento('li', cancelado ? 'cancelado' : '');

    const topo = criarElemento('div', 'linha-topo');
    topo.append(
      criarElemento('span', 'mesa-do-pedido', pedido.mesa ? `Mesa ${pedido.mesa}` : 'Sem mesa'),
      criarElemento('span', 'selo selo-' + pedido.status, ROTULOS_DA_SITUACAO[pedido.status]),
    );
    const hora = pedido.criadoEm.slice(11, 16); // só a hora, tipo "14:52"
    const resumo = criarElemento('div', 'discreto', `Pedido #${pedido.id} · ${hora} · ${emReais(pedido.totalCentavos)}`);

    // Os itens do pedido, com a observação do cliente em destaque.
    const itens = criarElemento('div', 'itens-do-pedido');
    for (const item of pedido.itens) {
      const linhaDoItem = criarElemento('div', '', `${item.quantidade}x ${item.nome}`);
      if (item.observacao) linhaDoItem.append(criarElemento('span', 'obs', ` (${item.observacao})`));
      itens.append(linhaDoItem);
    }

    const acoes = criarElemento('div', 'botoes');
    // Temporário: o "Ver nota" só aparece se js/ver-nota-temporario.js estiver carregado.
    if (typeof abrirNotaTemporaria === 'function') {
      acoes.append(criarBotao('Ver nota', 'btn-neutro', () => abrirNotaTemporaria(pedido.id), 'Mostra como o papel vai sair (prévia)'));
    }
    if (!cancelado) {
      acoes.append(criarBotao('Reimprimir', 'btn-reimprimir', (botao) => reimprimir(pedido.id, botao)));
      acoes.append(criarBotao('Cancelar', 'btn-cancelar', (botao) => cancelarPedido(pedido, botao), 'O cliente desistiu'));
    }

    linha.append(topo, resumo, itens, acoes);
    lista.append(linha);
  }
}

async function reimprimir(idDoPedido, botao) {
  botao.disabled = true;
  try {
    const dados = await falarComServidor(`/api/pedidos/${idDoPedido}/imprimir`, { method: 'POST' });
    mostrarMensagem(dados.mensagem, dados.impresso ? 'sucesso' : 'aviso');
    carregarPedidosRecentes();
  } catch (erro) {
    mostrarFalha(erro, `Falha ao reimprimir o pedido #${idDoPedido}`);
  } finally {
    botao.disabled = false;
  }
}

// O cliente desistiu de um pedido que já estava registrado. Perguntamos antes de
// cancelar, porque não existe "desfazer".
async function cancelarPedido(pedido, botao) {
  const jaImpresso = pedido.status === 'impresso';
  const aviso = `Cancelar o pedido #${pedido.id}${pedido.mesa ? ` da mesa ${pedido.mesa}` : ''} (${emReais(pedido.totalCentavos)})?`
    + (jaImpresso ? '\n\nO papel JÁ FOI IMPRESSO: depois de cancelar, avise a cozinha.' : '');
  if (!confirm(aviso)) return;

  botao.disabled = true;
  try {
    const dados = await falarComServidor(`/api/pedidos/${pedido.id}/cancelar`, { method: 'POST' });
    mostrarMensagem(dados.mensagem, dados.jaFoiImpresso ? 'aviso' : 'sucesso');
  } catch (erro) {
    mostrarFalha(erro, `Pedido #${pedido.id} NÃO foi cancelado`);
  } finally {
    botao.disabled = false;
    carregarPedidosRecentes(); // mostra a situação de verdade, mesmo que tenha dado erro
  }
}
