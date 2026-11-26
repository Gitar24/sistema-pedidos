// Prévia da comanda na própria tela de pedidos.
// Para remover, apague este arquivo e a <script> dele no index.html. O botão
// desaparece sozinho.

function abrirNotaTemporaria(idDoPedido) {
  const dialogo = criarElemento('dialog', 'dialogo-comanda');
  dialogo.setAttribute('aria-labelledby', 'titulo-comanda');
  const titulo = criarElemento('h2', '', `Comanda #${idDoPedido}`);
  titulo.id = 'titulo-comanda';
  const fechar = criarElemento('button', 'btn btn-neutro', 'Fechar');
  fechar.autofocus = true;
  fechar.addEventListener('click', () => dialogo.close());
  const topo = criarElemento('div', 'dialogo-comanda-topo');
  topo.append(titulo, fechar);

  const previa = criarElemento('iframe');
  previa.title = `Prévia da comanda #${idDoPedido}`;
  previa.src = `/previa-nota/${idDoPedido}`;
  dialogo.append(topo, previa);
  dialogo.addEventListener('close', () => dialogo.remove(), { once: true });
  document.body.append(dialogo);
  dialogo.showModal();
}
