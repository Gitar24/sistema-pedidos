const os = require('node:os');

function enderecosNaRede(enderecoDaConexao) {
  const enderecoPreferido = enderecoDaConexao?.replace(/^::ffff:/, '');
  const candidatos = Object.entries(os.networkInterfaces()).flatMap(([nome, interfaces]) =>
    interfaces.filter(({ family, internal }) => family === 'IPv4' && !internal)
      .map(({ address }) => ({
        endereco: address,
        prioridade: address === enderecoPreferido ? 0
          : /^(br-|bridge|docker|veth|virbr|vmnet|vboxnet|tun|tap|wg|tailscale)/i.test(nome) ? 2 : 1,
      })),
  );
  candidatos.sort((a, b) => a.prioridade - b.prioridade);
  return [...new Set(candidatos.map(({ endereco }) => endereco))];
}

module.exports = { enderecosNaRede };
