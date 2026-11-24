# Ajustar conforme o modelo da impressora

**Quando o modelo da impressora for confirmado, tudo o que precisa mudar está nesta pasta.**
O resto do sistema fica como está.

| Arquivo | O que ajustar |
|---|---|
| `perfil-da-impressora.js` | caracteres por linha (80 mm = 48, 58 mm = 32), tabela de acentos e comando de corte |
| `envio-pela-rede.js` | o envio para uma impressora Wi-Fi ou para o notebook com o agente (porta 9100) |
| `envio-simulado.js` | o modo sem impressora: salva o papel em `impressoes-simuladas/` (para o protótipo) |

Se a sua impressora for ligada de outro jeito (um cabo serial direto no servidor, por exemplo),
crie um `envio-...js` novo com uma função `enviar(papel, config, pedido)` e registre ele em `../impressora.js`.
