// O banco é um SQLite, ou seja, um arquivo só. Usamos o módulo node:sqlite que já
// vem no Node (22.13 ou mais novo), assim não tem nada para compilar nem instalar
// na máquina do estabelecimento.
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { CARDAPIO_DE_EXEMPLO } = require('./cardapio-de-exemplo');

const ESQUEMA = `
  CREATE TABLE IF NOT EXISTS itens_cardapio (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nome          TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    preco_centavos INTEGER NOT NULL CHECK (preco_centavos >= 0),
    criado_em     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS pedidos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    mesa        TEXT    NOT NULL DEFAULT '',  -- vazio só em pedidos de antes de existir a mesa
    status      TEXT    NOT NULL DEFAULT 'nao_impresso'
                CHECK (status IN ('nao_impresso', 'impresso')),
    total_centavos INTEGER NOT NULL CHECK (total_centavos >= 0),
    criado_em   TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    impresso_em TEXT,
    cancelado_em TEXT   -- só é preenchido se o cliente desistir; o pedido fica no histórico
  );

  -- O nome e o preço são copiados para cá na hora do pedido. Assim, se o cardápio
  -- mudar depois, o pedido antigo continua mostrando o que foi vendido de verdade.
  CREATE TABLE IF NOT EXISTS itens_pedido (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id      INTEGER NOT NULL REFERENCES pedidos(id),
    item_id        INTEGER NOT NULL REFERENCES itens_cardapio(id),
    nome           TEXT    NOT NULL,
    preco_centavos INTEGER NOT NULL CHECK (preco_centavos >= 0),
    quantidade     INTEGER NOT NULL CHECK (quantidade > 0),
    observacao     TEXT    NOT NULL DEFAULT ''  -- pedidos do cliente, como "sem verduras" ou "queijo extra"
  );

  CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido ON itens_pedido(pedido_id);
  CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
`;

function abrirBanco(arquivo) {
  if (arquivo !== ':memory:') {
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  }
  const db = new DatabaseSync(arquivo);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');   // vários celulares podem ler e gravar ao mesmo tempo
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec(ESQUEMA);
  atualizarBancoAntigo(db);
  carregarCardapioDeExemplo(db);
  return db;
}

// Um banco criado numa versão antiga do sistema pode estar sem algumas colunas.
// Aqui a gente acrescenta o que falta, sem mexer em nenhum pedido que já existe.
function atualizarBancoAntigo(db) {
  const colunasDe = (tabela) => db.prepare(`PRAGMA table_info(${tabela})`).all().map((c) => c.name);

  if (!colunasDe('itens_pedido').includes('observacao')) {   // veio com o "personalizar item"
    db.exec("ALTER TABLE itens_pedido ADD COLUMN observacao TEXT NOT NULL DEFAULT ''");
  }
  if (!colunasDe('pedidos').includes('cancelado_em')) {      // veio com o "cancelar pedido"
    db.exec('ALTER TABLE pedidos ADD COLUMN cancelado_em TEXT');
  }
  if (!colunasDe('pedidos').includes('mesa')) {              // veio com a identificação da mesa
    db.exec("ALTER TABLE pedidos ADD COLUMN mesa TEXT NOT NULL DEFAULT ''");
  }
}

// Por enquanto, é um protótipo: se o cardápio estiver vazio, entram alguns itens
// de mentirinha para dar para testar a tela.
function carregarCardapioDeExemplo(db) {
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM itens_cardapio').get();
  if (total > 0) return;
  const inserir = db.prepare('INSERT INTO itens_cardapio (nome, preco_centavos) VALUES (?, ?)');
  db.exec('BEGIN');
  try {
    for (const item of CARDAPIO_DE_EXEMPLO) inserir.run(item.nome, item.precoCentavos);
    db.exec('COMMIT');
  } catch (erro) {
    db.exec('ROLLBACK');
    throw erro;
  }
}

// Roda fn dentro de uma transação. Se qualquer passo falhar, nada fica gravado,
// nem pela metade.
function emTransacao(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const resultado = fn();
    db.exec('COMMIT');
    return resultado;
  } catch (erro) {
    try { db.exec('ROLLBACK'); } catch { /* a transação já tinha sido desfeita */ }
    throw erro;
  }
}

module.exports = { abrirBanco, emTransacao };
