# ========================================================
# Dockerfile Standalone para Deploy na Hostinger (VPS / EasyPanel / Dokku)
# Domínio: loja.lynxems.com.br
# ========================================================

FROM node:20-alpine AS base

# Dependências
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public 2>/dev/null || true

# Copia build standalone e assets estáticos
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Cria diretório de persistência de dados local se necessário
RUN mkdir -p /app/.data && chown -R nextjs:nodejs /app/.data

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
