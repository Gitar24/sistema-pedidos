# Comandas no restaurante

## Instalar e abrir

| Sistema | O que fazer |
|---|---|
| Windows 10 ou 11, 64 bits | Abra o arquivo **Comandas-…-x64.exe** e autorize a instalação. Depois, abra **Comandas** na área de trabalho ou no menu Iniciar. O instalador desta entrega é sem assinatura digital. |
| Debian ou Ubuntu, 64 bits | Abra o arquivo **comandas_…_amd64.deb** com o instalador gráfico de pacotes do sistema, como Software ou GDebi. Escolha **Instalar** e autorize com a senha do computador. Depois procure **Comandas** no menu de aplicativos. |

O Node.js e as bibliotecas do Comandas já vêm no pacote. No Linux, o computador precisa ter
um ambiente gráfico com navegador, instalador de pacotes e systemd. Em uma instalação mínima,
o responsável pelo computador deve preparar esses componentes antes de ficar sem internet.

O serviço inicia com o computador. O atalho abre o Comandas no navegador padrão e espera o
serviço responder se ainda estiver iniciando. Para testar com pedidos fictícios, use
**Demonstração do Comandas** no menu Iniciar do Windows ou **Abrir demonstração** nas ações
do ícone Comandas no Linux. A demonstração usa a porta 3001, dados temporários e impressão simulada.

## Conectar os celulares

1. Conecte o computador e os celulares à mesma rede do estabelecimento.
2. No computador, clique em **Abrir no celular**. Escaneie o QR Code com a câmera
   do celular. Se houver mais de um endereço, selecione o da rede do restaurante.
3. Se quiser, adicione a página à tela inicial do celular pelo menu do navegador.

Se a página abre no computador, mas o celular não conecta, confira se a rede de visitantes
isola os aparelhos e se o firewall do computador aceita **TCP 3000 de entrada na rede local**.
Para conectar celulares ao modo demonstração, use a porta 3001.

- **Windows.** Abra **Firewall do Windows Defender com Segurança Avançada** no menu
  Iniciar. Em **Regras de Entrada**, escolha **Nova Regra**, **Porta**, **TCP** e informe
  **3000**. Permita a conexão no perfil **Privado**. Nas propriedades da regra, em
  **Escopo**, restrinja os endereços remotos à **Sub-rede local**.
- **Debian e Ubuntu.** No gerenciador de firewall do computador, adicione uma regra de
  **entrada TCP** para a porta **3000**, com origem limitada à sub-rede do restaurante.
  Por exemplo, em uma rede `192.168.1.x` com máscara `255.255.255.0`, use
  `192.168.1.0/24`. Se houver um administrador responsável pelo firewall, passe a ele
  esses dados. Evite publicar a porta no roteador.

## Impressora, atualização e suporte

A instalação nova usa impressão simulada. Para impressora de rede ou agente USB já configurado,
o administrador pode editar o arquivo `impressora.env`, trocar `IMPRESSORA_MODO` para `rede`,
informar o IP em `IMPRESSORA_ENDERECO` e reiniciar o computador.

| Arquivo | Windows | Debian e Ubuntu |
|---|---|---|
| Banco de dados | `%ProgramData%\Comandas\dados\pedidos.db` | `/var/lib/comandas/pedidos.db` |
| Configuração da impressora | `%ProgramData%\Comandas\impressora.env` | `/etc/comandas/impressora.env` |
| Log principal | `%ProgramData%\Comandas\logs\servidor.log` | `/var/log/comandas/erros.log` |

Instale a nova versão sobre a atual. O instalador reutiliza os pedidos, o cardápio e a configuração.
No Windows, se tiver aberto a demonstração, reinicie o computador antes de atualizar.
Se já usava o projeto executado diretamente do código, peça ao responsável pela instalação
para migrar o banco e as configurações da pasta antiga.
Para desinstalar, use **Aplicativos instalados** no Windows ou **Remover** no gerenciador
de pacotes do Linux. A remoção padrão preserva os arquivos acima. No Linux, use a remoção comum
para preservar também o arquivo de configuração.

Se o atalho avisar que a porta está ocupada, feche o programa que usa a porta 3000 ou peça
ajuda ao responsável pelo computador. Se o serviço falhar, informe a mensagem da tela e a
localização do log. Falhas anteriores à criação do log podem aparecer no **Visualizador de
Eventos** do Windows ou no **Jornal do sistema** do Linux.
