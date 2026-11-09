# Guia de Publicação na Hostinger — Loja Oficial Lynx
**Domínio:** `loja.lynxems.com.br`  
**Repositório Oficial:** `https://github.com/lynxemssistema-blip/loja.git`  
**Branch:** `main`

---

## Opção 1: Deploy no Painel Hostinger (hPanel / Hospedagem Node.js)

1. Acesse o **hPanel da Hostinger**.
2. Vá em **Avançado > Aplicação Node.js** (ou pesquise por *Node.js*).
3. Clique em **Criar Aplicação** e preencha:
   - **Versão do Node.js:** `20.x`
   - **Modo da Aplicação:** `Production`
   - **Raiz do Aplicativo:** `/public_html` (ou a pasta do seu subdomínio `loja.lynxems.com.br`)
   - **URL do Aplicativo:** `loja.lynxems.com.br`
   - **Arquivo de Inicialização do Aplicativo:** `server.js`
4. Conecte o repositório Git:
   - Em **Git**, adicione o repositório: `https://github.com/lynxemssistema-blip/loja.git`
   - Selecione a branch `main`.
5. Em **Variáveis de Ambiente**, adicione:
   - `NEXT_PUBLIC_APP_URL` = `https://loja.lynxems.com.br`
   - `NODE_ENV` = `production`
   - `PORT` = `3000`
   - `NEXT_PUBLIC_SUPABASE_URL` = sua URL do Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = sua anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = sua service role key
   - `ASAAS_API_URL` = `https://api.asaas.com/v3`
   - `ASAAS_API_KEY` = sua chave de API Asaas
   - `SUPERADMIN_EMAIL` = `edsonmanoel2012@gmail.com`
6. Clique em **Executar Build**:
   ```bash
   npm install
   npm run build
   ```
7. Inicie o aplicativo. O app estará no ar com SSL ativo em [https://loja.lynxems.com.br](https://loja.lynxems.com.br)!

---

## Opção 2: Deploy na VPS Hostinger (com Docker / EasyPanel / Dokku)

Se você utiliza VPS na Hostinger com EasyPanel ou Docker, o projeto já inclui `Dockerfile` e `docker-compose.yml`:

```bash
# 1. Clone o repositório
git clone https://github.com/lynxemssistema-blip/loja.git
cd loja

# 2. Configure o .env.local baseado no .env.example
cp .env.example .env.local

# 3. Suba o container
docker compose up -d --build
```
