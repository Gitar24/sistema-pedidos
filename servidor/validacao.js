// Confere os dados que chegam da tela. Se algo estiver errado, lança um
// ErroValidacao (HTTP 400) dizendo o motivo.
const { ErroValidacao } = require('./tipos-de-erro');

const PRECO_MAXIMO = 100000;  // R$ 100.000,00
const QUANTIDADE_MAXIMA = 99;
const ITENS_MAXIMOS = 50;
const OBSERVACAO_MAXIMA = 80;
const MESA_MAXIMA = 12;

function validarNovoItem(corpo) {
  if (!corpo || typeof corpo !== 'object') throw new ErroValidacao('Envie os dados do item (nome e preço).');

  const nome = typeof corpo.nome === 'string' ? corpo.nome.trim() : '';
  if (!nome) throw new ErroValidacao('O nome do item é obrigatório.');
  if (nome.length > 60) throw new ErroValidacao('O nome do item deve ter no máximo 60 caracteres.');

  const preco = corpo.preco;
  if (typeof preco !== 'number' || !Number.isFinite(preco)) {
    throw new ErroValidacao('O preço deve ser um número (ex.: 12.50).');
  }
  if (preco < 0) throw new ErroValidacao('O preço não pode ser negativo.');
  if (preco > PRECO_MAXIMO) throw new ErroValidacao('O preço está acima do limite permitido (R$ 100.000,00).');

  const precoCentavos = Math.round(preco * 100);
  if (Math.abs(preco * 100 - precoCentavos) > 1e-6) {
    throw new ErroValidacao('O preço deve ter no máximo 2 casas decimais.');
  }

  return { nome, precoCentavos };
}

// Quebra de linha e caracteres invisíveis viram espaço: nada disso pode chegar à impressora.
function limparTexto(texto) {
  return texto
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// A mesa é obrigatória. Pode ser um número (7) ou um nome curto ("Varanda 2").
function validarMesa(valor) {
  if (Number.isInteger(valor) && valor > 0) valor = String(valor);
  const mesa = typeof valor === 'string' ? limparTexto(valor) : '';
  if (!mesa) throw new ErroValidacao('Informe a mesa do pedido.');
  if (mesa.length > MESA_MAXIMA) throw new ErroValidacao(`A mesa deve ter no máximo ${MESA_MAXIMA} caracteres.`);
  return mesa;
}

// A observação é opcional. É o pedido do cliente para aquele item, como
// "sem verduras" ou "queijo extra".
function validarObservacao(valor, posicao) {
  if (valor === undefined || valor === null) return '';
  if (typeof valor !== 'string') throw new ErroValidacao(`${posicao}: a observação deve ser um texto.`);
  const texto = limparTexto(valor);
  if (texto.length > OBSERVACAO_MAXIMA) {
    throw new ErroValidacao(`${posicao}: a observação deve ter no máximo ${OBSERVACAO_MAXIMA} caracteres.`);
  }
  return texto;
}

function validarNovoPedido(corpo) {
  const itens = corpo && corpo.itens;
  if (!Array.isArray(itens) || itens.length === 0) {
    throw new ErroValidacao('O pedido precisa ter pelo menos um item.');
  }
  if (itens.length > ITENS_MAXIMOS) {
    throw new ErroValidacao(`O pedido pode ter no máximo ${ITENS_MAXIMOS} linhas de itens.`);
  }

  const mesa = validarMesa(corpo.mesa);

  const itensValidos = itens.map((item, i) => {
    const posicao = `Item ${i + 1} do pedido`;
    if (!item || typeof item !== 'object') throw new ErroValidacao(`${posicao}: formato inválido.`);
    if (!Number.isInteger(item.itemId) || item.itemId <= 0) {
      throw new ErroValidacao(`${posicao}: identificador do item do cardápio inválido.`);
    }
    const quantidade = item.quantidade === undefined ? 1 : item.quantidade;
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > QUANTIDADE_MAXIMA) {
      throw new ErroValidacao(`${posicao}: a quantidade deve ser um número inteiro entre 1 e ${QUANTIDADE_MAXIMA}.`);
    }
    return { itemId: item.itemId, quantidade, observacao: validarObservacao(item.observacao, posicao) };
  });

  return { mesa, itens: itensValidos };
}

function validarIdPedido(texto) {
  const id = Number(texto);
  if (!Number.isInteger(id) || id <= 0) throw new ErroValidacao('Número de pedido inválido.');
  return id;
}

module.exports = { validarNovoItem, validarNovoPedido, validarIdPedido };
