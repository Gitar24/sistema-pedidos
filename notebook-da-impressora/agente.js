// =============================================================================
// AGENTE DE IMPRESSÃO — roda no NOTEBOOK onde a impressora está ligada (USB).
// (Veja também o LEIA-ME.md desta pasta.)
//
// Recebe os bytes ESC/POS do servidor pela rede (TCP, porta 9100) e grava no
// dispositivo da impressora. Não depende de nenhum pacote: só precisa do Node.
//
//   node agente.js                         (usa o dispositivo padrão abaixo)
//   DISPOSITIVO=/dev/usb/lp1 node agente.js
//
// *** DEPENDE DO MODELO / SISTEMA DO NOTEBOOK ***  -> valor de DISPOSITIVO:
//   Linux:   /dev/usb/lp0  (impressora USB de classe "printer"; o usuário precisa
//            estar no grupo "lp": sudo usermod -aG lp $USER)
//   Windows: compartilhe a impressora (ex.: nome "TERMICA") e use \\localhost\TERMICA
//            A impressora deve estar com driver "Generic / Text Only" para receber RAW.
//   Serial:  /dev/ttyUSB0 ou COM3 (ajuste a velocidade conforme o manual do modelo)
//
// Se a impressora estiver desligada/desconectada, o agente derruba a conexão e o
// servidor marca o pedido como NÃO IMPRESSO.
// =============================================================================
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
    conexao.resetAndDestroy(); // avisa o servidor que não imprimiu
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
