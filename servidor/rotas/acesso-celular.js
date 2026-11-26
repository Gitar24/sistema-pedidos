const QRCode = require('qrcode');
const { enderecosNaRede } = require('../rede-local');

async function mostrarAcessoCelular(req, res) {
  const enderecos = enderecosNaRede(req.socket.localAddress);
  const acessos = await Promise.all(enderecos.map(async (ip) => {
    const endereco = `http://${ip}:${req.socket.localPort}`;
    const qrCode = await QRCode.toDataURL(endereco, { width: 256, margin: 4 });
    return { endereco, qrCode };
  }));

  res.set('Cache-Control', 'no-store').json({ acessos });
}

module.exports = { mostrarAcessoCelular };
