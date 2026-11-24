# Notebook da impressora

Esta pasta vai para o **notebook onde a impressora está ligada por USB**. Ela não é usada no servidor.

1. Instale o Node.js nesse notebook (não precisa de `npm install`).
2. Copie o `agente.js` para ele e rode `node agente.js`.
3. No servidor, inicie com `IMPRESSORA_MODO=rede IMPRESSORA_ENDERECO=<IP do notebook> npm start`.

Qual é o "dispositivo" da impressora (Linux, Windows ou serial) está explicado no topo do `agente.js`.
Se a impressora tiver Wi-Fi própria, esta pasta não é necessária: aponte `IMPRESSORA_ENDERECO`
direto para o IP da impressora.
