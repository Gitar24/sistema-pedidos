// =============================================================================
// ABAS — troca entre "Novo pedido", "Pedidos recentes" e "Cadastrar item".
//
// Por que abas? Os botões Cancelar e Reimprimir ficam numa tela separada, para ninguém
// clicar neles sem querer enquanto monta um pedido. O pedido em andamento NÃO se perde
// ao trocar de aba. A aba atual fica no endereço (#recentes), então F5 volta para ela.
// =============================================================================

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
  try { history.replaceState(null, '', nome === 'novo' ? location.pathname : '#' + nome); } catch { /* sem histórico: tudo bem */ }
  // Ao abrir a lista, mostra sempre a situação mais recente dos pedidos.
  if (nome === 'recentes') carregarPedidosRecentes();
}

// Bolinha vermelha na aba "Pedidos recentes": quantos pedidos ainda não foram impressos.
function mostrarContagemDeNaoImpressos(pedidos) {
  const faltam = pedidos.filter((p) => p.status === 'nao_impresso').length;
  const bolinha = document.getElementById('contagem-nao-impressos');
  bolinha.textContent = faltam;
  bolinha.classList.toggle('oculto', faltam === 0);
}

for (const [chave, idDaAba] of Object.entries(ABAS)) {
  document.getElementById(idDaAba).addEventListener('click', () => mostrarAba(chave));
}
