// =============================================================================
// FERRAMENTAS — funções usadas por todas as partes da página:
//   falarComServidor()  -> toda comunicação com o servidor passa por aqui
//   mostrarMensagem()   -> faixa colorida de sucesso / aviso / erro / conexão
//   emReais()           -> 1250 centavos vira "R$ 12,50"
// =============================================================================

const TEMPO_LIMITE_MS = 10000; // desiste de esperar o servidor depois de 10 segundos

class ErroDeConexao extends Error {}

function emReais(centavos) {
  return 'R$ ' + (centavos / 100).toFixed(2).replace('.', ',');
}

let relogioDoAviso;

// Faixa fixa no topo. Sucesso some sozinho depois de alguns segundos;
// aviso e erro ficam até o funcionário fechar, para ninguém perder a informação.
function mostrarMensagem(texto, tipo) { // tipo: 'sucesso' | 'aviso' | 'erro' | 'conexao'
  const faixa = document.getElementById('mensagem');
  document.getElementById('mensagem-texto').textContent = texto;
  faixa.className = 'mensagem ' + tipo;
  clearTimeout(relogioDoAviso);
  if (tipo === 'sucesso') relogioDoAviso = setTimeout(fecharMensagem, 8000);
}

function fecharMensagem() {
  document.getElementById('mensagem').classList.add('oculto');
}

// Indicador no topo da página: mostra se o servidor está respondendo.
function mostrarEstadoDoServidor(conectado) {
  const selo = document.getElementById('estado-servidor');
  selo.textContent = conectado ? 'Servidor conectado' : 'Sem conexão com o servidor';
  selo.className = 'estado-servidor ' + (conectado ? 'ok' : 'sem-conexao');
}

// Mostra a mensagem certa para uma falha: problema de conexão ou erro explicado pelo servidor.
function mostrarFalha(erro, contexto) {
  if (erro instanceof ErroDeConexao) mostrarMensagem(erro.message, 'conexao');
  else mostrarMensagem(`${contexto}: ${erro.message}`, 'erro');
}

// Nunca deixa a tela travada: se a rede cair ou o servidor demorar, lança ErroDeConexao.
// Se o servidor responder com erro, lança Error com a mensagem que ele mandou.
// (503 = impressora indisponível na reimpressão: não é erro da tela, a resposta traz o aviso.)
async function falarComServidor(endereco, opcoes = {}) {
  const cancelamento = new AbortController();
  const relogio = setTimeout(() => cancelamento.abort(), TEMPO_LIMITE_MS);
  let resposta;
  try {
    resposta = await fetch(endereco, {
      ...opcoes,
      headers: { 'Content-Type': 'application/json' },
      signal: cancelamento.signal,
    });
  } catch {
    mostrarEstadoDoServidor(false);
    throw new ErroDeConexao('Sem conexão com o servidor. Verifique se o notebook está no Wi-Fi do estabelecimento e se o computador servidor está ligado.');
  } finally {
    clearTimeout(relogio);
  }

  mostrarEstadoDoServidor(true);
  let dados = {};
  try { dados = await resposta.json(); } catch { /* resposta sem conteúdo */ }
  if (!resposta.ok && resposta.status !== 503) {
    throw new Error(dados.erro || `O servidor respondeu com erro (${resposta.status}).`);
  }
  return dados;
}
