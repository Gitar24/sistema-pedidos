// Registro de erros inesperados em arquivo no servidor.
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
    // Se nem o log puder ser gravado, ao menos aparece no terminal do servidor.
    console.error('Falha ao gravar log:', falhaLog);
  }
  console.error(linha.trim());
}

function registrarAviso(mensagem) {
  const linha = `[${new Date().toISOString()}] AVISO ${mensagem}\n`;
  try {
    fs.appendFileSync(config.arquivoDeErros, linha);
  } catch {
    /* ignora: aviso não é crítico */
  }
  console.warn(linha.trim());
}

module.exports = { registrarErro, registrarAviso };
