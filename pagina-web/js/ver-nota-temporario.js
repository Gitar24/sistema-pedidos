// Temporário: o botão "Ver nota", que mostra o recibo na tela enquanto não há impressora.
// Para remover, apague este arquivo e a <script> dele no index.html. O botão
// desaparece sozinho.

function abrirNotaTemporaria(idDoPedido) {
  const janela = window.open(`/previa-nota/${idDoPedido}`, '_blank');
  if (!janela) {
    mostrarMensagem('O navegador bloqueou a janela da nota. Permita pop-ups para este endereço e clique em "Ver nota" de novo.', 'aviso');
  }
}
