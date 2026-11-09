#!/bin/bash
# ========================================================
# Deploy e Execução da Loja Lynx na Hostinger
# Domínio: loja.lynxems.com.br
# Porta Interna: 31501
# ========================================================

set -e

echo "🚀 Iniciando deploy da Loja Lynx..."

export PATH="/opt/alt/alt-nodejs20/root/usr/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

cd "$(dirname "$0")"

# 1. Copia static e public para dentro de standalone
if [ -d ".next/static" ]; then
  mkdir -p .next/standalone/.next
  cp -ru .next/static .next/standalone/.next/
fi

if [ -d "public" ]; then
  cp -ru public .next/standalone/
fi

# 2. Mata processos anteriores na porta 31501
echo "🔄 Liberando porta 31501..."
fuser -k 31501/tcp 2>/dev/null || true
pkill -f "PORT=31501" 2>/dev/null || true
pkill -f "node server.js" 2>/dev/null || true
sleep 1

# 3. Inicia servidor em background
echo "🟢 Subindo servidor Lynx na porta 31501..."
export PORT=31501
export HOSTNAME=127.0.0.1
export NODE_ENV=production
export NEXT_PUBLIC_APP_URL="https://loja.lynxems.com.br"

nohup node server.js > app.log 2>&1 &

sleep 3

if pgrep -f "server.js" > /dev/null; then
  echo "✅ Sucesso! Loja Lynx rodando na porta 31501."
  echo "🌐 Acesse: https://loja.lynxems.com.br"
else
  echo "⚠️ Erro ao iniciar. Verifique app.log:"
  tail -n 30 app.log
fi
