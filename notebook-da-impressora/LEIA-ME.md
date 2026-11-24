# Notebook da impressora

Esta pasta é para o **notebook onde a impressora está ligada por USB**. No servidor ela não serve para nada.

1. Instale o Node.js nesse notebook. Não precisa rodar `npm install`.
2. Copie o `agente.js` para lá e rode `node agente.js`.
3. No servidor, inicie com `IMPRESSORA_MODO=rede IMPRESSORA_ENDERECO=<IP do notebook> npm start`.

Para saber qual é o "dispositivo" da impressora (Linux, Windows ou serial), veja o comentário no topo do `agente.js`.

Se a sua impressora tem Wi-Fi própria, nem precisa desta pasta: aponte o `IMPRESSORA_ENDERECO`
direto para o IP da impressora.
