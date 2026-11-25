// Funções que todas as outras partes da página usam:
//   falarComServidor()   toda conversa com o servidor passa por aqui
//   mostrarMensagem()    a faixa colorida de sucesso, aviso, erro ou conexão
//   emReais()            transforma 1250 centavos em "R$ 12,50"
//   criarElemento()      cria um pedaço da página, sempre com texto puro (sem HTML)

const TEMPO_LIMITE_MS = 10000; // depois de 10 segundos sem resposta, desistimos de esperar

class ErroDeConexao extends Error {}

function emReais(centavos) {
  return 'R$ ' + (centavos / 100).toFixed(2).replace('.', ',');
}

function criarElemento(tipo, classe = '', texto = '') {
  const elemento = document.createElement(tipo);
  elemento.className = classe;
  elemento.textContent = texto;
  return elemento;
}

let relogioDoAviso;

// A faixa fixa no topo. A de sucesso some sozinha depois de alguns segundos;
// a de aviso e a de erro ficam até o funcionário fechar, para ninguém perder a informação.
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

// O selo no topo da página, que mostra se o servidor está respondendo.
function mostrarEstadoDoServidor(conectado) {
  const selo = document.getElementById('estado-servidor');
  selo.textContent = conectado ? 'Servidor conectado' : 'Sem conexão com o servidor';
  selo.className = 'estado-servidor ' + (conectado ? 'ok' : 'sem-conexao');
}

// Escolhe a mensagem certa para uma falha: ou a conexão caiu, ou o servidor
// respondeu explicando o erro.
function mostrarFalha(erro, contexto) {
  if (erro instanceof ErroDeConexao) mostrarMensagem(erro.message, 'conexao');
  else mostrarMensagem(`${contexto}: ${erro.message}`, 'erro');
}

// Não deixa a tela travada: se a rede cair ou o servidor demorar, lança ErroDeConexao.
// Se o servidor responder com erro, lança um Error com a mensagem que ele mandou.
// A exceção é o 503 (impressora indisponível numa reimpressão): isso não é erro
// da tela, e a resposta já traz o aviso para mostrar.
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
    throw new ErroDeConexao('Sem conexão com o servidor. Verifique se o celular está no Wi-Fi do estabelecimento e se o computador servidor está ligado.');
  } finally {
    clearTimeout(relogio);
  }

  mostrarEstadoDoServidor(true);
  let dados = {};
  try { dados = await resposta.json(); } catch { /* a resposta veio sem corpo, tudo bem */ }
  if (!resposta.ok && resposta.status !== 503) {
    throw new Error(dados.erro || `O servidor respondeu com erro (${resposta.status}).`);
  }
  return dados;
}

// Confere de tempos em tempos se o servidor continua ao alcance, para o garçom saber
// que saiu do Wi-Fi antes de tentar enviar um pedido.
const INTERVALO_DA_CONFERENCIA_MS = 10000;

async function conferirConexao() {
  const estavaSemConexao = document.getElementById('estado-servidor').classList.contains('sem-conexao');
  try {
    await falarComServidor('/api/cardapio');
    const faixa = document.getElementById('mensagem');
    if (estavaSemConexao && faixa.classList.contains('conexao') && !faixa.textContent.includes('confira')) fecharMensagem();
    if (estavaSemConexao) carregarCardapio(); // caso a página tenha aberto sem conexão
  } catch (erro) {
    if (!estavaSemConexao) mostrarFalha(erro, 'Conexão');
  }
}
