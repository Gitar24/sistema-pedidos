# Servidor

Roda no computador fixo do estabelecimento. O `npm start` executa o `iniciar.js`.

| Onde | O que tem |
|---|---|
| `iniciar.js` | o ponto de partida: abre o banco, prepara a impressora e liga o servidor |
| `aplicacao.js` | entrega a página, liga as rotas e cuida dos erros |
| `configuracoes.js` | porta, arquivos e modo da impressora (tudo pode ser trocado por variável de ambiente) |
| `validacao.js` | recusa dados inválidos e explica o motivo |
| `tipos-de-erro.js` | os erros que viram mensagem na tela |
| `registro-de-erros.js` | guarda os erros inesperados em `registros/erros.log` |
| `rotas/` | os endereços da API: `cardapio.js` e `pedidos.js` |
| `banco-de-dados/` | `conexao.js` (tabelas), `consultas.js` (ler e gravar) e `cardapio-de-exemplo.js` |
| `impressao/` | a comanda ESC/POS. **O que depende do modelo da impressora fica em `impressao/ajustar-conforme-modelo/`** |

## O caminho de um pedido

1. O celular envia `POST /api/pedidos` com a mesa e os itens, que cai em `rotas/pedidos.js`.
2. `validacao.js` confere os dados. Se estiverem errados, responde 400 explicando o motivo.
3. `banco-de-dados/consultas.js` grava o pedido, tudo ou nada. Se não conseguir, responde 500 e a tela não confirma nada.
4. `impressao/impressora.js` imprime. Se a impressora falhar, o pedido fica salvo como "não impresso" e a tela avisa.

As observações dos itens ("sem verduras") passam por `validacao.js`, ficam na coluna `observacao` e são impressas por `impressao/montar-papel.js`.

Cancelar (`POST /api/pedidos/:id/cancelar`) só anota a data em `cancelado_em`, em `banco-de-dados/consultas.js`. O pedido nunca é apagado.
