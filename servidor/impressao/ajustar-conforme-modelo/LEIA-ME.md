# Ajustar conforme o modelo da impressora

**Tudo que muda quando o modelo da impressora for confirmado está nesta pasta.**
O resto do sistema não precisa ser alterado.

| Arquivo | O que ajustar |
|---|---|
| `perfil-da-impressora.js` | caracteres por linha (80 mm = 48, 58 mm = 32), tabela de acentos, comando de corte |
| `envio-pela-rede.js` | envio para impressora Wi-Fi ou para o notebook com o agente (porta 9100) |
| `envio-simulado.js` | sem impressora: grava o papel em `impressoes-simuladas/` (protótipo) |

Se a impressora for ligada de outra forma (ex.: cabo serial no próprio servidor), crie um
`envio-...js` novo com uma função `enviar(papel, config, pedido)` e registre-o em `../impressora.js`.
