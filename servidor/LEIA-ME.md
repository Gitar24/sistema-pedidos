# Servidor

Roda no computador fixo do estabelecimento (`npm start` executa `iniciar.js`).

| Onde | O que tem |
|---|---|
| `iniciar.js` | ponto de partida: abre o banco, prepara a impressora e liga o servidor |
| `aplicacao.js` | entrega a página, liga as rotas e trata os erros |
| `configuracoes.js` | porta, arquivos e modo da impressora (tudo pode ser trocado por variável de ambiente) |
| `validacao.js` | recusa dados inválidos e explica o motivo |
| `tipos-de-erro.js` | tipos de erro que viram mensagem para a tela |
| `registro-de-erros.js` | grava erros inesperados em `registros/erros.log` |
| `rotas/` | endereços da API: `cardapio.js` e `pedidos.js` |
| `banco-de-dados/` | `conexao.js` (tabelas), `consultas.js` (ler/gravar), `cardapio-de-exemplo.js` |
| `impressao/` | papelzinho ESC/POS; **o que depende do modelo fica em `impressao/ajustar-conforme-modelo/`** |

## Caminho de um pedido

1. A página envia `POST /api/pedidos`: `rotas/pedidos.js`.
2. `validacao.js` confere os dados. Se forem inválidos, responde 400 com o motivo.
3. `banco-de-dados/consultas.js` grava o pedido (tudo ou nada). Se falhar, responde 500 e a tela não confirma.
4. `impressao/impressora.js` imprime. Se a impressora falhar, o pedido fica salvo como "não impresso" e a tela avisa.

Observações dos itens ("sem verduras") são validadas em `validacao.js`, gravadas na coluna `observacao` e impressas por `impressao/montar-papel.js`.
Cancelamento (`POST /api/pedidos/:id/cancelar`): `banco-de-dados/consultas.js` grava a data em `cancelado_em`; o pedido nunca é apagado.
