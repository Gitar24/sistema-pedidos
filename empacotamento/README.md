# Gerar os instaladores do Comandas

Em um ambiente Linux com Node.js e npm, Go 1.22+, curl e sha256sum, execute
`bash empacotamento/gerar.sh`. Para um único alvo, acrescente `linux` ou `windows`.
O alvo Linux também usa `dpkg-deb`, tar e xz. O alvo Windows usa NSIS 3 e unzip.
É possível passar o caminho do compilador NSIS em `MAKENSIS`.

A primeira compilação baixa o Node.js oficial e confere os SHA-256 fixados no script.
O npm instala as dependências de produção pelo `package-lock.json` e o Go usa as
dependências fixadas no módulo do atalho. Os pacotes incluem o runtime e as
bibliotecas usadas pelo Comandas. O computador do cliente dispensa npm, Go e NSIS.

A versão vem de `package.json`, com a opção de usar `VERSAO_COMANDAS` no formato
`X.Y.Z` para gerar outra versão. Os arquivos e a lista de hashes saem em `dist/`,
ou em `DESTINO` se definido. O cache de downloads pode ser configurado com
`CACHE_COMANDAS`.

O Windows usa um serviço automático hospedado pelo executável do atalho, sob a conta
LocalService, com acesso aos arquivos via SID específico do serviço. O Linux usa
systemd com usuário dinâmico e um socket gerenciado na porta 3000. Os atalhos só abrem o
navegador após o endpoint local de prontidão identificar o Comandas.

O [guia para o restaurante](GUIA.md) cobre instalação, QR Code, firewall e suporte.

## Validação desta entrega

- **Debian 12.15 e Ubuntu 24.04.5 LTS, amd64.** Em contêineres com systemd, a
  instalação funcionou com a rede desativada. O atalho executado por uma conta
  sem privilégios ativou o serviço parado e reutilizou o mesmo processo quando
  ele já estava ativo. O teste interceptou a chamada ao navegador padrão.
  A atualização de 0.1.0 para 0.1.1 manteve pedido, cardápio e configuração.
  O serviço iniciou ao reiniciar os contêineres, antes de abrir o atalho.
  A remoção padrão preservou os dados nos dois sistemas. No Debian, também foram
  verificadas as mensagens para porta ocupada e falha na inicialização.
- **QR Code.** Em uma rede isolada, um segundo contêiner decodificou o QR gerado
  pelo servidor e abriu o endereço codificado. Falta validar a leitura pela
  câmera de um celular e as regras de firewall no Wi-Fi do estabelecimento.
- **Windows 10 e 11, x64.** O instalador foi compilado e o arquivo foi verificado.
  Falta rodar o instalador nessas versões, verificar os atalhos com conta padrão,
  reiniciar a máquina e conferir atualização e desinstalação com o serviço instalado.

Também falta verificar a instalação gráfica do `.deb` e a abertura em um navegador
real em um desktop Debian ou Ubuntu.
