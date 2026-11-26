# Comandas para a cozinha (rede local, sem internet)

Um computador fixo faz o papel de **servidor**. O garçom abre a página no navegador do
celular, ligado no Wi-Fi do estabelecimento, e cada pedido registrado imprime uma comanda
(no padrão ESC/POS) com a mesa e os itens. Não precisa de internet para funcionar no dia a dia.

Para instalar pelo menu de aplicativos, veja o [guia do Windows e Linux](empacotamento/GUIA.md).
Para gerar os instaladores, veja [como empacotar o projeto](empacotamento/README.md).

## Apresentar a um cliente

Com as dependências instaladas, rode `npm run demo` e abra **http://localhost:3001**.
Para apresentar no celular, conecte-o ao mesmo Wi-Fi e abra o endereço de rede exibido no terminal.

1. Em **Novo pedido**, clique em **Preencher pedido de exemplo** para carregar a mesa 7 com
   dois lanches e um suco. Um dos lanches tem a observação **Sem cebola**.
2. Clique em **Enviar para a cozinha**. A prévia da comanda abre na própria página.
3. Feche a prévia para mostrar o pedido em **Pedidos**. Use **Ver comanda** para abrir
   a prévia de novo e, se quiser mostrar o cancelamento, use **Cancelar**.

A demonstração começa com cardápio de exemplo, usa um banco em memória e simula a impressão.
Os pedidos e itens cadastrados durante a apresentação somem ao reiniciar a demonstração.

## Mapa das pastas

```
sistema-pedidos/
├── servidor/                      roda no computador fixo          → servidor/LEIA-ME.md
│   ├── iniciar.js                 ponto de partida (npm start)
│   ├── configuracoes.js           porta, arquivos, modo da impressora
│   ├── rotas/                     endereços da API (cardápio e pedidos)
│   ├── banco-de-dados/            SQLite: tabelas, consultas, cardápio de exemplo
│   └── impressao/                 papelzinho ESC/POS
│       └── ajustar-conforme-modelo/   o que muda conforme o modelo da impressora
├── pagina-web/                    a tela de celular que o garçom usa
│   ├── index.html                 página única com 3 abas
│   ├── estilo.css
│   └── js/                        um arquivo por parte da tela
├── notebook-da-impressora/        agente para o notebook com a impressora USB
├── testes/                        testes automáticos (npm test)
│
│   criadas sozinhas ao rodar:
├── dados/pedidos.db               banco de dados
├── registros/erros.log            erros inesperados e falhas de impressão
└── impressoes-simuladas/          papelzinhos do modo simulado (.txt para ler)
```

## Instalar (no computador servidor)

1. Instale o **Node.js 22.13 ou mais novo** (o SQLite já vem embutido).
2. Com internet, uma única vez, rode `npm install` dentro da pasta do projeto.
   Depois disso a internet não faz mais falta. Se o servidor nunca vai ter internet,
   rode `npm install` em outra máquina e copie a pasta inteira, com a `node_modules` junto.

## Iniciar

```
npm start
```

O terminal mostra o endereço de acesso, por exemplo `http://192.168.0.10:3000`.
Na primeira vez, o banco é criado já com um **cardápio de exemplo**.

> **Atualizou o código? Reinicie o servidor** (`Ctrl+C` no terminal e `npm start` de novo).
> O Node não recarrega sozinho: a página nova aparece quando você recarrega o navegador, mas o que
> mudou no servidor só passa a valer depois do reinício.

## Acessar pelo celular

1. Conecte o celular no **mesmo Wi-Fi** do computador servidor (não pode ser a rede de visitantes
   com isolamento entre aparelhos).
2. No computador, abra a página de Comandas e clique em **Abrir no celular**. Escaneie com a câmera
   o QR Code que aparece. Você também pode digitar no navegador o endereço exibido abaixo do QR Code.
3. Dica: use "Adicionar à tela inicial" para o garçom abrir com um toque.

Se não abrir, libere a porta 3000 no firewall do servidor. Fixe o IP do servidor no roteador,
assim o endereço nunca muda. Os dados móveis não atrapalham, mas se o celular insistir em usá-los
por a rede não ter internet, desligue-os.

