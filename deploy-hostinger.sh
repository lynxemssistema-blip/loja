#!/bin/bash
# ========================================================
# Deploy e Execução da Loja Lynx na Hostinger
# Domínio: loja.lynxems.com.br
# ========================================================

set -e

echo "🚀 Iniciando deploy da Loja Lynx..."

export PATH="/opt/alt/alt-nodejs20/root/usr/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

cd "$(dirname "$0")"

if [ -f "next-build.tar.gz" ]; then
  echo "📦 Descompactando build otimizado de produção..."
  tar -xzf next-build.tar.gz
  rm -f next-build.tar.gz
fi

echo "🔄 Reiniciando processo Node.js na porta 3005..."
fuser -k 3005/tcp 2>/dev/null || true
pkill -f "PORT=3005" 2>/dev/null || true
sleep 1

echo "🟢 Subindo servidor Lynx..."
export PORT=3005
export NODE_ENV=production
export NEXT_PUBLIC_APP_URL="https://loja.lynxems.com.br"

nohup node server.js > app.log 2>&1 &

sleep 3

if pgrep -f "server.js" > /dev/null; then
  echo "✅ Sucesso! Loja Lynx rodando na porta 3005."
  echo "🌐 Acesse: https://loja.lynxems.com.br"
else
  echo "⚠️ Erro ao iniciar. Verifique app.log:"
  tail -n 30 app.log
fi
