export type UserRole = "SUPERADMIN" | "PARTNER";

export interface LynxUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  pix_key: string;
  document: string;
  phone: string;
  active: boolean;
  created_at: string;
}

export type CalculationBase = "RECEIVED_GROSS" | "ASAAS_NET";

export interface LynxGroup {
  id: string;
  asaas_group_name: string;
  display_name: string;
  description: string;
  calculation_base: CalculationBase;
  deduct_asaas_fees: boolean;
  active: boolean;
  created_at: string;
}

export type DeductionType = "PERCENTAGE" | "FIXED";

export interface LynxGroupDeduction {
  id: string;
  group_id: string;
  name: string;
  type: DeductionType;
  value: number; // ex: 32 para 32% ou valor fixo em R$
  sort_order: number;
  active: boolean;
}

export interface LynxGroupSplit {
  id: string;
  group_id: string;
  partner_id: string;
  partner_label: string;
  percentage: number; // ex: 50 para 50%
  can_view_group: boolean;
}

export interface LynxExpense {
  id: string;
  group_id: string;
  description: string;
  category: string;
  amount: number;
  reference_month: string; // YYYY-MM
  expense_date: string; // YYYY-MM-DD
  notes?: string;
  created_by: string;
  created_at: string;
}

export type BillingType = "PIX" | "BOLETO" | "CREDIT_CARD" | "UNDEFINED";
export type PaymentStatus = "RECEIVED" | "CONFIRMED" | "PENDING" | "OVERDUE";

export interface LynxPayment {
  id: string;
  asaas_payment_id: string;
  group_id: string;
  customer_id: string;
  customer_name: string;
  description: string;
  billing_type: BillingType;
  status: PaymentStatus;
  gross_value: number; // Valor cobrado/pago pelo cliente (após desconto na cobrança)
  discount_value: number; // Desconto concedido na cobrança
  asaas_fee: number; // Taxa do Asaas
  net_value: number; // Valor líquido creditado pelo Asaas
  payment_date?: string;
  due_date: string;
  reference_month: string; // YYYY-MM
}

export interface LynxCustomer {
  id: string;
  asaas_customer_id: string;
  group_id: string;
  name: string;
  cpf_cnpj?: string;
  email?: string;
  phone?: string;
  created_at: string;
}

export interface EvolutionInstance {
  id: string;
  name: string; // nome da instância na Evolution API (ex: "horeb", "lynx")
  server_url: string; // URL base da Evolution (ex: "https://api-whatsapp.suavps.com")
  api_key: string; // Token da instância ou API Key global
  status?: "open" | "close" | "connecting" | "unknown";
  phone_number?: string;
  profile_name?: string;
  profile_picture_url?: string;
  contacts_count?: number;
  last_sync?: string;
  active: boolean;
  created_at: string;
}

export interface EvolutionContact {
  id: string; // número normalizado (apenas dígitos)
  phone: string; // ex: 5511999999999
  formatted_phone: string; // ex: +55 (11) 99999-9999
  name: string; // Nome limpo/válido ou enriquecido
  push_name?: string;
  email?: string; // E-mail do contato (cruzado com Asaas, WhatsApp Business ou inserido)
  ddd?: string; // DDD brasileiro (ex: "11", "21", "31")
  state_uf?: string; // Estado (ex: "SP", "RJ", "MG")
  job_title?: string; // Cargo de trabalho / Profissão
  company?: string; // Empresa / Negócio
  about_bio?: string; // Recado / Status / Bio do WhatsApp
  is_business?: boolean; // Se é conta comercial / WhatsApp Business
  business_category?: string; // Categoria do negócio
  social_links?: {
    instagram?: string;
    linkedin?: string;
    facebook?: string;
    website?: string;
  };
  city?: string; // Cidade/Região inferida do DDD ou inserida
  source_type: "DIRECT_CONTACT" | "GROUP_MEMBER"; // Origem: Contato da Agenda ou Membro de Grupo
  source_groups?: string[]; // Nomes dos grupos de onde este contato foi extraído
  is_national: boolean; // DDI +55 (Brasil)
  country_code: string; // ex: "55", "1", "351"
  country_name: string; // ex: "Brasil", "Estados Unidos", etc.
  instances: string[]; // Nomes das instâncias onde este contato aparece
  instances_count: number;
  is_repeated: boolean; // TRUE se o número repete em 2 ou mais instâncias
  profile_picture_url?: string;
  has_valid_name: boolean;
  notes?: string;
  // Gestão de Consentimento / Opt-in / Opt-out ("PARAR")
  consent_status?: "NOT_CONTACTED" | "PENDING" | "OPTED_IN" | "OPTED_OUT";
  consent_requested_at?: string; // Data em que o convite com 'PARAR' foi enviado
  consent_updated_at?: string; // Data em que passou para OPTED_IN (24h) ou OPTED_OUT
  opt_out_reason?: string; // ex: "Respondeu PARAR"
  last_promo_sent_at?: string; // Data em que a última mensagem de promoção foi enviada
  promo_sent_count?: number; // Total de mensagens de promoção recebidas
  created_at: string;
  updated_at: string;
}

