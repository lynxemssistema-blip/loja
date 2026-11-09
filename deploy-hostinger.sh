#!/bin/bash
# ========================================================
# Deploy e Execução da Loja Lynx na Hostinger
# Domínio: loja.lynxems.com.br
# ========================================================

set -e

echo "🚀 Iniciando deploy da Loja Lynx..."

# Garante que está no diretório correto
cd "$(dirname "$0")"

echo "📦 Instalando dependências..."
npm install --omit=dev || npm install

echo "⚙️ Compilando Next.js para Produção..."
npm run build

echo "🔄 Reiniciando processo anterior..."
fuser -k 3000/tcp 2>/dev/null || true
pkill -f "node server.js" 2>/dev/null || true
sleep 1

echo "🟢 Iniciando servidor Node.js..."
export PORT=3000
export NODE_ENV=production
export NEXT_PUBLIC_APP_URL="https://loja.lynxems.com.br"

nohup node server.js > app.log 2>&1 &

sleep 2

if pgrep -f "node server.js" > /dev/null; then
  echo "✅ Sucesso! Loja Lynx rodando na porta 3000."
  echo "🌐 Acesse: https://loja.lynxems.com.br"
else
  echo "⚠️ Erro ao iniciar. Verifique app.log:"
  tail -n 20 app.log
fi
