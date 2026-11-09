import crypto from "crypto";
import { LynxDatabaseState, LynxUser } from "./types";

const SERVER_SECRET =
  process.env.SESSION_SECRET ||
  process.env.JWT_SECRET ||
  "lynx_super_secret_auth_key_prod_9921_asc";

const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export interface SessionPayload {
  userId: string;
  email: string;
  role: "SUPERADMIN" | "PARTNER";
  issuedAt: number;
}

/**
 * Cria token de autenticação assinado com HMAC-SHA256
 */
export function createSessionToken(user: LynxUser): string {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email.toLowerCase(),
    role: user.role,
    issuedAt: Date.now(),
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SERVER_SECRET)
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${signature}`;
}

/**
 * Valida o token de sessão e retorna o payload caso seja autêntico e não expirado
 */
export function verifySessionToken(token?: string | null): SessionPayload | null {
  if (!token || typeof token !== "string") return null;

  const parts = token.trim().split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;

  const expectedSignature = crypto
    .createHmac("sha256", SERVER_SECRET)
    .update(payloadB64)
    .digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    const jsonStr = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload: SessionPayload = JSON.parse(jsonStr);

    if (Date.now() - payload.issuedAt > TOKEN_EXPIRY_MS) {
      return null; // Expirado
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extrai o token do cabeçalho Authorization: Bearer <token> ou de cookie
 */
export function extractTokenFromHeader(authHeader?: string | null): string | null {
  if (!authHeader) return null;
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  return authHeader.trim();
}

/**
 * Gera hash criptográfico seguro (scrypt) para armazenamento de senhas
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

/**
 * Valida senha contra hash scrypt ou string legada existente
 */
export function verifyPassword(password: string, storedHashOrPlain: string): boolean {
  if (!storedHashOrPlain || !password) return false;

  // Formato scrypt: scrypt$salt$derivedKey
  if (storedHashOrPlain.startsWith("scrypt$")) {
    const [, salt, originalKey] = storedHashOrPlain.split("$");
    if (!salt || !originalKey) return false;
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(
      Buffer.from(derivedKey.toString("hex")),
      Buffer.from(originalKey)
    );
  }

  // Compatibilidade legada com senha em texto puro existente
  return password === storedHashOrPlain;
}

/**
 * Remove campos estritamente confidenciais do usuário (ex: password)
 */
export function sanitizeUser(user: LynxUser): Omit<LynxUser, "password"> & { has_password: boolean } {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...safeUser } = user;
  return {
    ...safeUser,
    has_password: Boolean(password),
  };
}

/**
 * Sanitiza o estado global para envio seguro e de alta performance via API
 */
export function sanitizeDatabaseState(
  state: LynxDatabaseState,
  sessionUser?: SessionPayload | null
): Partial<LynxDatabaseState> {
  const isSuperAdmin =
    sessionUser?.role === "SUPERADMIN" ||
    sessionUser?.email.toLowerCase() === "edsonmanoel2012@gmail.com";

  // 1. Sanitiza usuários (nunca envia senha na rede)
  const sanitizedUsers = (state.users || []).map((u) => sanitizeUser(u)) as unknown as LynxUser[];

  // 2. Mascara secrets de configuração
  const sanitizedSettings = {
    ...state.settings,
    asaas_api_key: state.settings?.asaas_api_key ? "••••••••••••••••" : "",
    supabase_service_role_key: state.settings?.supabase_service_role_key
      ? "••••••••••••••••"
      : "",
  };

  // 3. Remove os 10.8MB de contatos do payload geral (acelera de 11MB para ~25KB)
  // Contatos agora são consultados exclusivamente via endpoint paginado /api/evolution
  const strippedContacts: typeof state.evolution_contacts = [];

  // Se não estiver logado ou for visitante, devolve apenas estrutura mínima
  if (!sessionUser) {
    return {
      users: [],
      groups: [],
      deductions: [],
      splits: [],
      expenses: [],
      payments: [],
      payouts: [],
      evolution_instances: [],
      evolution_contacts: [],
      products: (state.products || []).filter((p) => p.active),
      product_categories: state.product_categories || [],
      settings: {
        asaas_api_url: state.settings?.asaas_api_url || "https://api.asaas.com/v3",
        supabase_url: state.settings?.supabase_url || "",
        supabase_anon_key: state.settings?.supabase_anon_key || "",
        asaas_api_key: "",
        supabase_service_role_key: "",
        last_asaas_sync: state.settings?.last_asaas_sync,
      },
    };
  }

  // Se for parceiro comum, filtra estritamente apenas os grupos e splits autorizados
  if (!isSuperAdmin) {
    const allowedGroupIds = (state.splits || [])
      .filter((s) => s.partner_id === sessionUser.userId && s.can_view_group)
      .map((s) => s.group_id);

    return {
      users: sanitizedUsers.filter((u) => u.id === sessionUser.userId),
      groups: (state.groups || []).filter((g) => allowedGroupIds.includes(g.id)),
      deductions: (state.deductions || []).filter((d) => allowedGroupIds.includes(d.group_id)),
      splits: (state.splits || []).filter((s) => allowedGroupIds.includes(s.group_id)),
      expenses: (state.expenses || []).filter((e) => allowedGroupIds.includes(e.group_id)),
      payments: (state.payments || []).filter((p) => allowedGroupIds.includes(p.group_id)),
      payouts: (state.payouts || []).filter(
        (p) => p.partner_id === sessionUser.userId || allowedGroupIds.includes(p.group_id)
      ),
      evolution_instances: [],
      evolution_contacts: [],
      products: state.products || [],
      product_categories: state.product_categories || [],
      settings: {
        asaas_api_url: "",
        supabase_url: "",
        supabase_anon_key: "",
        asaas_api_key: "",
        supabase_service_role_key: "",
      },
    };
  }

  // SuperAdmin recebe todos os grupos e transações, mas com senhas e chaves protegidas e sem os 11MB de contatos
  return {
    ...state,
    users: sanitizedUsers,
    settings: sanitizedSettings,
    evolution_contacts: strippedContacts,
  };
}