export type ProductCategory =
  | "DIGITAL"
  | "FISICO"
  | "SISTEMA"
  | "SERVICO"
  | "OUTRO"
  | (string & {});

export interface ProductCategoryItem {
  id: string; // chave (ex: "DIGITAL", "SISTEMA", "MODA", "CURSOS")
  name: string; // rótulo legível (ex: "Infoproduto / Digital (Curso, Ebook)")
  is_custom?: boolean;
}

export const DEFAULT_PRODUCT_CATEGORIES: ProductCategoryItem[] = [
  { id: "DIGITAL", name: "Infoproduto / Digital (Curso, Ebook)" },
  { id: "SISTEMA", name: "Sistema / Software / SaaS" },
  { id: "FISICO", name: "Produto Físico" },
  { id: "SERVICO", name: "Serviço / Consultoria" },
  { id: "OUTRO", name: "Outros" },
];

export interface LynxProduct {
  id: string;
  title: string;
  description: string;
  category: ProductCategory;
  custom_category?: string;
  price?: number;
  price_label?: string; // ex: "R$ 97,00", "A partir de R$ 49/mês", "Sob Consulta"
  image_url?: string;
  buy_link: string; // Link de checkout / página de vendas direta
  badge?: string; // ex: "Destaque", "Lançamento", "Mais Vendido"
  active: boolean;
  order?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Retorna o status de consentimento efetivo do contato.
 * Regra:
 * - Se consent_status for OPTED_OUT, sempre bloqueado.
 * - Se consent_status for OPTED_IN, sempre permitido.
 * - Se consent_status for PENDING: se passaram mais de 24h sem "PARAR", o aceite é AUTOMÁTICO (OPTED_IN).
 * - Caso contrário: NOT_CONTACTED.
 */
export function getEffectiveConsent(
  contact: EvolutionContact
): "NOT_CONTACTED" | "PENDING" | "OPTED_IN" | "OPTED_OUT" {
  if (contact.consent_status === "OPTED_OUT") return "OPTED_OUT";
  if (contact.consent_status === "OPTED_IN") return "OPTED_IN";
  if (contact.consent_status === "PENDING") {
    if (contact.consent_requested_at) {
      const diffMs = Date.now() - new Date(contact.consent_requested_at).getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours >= 24) {
        return "OPTED_IN";
      }
    }
    return "PENDING";
  }
  return "NOT_CONTACTED";
}

export interface PromotionEligibility {
  allowed: boolean;
  status: "ELIGIBLE" | "COOLING_OFF" | "NO_INVITE" | "OPTED_OUT";
  reason: string;
  hoursElapsed: number;
  hoursRemaining: number;
}

/**
 * Regra Estrita de Promoção:
 * A primeira mensagem de promoção para o usuário só pode ser enviada no mínimo
 * 25 horas após o envio da mensagem de convite/apresentação para o usuário
 * e desde que ele NÃO tenha pedido para "PARAR".
 */
