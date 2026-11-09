-- ============================================================================
-- PARCEIRO LYNX - SCHEMA SQL ISOLADO E BLINDADO (RLS ATIVO) PARA SUPABASE VPS
-- SuperAdmin exclusivo: edsonmanoel2012@gmail.com
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Schema dedicado opcional para isolamento lógico adicional
CREATE SCHEMA IF NOT EXISTS parceiro_lynx;

-- 1. USUÁRIOS E PARCEIROS
CREATE TABLE IF NOT EXISTS public.lynx_users (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('SUPERADMIN', 'PARTNER')),
  pix_key TEXT,
  document TEXT,
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. GRUPOS DE CLIENTES DO ASAAS
CREATE TABLE IF NOT EXISTS public.lynx_groups (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  asaas_group_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  calculation_base TEXT NOT NULL DEFAULT 'RECEIVED_GROSS' CHECK (calculation_base IN ('RECEIVED_GROSS', 'ASAAS_NET')),
  deduct_asaas_fees BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. REGRAS DE DEDUÇÃO POR GRUPO (Ex: 32% Impostos, 15% Operação/Infraestrutura)
CREATE TABLE IF NOT EXISTS public.lynx_group_deductions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  group_id TEXT NOT NULL REFERENCES public.lynx_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'PERCENTAGE' CHECK (type IN ('PERCENTAGE', 'FIXED')),
  value NUMERIC(10, 2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. DIVISÃO DO VALOR LÍQUIDO (SPLIT PAYMENT / PARTICIPAÇÃO POR PARCEIRO)
CREATE TABLE IF NOT EXISTS public.lynx_group_splits (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  group_id TEXT NOT NULL REFERENCES public.lynx_groups(id) ON DELETE CASCADE,
  partner_id TEXT NOT NULL REFERENCES public.lynx_users(id) ON DELETE CASCADE,
  partner_label TEXT NOT NULL,
  percentage NUMERIC(5, 2) NOT NULL DEFAULT 50.00,
  can_view_group BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, partner_id)
);

-- 5. OUTRAS DESPESAS / CUSTOS DA OPERAÇÃO LANÇADOS PELO SUPERADMIN
CREATE TABLE IF NOT EXISTS public.lynx_expenses (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  group_id TEXT NOT NULL REFERENCES public.lynx_groups(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Operação',
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  reference_month TEXT NOT NULL, -- Formato YYYY-MM
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by TEXT DEFAULT 'edsonmanoel2012@gmail.com',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. COBRANÇAS / VENDAS SINCRONIZADAS DO ASAAS POR GRUPO
CREATE TABLE IF NOT EXISTS public.lynx_payments (
  id TEXT PRIMARY KEY,
  asaas_payment_id TEXT UNIQUE NOT NULL,
  group_id TEXT NOT NULL REFERENCES public.lynx_groups(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  description TEXT,
  billing_type TEXT NOT NULL DEFAULT 'PIX',
  status TEXT NOT NULL DEFAULT 'RECEIVED',
  gross_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  asaas_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  net_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_date DATE,
  due_date DATE NOT NULL,
  reference_month TEXT NOT NULL, -- Formato YYYY-MM
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. CONTROLE DE REPASSES / PAGAMENTOS DE SPLIT AOS PARCEIROS
CREATE TABLE IF NOT EXISTS public.lynx_payouts (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  group_id TEXT NOT NULL REFERENCES public.lynx_groups(id) ON DELETE CASCADE,
  partner_id TEXT NOT NULL REFERENCES public.lynx_users(id) ON DELETE CASCADE,
  reference_month TEXT NOT NULL,
  calculated_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID')),
  paid_at TIMESTAMPTZ,
  receipt_note TEXT,
  UNIQUE(group_id, partner_id, reference_month)
);

-- 8. CLIENTES SINCRONIZADOS DO ASAAS POR GRUPO
CREATE TABLE IF NOT EXISTS public.lynx_customers (
  id TEXT PRIMARY KEY,
  asaas_customer_id TEXT UNIQUE NOT NULL,
  group_id TEXT NOT NULL REFERENCES public.lynx_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cpf_cnpj TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. CONFIGURAÇÕES DO SISTEMA
CREATE TABLE IF NOT EXISTS public.lynx_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. INSTÂNCIAS DA EVOLUTION API
CREATE TABLE IF NOT EXISTS public.lynx_evolution_instances (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  server_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  status TEXT DEFAULT 'unknown',
  phone_number TEXT,
  profile_name TEXT,
  profile_picture_url TEXT,
  contacts_count INT DEFAULT 0,
  last_sync TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. CONTATOS CONSOLIDADOS E UNIFICADOS DAS INSTÂNCIAS
CREATE TABLE IF NOT EXISTS public.lynx_evolution_contacts (
  id TEXT PRIMARY KEY, -- número normalizado (apenas dígitos)
  phone TEXT NOT NULL,
  formatted_phone TEXT NOT NULL,
  name TEXT NOT NULL,
  push_name TEXT,
  email TEXT,
  ddd TEXT,
  state_uf TEXT,
  city TEXT,
  job_title TEXT,
  company TEXT,
  about_bio TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  is_national BOOLEAN NOT NULL DEFAULT true,
  country_code TEXT NOT NULL DEFAULT '55',
  country_name TEXT NOT NULL DEFAULT 'Brasil',
  instances TEXT[] NOT NULL DEFAULT '{}',
  instances_count INT NOT NULL DEFAULT 1,
  is_repeated BOOLEAN NOT NULL DEFAULT false,
  source_type TEXT NOT NULL DEFAULT 'DIRECT_CONTACT',
  source_groups TEXT[] DEFAULT '{}',
  is_business BOOLEAN NOT NULL DEFAULT false,
  business_category TEXT,
  notes TEXT,
  profile_picture_url TEXT,
  has_valid_name BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ISOLAMENTO E SEGURANÇA (RLS - ROW LEVEL SECURITY)
-- Bloqueia acesso anônimo público; apenas a API do Parceiro Lynx (service_role)
-- tem acesso total às tabelas financeiras.
-- ============================================================================

ALTER TABLE public.lynx_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lynx_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lynx_group_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lynx_group_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lynx_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lynx_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lynx_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lynx_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lynx_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lynx_evolution_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lynx_evolution_contacts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.lynx_users FROM anon;
REVOKE ALL ON public.lynx_groups FROM anon;
REVOKE ALL ON public.lynx_group_deductions FROM anon;
REVOKE ALL ON public.lynx_group_splits FROM anon;
REVOKE ALL ON public.lynx_expenses FROM anon;
REVOKE ALL ON public.lynx_payments FROM anon;
REVOKE ALL ON public.lynx_payouts FROM anon;
REVOKE ALL ON public.lynx_customers FROM anon;
REVOKE ALL ON public.lynx_settings FROM anon;
REVOKE ALL ON public.lynx_evolution_instances FROM anon;
REVOKE ALL ON public.lynx_evolution_contacts FROM anon;

-- ============================================================================
-- SEED INICIAL: SUPERADMIN + PARCEIRO EXEMPLO + GRUPO HOREB (32% + 15% + 50/50)
-- ============================================================================

INSERT INTO public.lynx_users (id, name, email, password, role, pix_key, document, phone)
VALUES
  ('usr-superadmin', 'Edson Manoel (SuperAdmin)', 'edsonmanoel2012@gmail.com', 'admin123', 'SUPERADMIN', 'edsonmanoel2012@gmail.com', '000.000.000-00', '(11) 99999-0000'),
  ('usr-parceiro-horeb', 'Parceiro Grupo Horeb', 'horeb@grupohoreb.com.br', 'horeb123', 'PARTNER', 'financeiro@grupohoreb.com.br', '12.345.678/0001-90', '(11) 98888-1111')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.lynx_groups (id, asaas_group_name, display_name, description, calculation_base, deduct_asaas_fees)
VALUES
  ('grp-horeb', 'horeb', 'Grupo Horeb', 'Operação Grupo Horeb com 32% Impostos, 15% Infraestrutura/Operação e divisão 50%/50% do líquido', 'ASAAS_NET', true)
ON CONFLICT (id) DO NOTHING;
