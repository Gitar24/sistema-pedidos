const dialogoCelular = document.getElementById('acesso-celular');
const opcoesCelular = document.getElementById('opcoes-acesso-celular');
let acessosCelular = [];
let aberturaCelular = 0;

function mostrarEnderecoDoCelular() {
  const { endereco, qrCode } = acessosCelular[opcoesCelular.selectedIndex];
  const link = document.getElementById('endereco-acesso-celular');
  link.href = endereco;
  link.textContent = endereco;
  document.getElementById('qr-acesso-celular').src = qrCode;
}

async function abrirAcessoCelular() {
  const abertura = ++aberturaCelular;
  const estado = document.getElementById('estado-acesso-celular');
  const conteudo = document.getElementById('dados-acesso-celular');
  estado.textContent = 'Carregando QR Code…';
  conteudo.classList.add('oculto');
  dialogoCelular.showModal();

  try {
    const { acessos } = await falarComServidor('/api/acesso-celular');
    if (abertura !== aberturaCelular || !dialogoCelular.open) return;
    if (!acessos.length) {
      estado.textContent = 'Nenhum endereço de rede foi encontrado. Conecte o servidor à rede e tente novamente.';
      return;
    }

    acessosCelular = acessos;
    opcoesCelular.replaceChildren(...acessos.map(({ endereco }) => new Option(endereco)));
    document.getElementById('escolha-acesso-celular').classList.toggle('oculto', acessos.length === 1);
    mostrarEnderecoDoCelular();
    estado.textContent = '';
    conteudo.classList.remove('oculto');
  } catch {
    if (abertura === aberturaCelular && dialogoCelular.open) {
      estado.textContent = 'Não foi possível carregar o QR Code. Tente novamente.';
    }
  }
}

document.getElementById('abrir-no-celular').addEventListener('click', abrirAcessoCelular);
opcoesCelular.addEventListener('change', mostrarEnderecoDoCelular);