export function checkPromotionEligibility(contact: EvolutionContact): PromotionEligibility {
  // 1. Bloqueio absoluto se o usuário pediu para PARAR
  if (contact.consent_status === "OPTED_OUT") {
    return {
      allowed: false,
      status: "OPTED_OUT",
      reason: "Usuário solicitou PARAR (bloqueado permanentemente)",
      hoursElapsed: 0,
      hoursRemaining: 0,
    };
  }

  // 2. Bloqueio se o convite nunca foi enviado
  if (!contact.consent_requested_at) {
    return {
      allowed: false,
      status: "NO_INVITE",
      reason: "Mensagem de convite/apresentação ainda não foi enviada para este contato",
      hoursElapsed: 0,
      hoursRemaining: 25,
    };
  }

  // 3. Cálculo do tempo decorrido desde o envio do convite
  const diffMs = Date.now() - new Date(contact.consent_requested_at).getTime();
  const hoursElapsed = diffMs / (1000 * 60 * 60);

  // 4. Regra dos 25 horas mínimas de carência
  if (hoursElapsed < 25) {
    const hoursRemaining = Math.max(0, 25 - hoursElapsed);
    return {
      allowed: false,
      status: "COOLING_OFF",
      reason: `Em período de carência (restam ${hoursRemaining.toFixed(1)}h para completar as 25h mínimas)`,
      hoursElapsed,
      hoursRemaining,
    };
  }

  // 5. Liberado! Passaram 25h ou mais do convite e não pediu PARAR
  return {
    allowed: true,
    status: "ELIGIBLE",
    reason: `Liberado para promoção (+${hoursElapsed.toFixed(0)}h decorridas após o convite sem pedido de cancelamento)`,
    hoursElapsed,
    hoursRemaining: 0,
  };
}

export interface EvolutionWhatsAppGroup {
  id: string; // JID do grupo (ex: 120363024829@g.us)
  subject: string; // Nome do grupo
  instance_name: string;
  participants_count: number;
  description?: string;
  participants?: Array<{
    id: string; // JID do participante
    admin?: string | null;
  }>;
}

export interface LynxPayout {
  id: string;
  group_id: string;
  partner_id: string;
  reference_month: string;
  calculated_amount: number;
  paid_amount: number;
  status: "PENDING" | "PAID";
  paid_at?: string;
  receipt_note?: string;
}

export interface AppSettings {
  asaas_api_url: string;
  asaas_api_key: string;
  supabase_url: string;
  supabase_anon_key: string;
  supabase_service_role_key: string;
  last_asaas_sync?: string;
  evolution_default_url?: string;
  evolution_global_key?: string;
}

export interface CalculatedDeductionItem {
  id: string;
  name: string;
  type: DeductionType;
  rateOrFixed: number;
  calculatedAmount: number;
}

export interface CalculatedSplitItem {
  splitId: string;
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  partnerPixKey: string;
  partnerLabel: string;
  percentage: number;
  amountToReceive: number;
  payoutStatus: "PENDING" | "PAID";
  paidAt?: string;
  receiptNote?: string;
}

export interface GroupFinancialReport {
  group: LynxGroup;
  referenceMonth: string;
  // Vendas & Cobranças
  totalOriginalBilled: number; // Valor original antes dos descontos nas cobranças
  totalDiscountsGranted: number; // Soma de descontos dados aos clientes
  receivedGross: number; // Total efetivamente recebido (RECEIVED + CONFIRMED)
  asaasFeesTotal: number; // Taxas retidas pelo Asaas nas cobranças recebidas
  asaasNetTotal: number; // Valor líquido no Asaas
  pendingTotal: number; // Cobranças aguardando pagamento
  overdueTotal: number; // Cobranças vencidas
  receivedCount: number;
  pendingCount: number;
  overdueCount: number;
  // Base e Deduções
  baseUsedForCalculation: number;
  deductionItems: CalculatedDeductionItem[];
  totalPercentageRate: number;
  totalRuleDeductions: number;
  deductedAsaasFeeInWaterfall: number;
  // Outras Despesas Lançadas
  expenses: LynxExpense[];
  totalExtraExpenses: number;
  // Resultado Líquido & Divisão (Split)
  distributableNet: number;
  splits: CalculatedSplitItem[];
  totalSplitPercentage: number;
  // Lista de cobranças e clientes do grupo
  payments: LynxPayment[];
  customers: LynxCustomer[];
}

export interface LynxDatabaseState {
  users: LynxUser[];
  groups: LynxGroup[];
  deductions: LynxGroupDeduction[];
  splits: LynxGroupSplit[];
  expenses: LynxExpense[];
  payments: LynxPayment[];
  customers?: LynxCustomer[];
  payouts: LynxPayout[];
  evolution_instances?: EvolutionInstance[];
  evolution_contacts?: EvolutionContact[];
  products?: LynxProduct[];
  product_categories?: ProductCategoryItem[];
  settings: AppSettings;
}

