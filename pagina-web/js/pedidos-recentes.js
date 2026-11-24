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
  const tabela = document.querySelector('#tabela-pedidos tbody');
  tabela.replaceChildren();
  document.getElementById('pedidos-vazio').classList.toggle('oculto', pedidos.length > 0);

  for (const pedido of pedidos) {
    const cancelado = pedido.status === 'cancelado';
    const linha = tabela.insertRow();
    if (cancelado) linha.className = 'cancelado';

    linha.insertCell().textContent = pedido.id;
    linha.insertCell().textContent = pedido.criadoEm.slice(11, 16); // só a hora, tipo "14:52"

    // Os itens do pedido, com a observação do cliente em destaque.
    const celulaItens = linha.insertCell();
    celulaItens.className = 'itens-do-pedido';
    const nomes = document.createElement('span');
    nomes.className = 'nome-itens';
    pedido.itens.forEach((item, posicao) => {
      if (posicao > 0) nomes.append(' · ');
      nomes.append(`${item.quantidade}x ${item.nome}`);
      if (item.observacao) {
        const obs = document.createElement('span');
        obs.className = 'obs';
        obs.textContent = ` (${item.observacao})`;
        nomes.append(obs);
      }
    });
    celulaItens.append(nomes);

    const total = linha.insertCell();
    total.className = 'num' + (cancelado ? ' total-cancelado' : '');
    total.textContent = emReais(pedido.totalCentavos);

    const situacao = linha.insertCell();
    const selo = document.createElement('span');
    selo.className = 'selo selo-' + pedido.status;
    selo.textContent = ROTULOS_DA_SITUACAO[pedido.status];
    situacao.append(selo);

    const acoes = linha.insertCell();
    acoes.className = 'celula-acoes';
    // Temporário: o "Ver nota" só aparece se js/ver-nota-temporario.js estiver carregado.
    if (typeof abrirNotaTemporaria === 'function') {
      acoes.append(criarBotao('Ver nota', 'btn-neutro', () => abrirNotaTemporaria(pedido.id), 'Mostra como o papel vai sair (prévia)'));
    }
    if (!cancelado) {
      acoes.append(criarBotao('Reimprimir', 'btn-reimprimir', (botao) => reimprimir(pedido.id, botao)));
      acoes.append(criarBotao('Cancelar', 'btn-cancelar', (botao) => cancelarPedido(pedido, botao), 'O cliente desistiu'));
    }
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
  const aviso = `Cancelar o pedido #${pedido.id} (${emReais(pedido.totalCentavos)})?`
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
