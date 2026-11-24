// Guarda num arquivo, no servidor, os erros que ninguém esperava, para dar para
// investigar depois.
const fs = require('fs');
const path = require('path');
const config = require('./configuracoes');

fs.mkdirSync(path.dirname(config.arquivoDeErros), { recursive: true });

function registrarErro(contexto, erro) {
  const detalhe = erro instanceof Error ? erro.stack : String(erro);
  const linha = `[${new Date().toISOString()}] ${contexto}\n${detalhe}\n\n`;
  try {
    fs.appendFileSync(config.arquivoDeErros, linha);
  } catch (falhaLog) {
    // Se nem o arquivo de log aceitar a gravação, pelo menos o erro aparece no terminal.
    console.error('Falha ao gravar log:', falhaLog);
  }
  console.error(linha.trim());
}

function registrarAviso(mensagem) {
  const linha = `[${new Date().toISOString()}] AVISO ${mensagem}\n`;
  try {
    fs.appendFileSync(config.arquivoDeErros, linha);
  } catch {
    /* tudo bem: aviso que se perde não faz falta */
  }
  console.warn(linha.trim());
}

module.exports = { registrarErro, registrarAviso };
