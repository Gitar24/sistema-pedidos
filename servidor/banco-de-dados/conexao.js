// Acesso ao SQLite (arquivo único). Usa o módulo nativo node:sqlite (Node >= 22.13),
// então não há dependência nativa para compilar na máquina do estabelecimento.
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
    status      TEXT    NOT NULL DEFAULT 'nao_impresso'
                CHECK (status IN ('nao_impresso', 'impresso')),
    total_centavos INTEGER NOT NULL CHECK (total_centavos >= 0),
    criado_em   TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    impresso_em TEXT,
    cancelado_em TEXT   -- preenchido quando o cliente desiste; o pedido continua no histórico
  );

  -- Nome e preço são copiados no momento do pedido: se o cardápio mudar depois,
  -- o pedido continua mostrando o que foi realmente vendido.
  CREATE TABLE IF NOT EXISTS itens_pedido (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id      INTEGER NOT NULL REFERENCES pedidos(id),
    item_id        INTEGER NOT NULL REFERENCES itens_cardapio(id),
    nome           TEXT    NOT NULL,
    preco_centavos INTEGER NOT NULL CHECK (preco_centavos >= 0),
    quantidade     INTEGER NOT NULL CHECK (quantidade > 0),
    observacao     TEXT    NOT NULL DEFAULT ''  -- personalização: "sem verduras", "queijo extra"...
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
  db.exec('PRAGMA journal_mode = WAL;');   // leitura e escrita simultâneas de vários notebooks
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec(ESQUEMA);
  atualizarBancoAntigo(db);
  carregarCardapioDeExemplo(db);
  return db;
}

// Bancos criados antes de certas funções não têm algumas colunas.
// Esta função as acrescenta sem apagar nenhum pedido existente.
function atualizarBancoAntigo(db) {
  const colunasDe = (tabela) => db.prepare(`PRAGMA table_info(${tabela})`).all().map((c) => c.name);

  if (!colunasDe('itens_pedido').includes('observacao')) {   // função "personalizar item"
    db.exec("ALTER TABLE itens_pedido ADD COLUMN observacao TEXT NOT NULL DEFAULT ''");
  }
  if (!colunasDe('pedidos').includes('cancelado_em')) {      // função "cancelar pedido"
    db.exec('ALTER TABLE pedidos ADD COLUMN cancelado_em TEXT');
  }
}

// Protótipo: se o cardápio estiver vazio, carrega itens fictícios.
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

// Executa fn dentro de uma transação. Se algo falhar, nada é gravado.
function emTransacao(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const resultado = fn();
    db.exec('COMMIT');
    return resultado;
  } catch (erro) {
    try { db.exec('ROLLBACK'); } catch { /* transação já desfeita */ }
    throw erro;
  }
}

module.exports = { abrirBanco, emTransacao };