## Fazer um pedido

Em **Novo pedido**, informe a **mesa** (obrigatória; o celular abre o teclado numérico), toque em
**Adicionar** nos itens e depois em **Enviar para a cozinha**. A comanda sai com a mesa em letra
grande, os itens e as observações, sem preços.

Se a conexão cair durante o envio, a tela não confirma nada. Antes de enviar de novo, confira na aba
**Pedidos** se ele já chegou.

## As três abas

- **Novo pedido:** mesa, cardápio com preços e envio. Aqui não existe botão de cancelar nem de reimprimir.
- **Pedidos:** tem o Ver comanda, o Reimprimir e o Cancelar. A bolinha vermelha na aba diz quantos
  pedidos ainda **não foram impressos**.
- **Cadastrar item:** coloca um item novo no cardápio.

Trocar de aba não perde o pedido em andamento, mas **recarregar a página perde**.

## Personalizar o pedido

Cada item do "Pedido" tem um campo de **observação**, por exemplo *sem verduras*, *queijo extra*
ou *ponto bem passado* (até 80 caracteres). Ela é salva junto com o pedido e sai impressa logo abaixo
do item, em negrito. Se só um entre vários itens iguais precisa ser diferente (2 sanduíches, um deles
sem verdura), use o botão **Separar 1**. A observação é só texto e não muda o preço do item.

## Cancelar pedido

- **Antes de registrar:** o botão **Limpar pedido** esvazia o que está na tela. Nada tinha sido salvo ainda.
- **Depois de registrar:** vá na aba "Pedidos" e use o botão vermelho **Cancelar**, que pede
  confirmação. O pedido **não é apagado**: continua no histórico como "Cancelado" (riscado), não pode
  mais ser reimpresso e deixa de contar como "não impresso". Se o papel já tinha saído, a página lembra
  você de **avisar a cozinha**, porque cancelar não imprime nada.

As cores dos botões têm um significado: verde confirma, azul adiciona, laranja reimprime, vermelho
cancela e cinza é neutro. Para trocar as cores, mexa só no bloco `:root` no topo de `pagina-web/estilo.css`.

## Ver a nota sem impressora (temporário)

Na aba "Pedidos", o botão **Ver comanda** abre uma prévia do recibo (título
centralizado, negrito, letra grande, linha de corte). Dá para abrir direto também, em
`http://IP-DO-SERVIDOR:3000/previa-nota/NUMERO`. É só uma aproximação visual e nada é impresso.
Quando a impressora chegar, apague os arquivos listados no topo de
`servidor/impressao/previa-temporaria.js`. O resto do sistema não depende deles.

## Impressora

Por padrão a impressão é **simulada**: em vez de sair no papel, cada papelzinho vira um arquivo em
`impressoes-simuladas/`. Para usar a impressora de verdade, inicie o servidor com estas variáveis de ambiente:

| Variável | Padrão | Para que serve |
|---|---|---|
| `IMPRESSORA_MODO` | `simulada` | `simulada` ou `rede` |
| `IMPRESSORA_ENDERECO` | `192.168.0.50` | IP da impressora Wi-Fi **ou** do notebook com o agente |
| `IMPRESSORA_PORTA` | `9100` | porta da impressora |
| `IMPRESSORA_SIMULAR_FALHA` | desligado | `1` finge que a impressora está desligada (para testar o aviso) |
| `PORTA` | `3000` | porta da página |

- Linux: `IMPRESSORA_MODO=rede IMPRESSORA_ENDERECO=192.168.0.21 npm start`
- Windows (cmd): `set IMPRESSORA_MODO=rede&& set IMPRESSORA_ENDERECO=192.168.0.21&& npm start`

Tem uma impressora USB ligada num notebook? O passo a passo está em `notebook-da-impressora/LEIA-ME.md`.
Para ajustar ao modelo da sua impressora, veja `servidor/impressao/ajustar-conforme-modelo/LEIA-ME.md`.

Se a impressora estiver desligada, o pedido **fica salvo como "Não impresso"** e a página avisa.
Quando ela voltar, use **Reimprimir** na aba "Pedidos".

## Testes

```
npm test
```
