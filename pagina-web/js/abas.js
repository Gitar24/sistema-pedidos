// Troca entre as abas "Novo pedido", "Pedidos" e "Cadastrar item".
//
// Por que abas? Para os botões Cancelar e Reimprimir ficarem numa tela à parte e
// ninguém clicar neles sem querer enquanto monta um pedido. Trocar de aba não
// perde o pedido em andamento. A aba atual vai para o endereço (#recentes), então
// apertar F5 volta para a mesma aba.

const ABAS = { novo: 'aba-novo', recentes: 'aba-recentes', cadastro: 'aba-cadastro' };

function mostrarAba(nome) {
  if (!ABAS[nome]) nome = 'novo';
  for (const [chave, idDaAba] of Object.entries(ABAS)) {
    const aba = document.getElementById(idDaAba);
    const ativa = chave === nome;
    aba.classList.toggle('ativa', ativa);
    aba.setAttribute('aria-selected', String(ativa));
    document.getElementById(aba.dataset.painel).classList.toggle('oculto', !ativa);
  }
  try { history.replaceState(null, '', nome === 'novo' ? location.pathname : '#' + nome); } catch { /* se o navegador não deixar mexer no endereço, tudo bem */ }
  // Ao abrir a lista, recarrega para mostrar a situação mais recente dos pedidos.
  if (nome === 'recentes') carregarPedidosRecentes();
}

// A bolinha vermelha na aba "Pedidos" diz quantos pedidos ainda estão sem imprimir.
function mostrarContagemDeNaoImpressos(pedidos) {
  const faltam = pedidos.filter((p) => p.status === 'nao_impresso').length;
  const bolinha = document.getElementById('contagem-nao-impressos');
  bolinha.textContent = faltam;
  bolinha.classList.toggle('oculto', faltam === 0);
}

for (const [chave, idDaAba] of Object.entries(ABAS)) {
  document.getElementById(idDaAba).addEventListener('click', () => mostrarAba(chave));
}
