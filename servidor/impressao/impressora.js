// =============================================================================
// IMPRESSORA — única porta de entrada da impressão para o resto do sistema.
//
// O resto do código só usa:   criarImpressora(config).imprimirPedido(pedido)
// e o erro ErroImpressora. Nada fora desta pasta sabe o que é ESC/POS.
//
// Arquivos desta pasta:
//   impressora.js              -> este arquivo (fila de impressão e escolha do modo)
//   montar-papel.js            -> desenha o papelzinho do pedido
//   comandos-escpos.js         -> comandos ESC/POS padrão
//   erro-de-impressao.js       -> erro usado quando a impressora não responde
//   ajustar-conforme-modelo/   -> *** TUDO QUE DEPENDE DO MODELO DA IMPRESSORA ***
// =============================================================================
const { montarPapelDoPedido } = require('./montar-papel');
const { PERFIL_DA_IMPRESSORA } = require('./ajustar-conforme-modelo/perfil-da-impressora');
const { ErroImpressora } = require('./erro-de-impressao');

// Formas de enviar o papel para a impressora (escolhida em configuracoes.js -> impressora.modo)
const MODOS_DE_ENVIO = {
  simulada: require('./ajustar-conforme-modelo/envio-simulado'),
  rede: require('./ajustar-conforme-modelo/envio-pela-rede'),
};

function criarImpressora(config) {
  const formaDeEnvio = MODOS_DE_ENVIO[config.modo];
  if (!formaDeEnvio) {
    throw new Error(`Modo de impressora desconhecido: "${config.modo}". Use: ${Object.keys(MODOS_DE_ENVIO).join(' ou ')}`);
  }

  // Fila: imprime um papel por vez, para dois pedidos simultâneos não se misturarem.
  let fila = Promise.resolve();

  function imprimirPedido(pedido) {
    const trabalho = fila.then(async () => {
      const papel = montarPapelDoPedido(pedido, PERFIL_DA_IMPRESSORA);
      try {
        await formaDeEnvio.enviar(papel, config, pedido);
      } catch (erro) {
        if (erro instanceof ErroImpressora) throw erro;
        throw new ErroImpressora('Não foi possível imprimir: a impressora parece desligada ou desconectada.', erro);
      }
    });
    fila = trabalho.catch(() => {}); // uma falha não trava os próximos pedidos
    return trabalho;
  }

  return { imprimirPedido };
}

module.exports = { criarImpressora, ErroImpressora };
