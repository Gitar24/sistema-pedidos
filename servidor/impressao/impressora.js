// Esta é a única porta de entrada da impressão. O resto do sistema só precisa de:
//   criarImpressora(config).imprimirPedido(pedido)
// e do erro ErroImpressora. Ninguém fora desta pasta precisa saber o que é ESC/POS.
//
// O que tem aqui:
//   impressora.js              este arquivo: a fila de impressão e a escolha do modo
//   montar-papel.js            desenha o papelzinho do pedido
//   comandos-escpos.js         comandos ESC/POS padrão
//   erro-de-impressao.js       o erro de quando a impressora não responde
//   ajustar-conforme-modelo/   tudo o que muda conforme o modelo da impressora
const { montarPapelDoPedido } = require('./montar-papel');
const { PERFIL_DA_IMPRESSORA } = require('./ajustar-conforme-modelo/perfil-da-impressora');
const { ErroImpressora } = require('./erro-de-impressao');

// As formas de mandar o papel para a impressora. Quem escolhe é o
// impressora.modo, em configuracoes.js.
const MODOS_DE_ENVIO = {
  simulada: require('./ajustar-conforme-modelo/envio-simulado'),
  rede: require('./ajustar-conforme-modelo/envio-pela-rede'),
};

function criarImpressora(config) {
  const formaDeEnvio = MODOS_DE_ENVIO[config.modo];
  if (!formaDeEnvio) {
    throw new Error(`Modo de impressora desconhecido: "${config.modo}". Use: ${Object.keys(MODOS_DE_ENVIO).join(' ou ')}`);
  }

  // Fila: um papel por vez, para dois pedidos feitos ao mesmo tempo não saírem
  // misturados.
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
    fila = trabalho.catch(() => {}); // se este pedido falhar, os próximos continuam andando
    return trabalho;
  }

  return { imprimirPedido };
}

module.exports = { criarImpressora, ErroImpressora };
