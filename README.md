# Sistema de pedidos (rede local, sem internet)

Um computador fixo é o **servidor**. Os funcionários abrem a página pelo navegador dos
notebooks, na mesma rede Wi-Fi. Cada pedido imprime um papelzinho (padrão ESC/POS).

## Mapa das pastas

```
sistema-pedidos/
├── servidor/                      roda no computador fixo          → servidor/LEIA-ME.md
│   ├── iniciar.js                 ponto de partida (npm start)
│   ├── configuracoes.js           porta, arquivos, modo da impressora
│   ├── rotas/                     endereços da API (cardápio e pedidos)
│   ├── banco-de-dados/            SQLite: tabelas, consultas, cardápio de exemplo
│   └── impressao/                 papelzinho ESC/POS
│       └── ajustar-conforme-modelo/   ⚠ o que muda com o modelo da impressora
├── pagina-web/                    a tela que os funcionários usam
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
2. Com internet, uma única vez, dentro da pasta do projeto: `npm install`
   Depois disso não precisa mais de internet. Se o servidor nunca tiver internet, rode
   `npm install` em outra máquina e copie a pasta inteira, junto com `node_modules`.

## Iniciar

```
npm start
```

O terminal mostra o endereço de acesso, por exemplo `http://192.168.0.10:3000`.
Na primeira vez, o banco é criado já com um **cardápio de exemplo**.

> **Depois de atualizar o código, reinicie o servidor** (`Ctrl+C` no terminal e `npm start` de novo).
> O Node não recarrega sozinho: a página nova aparece ao recarregar o navegador, mas as funções novas do
> servidor só existem depois de reiniciar.

## Acessar pelos notebooks

Conecte o notebook ao mesmo Wi-Fi e abra no navegador o endereço mostrado no terminal.
Se não abrir, libere a porta 3000 no firewall do servidor. Dica: fixe o IP do servidor
no roteador para o endereço não mudar.

## As três abas

- **Novo pedido:** escolher itens, personalizar e registrar. Não tem nenhum botão de cancelar ou reimprimir.
- **Pedidos recentes:** Ver nota, Reimprimir e Cancelar. A bolinha vermelha na aba mostra quantos pedidos
  ainda **não foram impressos**. Os botões ficam aqui, separados, para ninguém clicar sem querer durante o atendimento.
- **Cadastrar item:** inclui um item novo no cardápio.

O pedido que está sendo montado **não se perde** ao trocar de aba.

## Personalizar o pedido

Cada item do "Pedido atual" tem um campo de **observação** (ex.: *sem verduras*, *queijo extra*,
*ponto bem passado*, até 80 caracteres). A observação é salva no pedido e sai impressa logo abaixo do
item, em negrito. Para personalizar só 1 de vários itens iguais (2 sanduíches, 1 sem verdura),
use o botão **Separar 1**. A observação é só texto: não altera o preço do item.

## Cancelar pedido

- **Antes de registrar:** o botão **Limpar pedido** esvazia o que está sendo montado (nada foi salvo ainda).
- **Depois de registrar:** em "Pedidos recentes", o botão vermelho **Cancelar** (pede confirmação).
  O pedido **não é apagado**: fica no histórico com a situação "Cancelado" (riscado), não pode mais ser
  reimpresso e não aparece como "não impresso". Se o papel já tinha sido impresso, a página avisa
  para **avisar a cozinha**, porque o cancelamento não imprime nada.

Cores dos botões: verde = confirmar, azul = adicionar, laranja = reimprimir, vermelho = cancelar,
cinza = neutro. Para trocar as cores, edite só o bloco `:root` no topo de `pagina-web/estilo.css`.

## Ver a nota sem impressora (temporário)

Em "Pedidos recentes", o botão **Ver nota** abre o recibo como ele sairia no papel (centralizado,
negrito, tamanho dobrado, corte). Também dá para abrir direto: `http://IP-DO-SERVIDOR:3000/previa-nota/NUMERO`.
É só uma aproximação visual, nada é impresso. Para remover quando tiver a impressora, apague os arquivos
listados no topo de `servidor/impressao/previa-temporaria.js`; o resto do sistema não depende deles.

## Impressora

Por padrão a impressão é **simulada**: cada papelzinho vira um arquivo em `impressoes-simuladas/`.
Para a impressora real, inicie com variáveis de ambiente:

| Variável | Padrão | Para que serve |
|---|---|---|
| `IMPRESSORA_MODO` | `simulada` | `simulada` ou `rede` |
| `IMPRESSORA_ENDERECO` | `192.168.0.50` | IP da impressora Wi-Fi **ou** do notebook com o agente |
| `IMPRESSORA_PORTA` | `9100` | porta da impressora |
| `IMPRESSORA_SIMULAR_FALHA` | — | `1` finge impressora desligada (para testar o aviso) |
| `PORTA` | `3000` | porta da página |

- Linux: `IMPRESSORA_MODO=rede IMPRESSORA_ENDERECO=192.168.0.21 npm start`
- Windows (cmd): `set IMPRESSORA_MODO=rede&& set IMPRESSORA_ENDERECO=192.168.0.21&& npm start`

Impressora USB num notebook: veja `notebook-da-impressora/LEIA-ME.md`.
Modelo da impressora: veja `servidor/impressao/ajustar-conforme-modelo/LEIA-ME.md`.

Se a impressora estiver desligada, o pedido **fica salvo como "Não impresso"** e a página avisa.
Use **Reimprimir** em "Pedidos recentes" quando ela voltar.

## Testes

```
npm test
```
