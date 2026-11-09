# Parceiro Lynx - Catálogo de Produtos & Gestão de Leads (Asaas + Evolution API)

Plataforma integrada de catálogo de produtos com link de venda direta, gestão de permissões de envio (Opt-in / Opt-out WhatsApp) e integração com Asaas e Evolution API Multi-Instâncias.

## 🚀 Funcionalidades Principais

- **Catálogo Online de Produtos & Soluções (`/catalogo`):**
  - Vitrine pública responsiva para exibição de produtos (digitais, físicos, sistemas, serviços, etc.).
  - Links de checkout/venda direta (Kiwify, Hotmart, Eduzz, Asaas, WhatsApp, etc.).
  - Categorias dinâmicas com filtros interativos.

- **Gestão de Categorias:**
  - Cadastro de novas categorias diretamente pelo modal de produtos ou no gerenciador dedicado.
  - Sincronização automática entre o painel administrativo e a vitrine pública.

- **Central de Leads & WhatsApp (Evolution API):**
  - Conexão multi-instâncias da Evolution API.
  - Sincronização e unificação inteligente de contatos (separação automática de números repetidos vs. únicos).
  - Padronização e normalização do 9º dígito em todos os DDDs do Brasil.
  - Busca granular com campos separados (Nome, Telefone, Cargo, Empresa, E-mail).
  - Extração de membros de grupos do WhatsApp.
  - Enriquecimento de perfil (foto, bio, cargo, redes sociais).

- **Compliance e Regra de 25 Horas para Promoções:**
  - Disparo de mensagem de apresentação com link do catálogo.
  - Aceite tácito após 24 horas caso o contato não responda "PARAR".
  - Bloqueio imediato e definitivo de descadastramento (Opt-out) com "PARAR", "PARE" ou "SAIR".
  - **Regra das 25 Horas:** A primeira oferta promocional só pode ser disparada quando decorridas no mínimo 25 horas após o envio do convite inicial, e exclusivamente para quem não pediu para parar.
  - Trava de segurança: disparos restritos estritamente à instância dedicada `Vendas Lynx`.

- **Financeiro & Split de Pagamentos (Asaas):**
  - Gestão de saldo, extrato e conciliação de recebimentos via Asaas.
  - Divisão de lucros (splits) e dedução automatizada de despesas.

## 🛠️ Tecnologias Utilizadas

- **Next.js 15 (App Router)**
- **TypeScript & React**
- **Tailwind CSS & Lucide Icons**
- **Supabase (PostgreSQL na VPS)**
- **Evolution API v1/v2**
- **Asaas API v3**

## ⚙️ Configuração & Execução

1. Clone o repositório:
```bash
git clone https://github.com/lynxemssistema-blip/loja.git
cd loja
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente baseando-se no `.env.example`:
```bash
cp .env.example .env.local
```

4. Execute em modo desenvolvimento:
```bash
npm run dev
```

5. Ou execute a versão otimizada de produção:
```bash
npm run build
npm start
```
