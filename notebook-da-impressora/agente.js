// Agente de impressão. Roda no notebook que tem a impressora ligada por USB.
// (Tem mais detalhes no LEIA-ME.md desta pasta.)
//
// Ele escuta na porta 9100, recebe do servidor os bytes ESC/POS do pedido e
// despeja tudo no dispositivo da impressora. Não precisa instalar nada, só o Node.
//
//   node agente.js                         (usa o dispositivo padrão, veja abaixo)
//   DISPOSITIVO=/dev/usb/lp1 node agente.js
//
// O valor de DISPOSITIVO depende do sistema e da impressora do notebook:
//   Linux:   /dev/usb/lp0. A impressora USB precisa ser da classe "printer" e o
//            seu usuário precisa estar no grupo "lp" (sudo usermod -aG lp $USER).
//   Windows: compartilhe a impressora (por exemplo com o nome "TERMICA") e use
//            \\localhost\TERMICA. O driver tem que ser o "Generic / Text Only",
//            senão o Windows não deixa passar os bytes crus.
//   Serial:  /dev/ttyUSB0 ou COM3. Confira a velocidade no manual do modelo.
//
// Se a impressora estiver desligada ou desconectada, o agente derruba a conexão
// de propósito. É assim que o servidor descobre e marca o pedido como não impresso.
const net = require('net');
const fs = require('fs');

const PORTA = Number(process.env.PORTA) || 9100;
const DISPOSITIVO = process.env.DISPOSITIVO || (process.platform === 'win32' ? '\\\\localhost\\TERMICA' : '/dev/usb/lp0');

const servidor = net.createServer((conexao) => {
  const origem = conexao.remoteAddress;
  let fd;
  try {
    fd = fs.openSync(DISPOSITIVO, 'w');
  } catch (erro) {
    console.error(`[${new Date().toLocaleString()}] Impressora indisponível (${DISPOSITIVO}): ${erro.message}`);
    conexao.resetAndDestroy(); // derruba a conexão para o servidor saber que não deu para imprimir
    return;
  }

  const partes = [];
  conexao.on('data', (dados) => partes.push(dados));
  conexao.on('end', () => {
    try {
      fs.writeSync(fd, Buffer.concat(partes));
      fs.closeSync(fd);
      console.log(`[${new Date().toLocaleString()}] Impresso trabalho vindo de ${origem}`);
      conexao.end();
    } catch (erro) {
      console.error(`[${new Date().toLocaleString()}] Falha ao gravar na impressora: ${erro.message}`);
      try { fs.closeSync(fd); } catch { /* já fechado */ }
      conexao.resetAndDestroy();
    }
  });
  conexao.on('error', () => { try { fs.closeSync(fd); } catch { /* já fechado */ } });
});

servidor.listen(PORTA, '0.0.0.0', () => {
  console.log(`Agente de impressão ouvindo na porta ${PORTA}, dispositivo: ${DISPOSITIVO}`);
});
