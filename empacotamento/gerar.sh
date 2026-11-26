#!/usr/bin/env bash
set -euo pipefail
umask 022

cd "$(dirname "$0")/.."
raiz=$PWD
destino=${DESTINO:-$raiz/dist}
cache=${CACHE_COMANDAS:-${XDG_CACHE_HOME:-$HOME/.cache}/comandas-pacotes}
versao=${VERSAO_COMANDAS:-$(node -p "require('./package.json').version")}
alvo=${1:-todos}
if [[ ! $versao =~ ^[0-9]+\.[0-9]+\.[0-9]+$ || ! $alvo =~ ^(linux|windows|todos)$ ]]; then
  echo 'Uso: bash empacotamento/gerar.sh [linux|windows|todos]. A versão deve usar três números.' >&2
  exit 2
fi
mkdir -p "$destino" "$cache"
destino=$(realpath "$destino")
cache=$(realpath "$cache")
temporaria=$(mktemp -d)
trap 'rm -rf -- "$temporaria"' EXIT

node_versao=v22.23.5
baixar_node() {
  local nome="node-$node_versao-$1" hash=$2
  if [[ ! -f $cache/$nome ]] || ! (cd "$cache" && echo "$hash  $nome" | sha256sum --check --status); then
    curl --fail --silent --show-error --location --retry 3 \
      "https://nodejs.org/dist/$node_versao/$nome" --output "$temporaria/$nome"
    echo "$hash  $temporaria/$nome" | sha256sum --check
    mv "$temporaria/$nome" "$cache/$nome"
  fi
}

mkdir "$temporaria/base"
cp -R servidor pagina-web package.json package-lock.json "$temporaria/base/"
cp empacotamento/impressora-padrao.env "$temporaria/base/"
(cd "$temporaria/base" && npm ci --omit=dev --ignore-scripts --no-audit --no-fund)

compilar_atalho() {
  (cd "$raiz/empacotamento/launcher" && CGO_ENABLED=0 GOOS="$1" GOARCH=amd64 \
    go build -trimpath -buildvcs=false -ldflags "$3" -o "$2" .)
}

if [[ $alvo == linux || $alvo == todos ]]; then
  baixar_node linux-x64.tar.xz cdeb8670a0c81f51b4dc4ac61919f9b1ad917b304bf8221eb939570663d240f8
  tar -xJf "$cache/node-$node_versao-linux-x64.tar.xz" -C "$temporaria" \
    "node-$node_versao-linux-x64/bin/node" "node-$node_versao-linux-x64/LICENSE"
  pacote=$temporaria/deb
  install -d "$pacote/DEBIAN" "$pacote/opt"
  cp -R "$temporaria/base" "$pacote/opt/comandas"
  install -m 0755 "$temporaria/node-$node_versao-linux-x64/bin/node" "$pacote/opt/comandas/node"
  install -m 0644 "$temporaria/node-$node_versao-linux-x64/LICENSE" "$pacote/opt/comandas/LICENSE-Node.js"
  compilar_atalho linux "$pacote/opt/comandas/comandas" '-s -w'
  install -Dm644 empacotamento/impressora-padrao.env "$pacote/etc/comandas/impressora.env"
  install -Dm644 empacotamento/linux/comandas.desktop "$pacote/usr/share/applications/comandas.desktop"
  install -Dm644 empacotamento/linux/comandas.svg "$pacote/usr/share/icons/hicolor/scalable/apps/comandas.svg"
  for unidade in comandas.service comandas.socket; do
    install -Dm644 "empacotamento/linux/$unidade" "$pacote/lib/systemd/system/$unidade"
  done
  for script in postinst prerm postrm; do
    install -m 0755 "empacotamento/linux/$script" "$pacote/DEBIAN/$script"
  done
  printf '%s\n' /etc/comandas/impressora.env > "$pacote/DEBIAN/conffiles"
  cat > "$pacote/DEBIAN/control" <<EOF
Package: comandas
Version: $versao
Architecture: amd64
Section: misc
Priority: optional
Maintainer: Comandas
Installed-Size: $(du -sk "$pacote" | cut -f1)
Depends: libc6 (>= 2.28), libstdc++6, libgcc-s1, systemd (>= 240), init-system-helpers, xdg-utils
Description: Comandas para a cozinha em rede local
 Servidor de pedidos com atalho gráfico e impressão ESC/POS.
EOF
  dpkg-deb --root-owner-group --build "$pacote" "$destino/comandas_${versao}_amd64.deb"
fi

if [[ $alvo == windows || $alvo == todos ]]; then
  baixar_node win-x64.zip 4a191082e9706866830379d577d2cc8a50c776fcd9436a8d061b063ed0d9a0e3
  unzip -q "$cache/node-$node_versao-win-x64.zip" \
    "node-$node_versao-win-x64/node.exe" "node-$node_versao-win-x64/LICENSE" -d "$temporaria"
  pacote=$temporaria/windows
  cp -R "$temporaria/base" "$pacote"
  install -m 0644 "$temporaria/node-$node_versao-win-x64/node.exe" "$pacote/node.exe"
  install -m 0644 "$temporaria/node-$node_versao-win-x64/LICENSE" "$pacote/LICENSE-Node.js"
  compilar_atalho windows "$pacote/Comandas.exe" '-s -w -H windowsgui'
  "${MAKENSIS:-makensis}" -V2 "-DCONTEUDO=$pacote" "-DVERSAO=$versao" \
    "-DSAIDA=$destino/Comandas-$versao-x64.exe" empacotamento/windows/comandas.nsi
fi

arquivos=()
[[ $alvo == windows ]] || arquivos+=("comandas_${versao}_amd64.deb")
[[ $alvo == linux ]] || arquivos+=("Comandas-$versao-x64.exe")
(cd "$destino" && sha256sum "${arquivos[@]}" | tee "SHA256-$versao-$alvo.txt")
