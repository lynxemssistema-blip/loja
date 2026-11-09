import fs from "fs";
import path from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { LynxDatabaseState } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "parceiro-lynx-db.json");

export const INITIAL_SEED_DATA: LynxDatabaseState = {
  users: [
    {
      id: "usr-superadmin",
      name: "Edson Manoel (SuperAdmin)",
      email: "edsonmanoel2012@gmail.com",
      password: "admin123",
      role: "SUPERADMIN",
      pix_key: "edsonmanoel2012@gmail.com",
      document: "000.000.000-00",
      phone: "(11) 99999-0000",
      active: true,
      created_at: "2026-10-01T10:00:00Z",
    },
    {
      id: "usr-parceiro-horeb",
      name: "Parceiro Horeb",
      email: "horeb@grupohoreb.com.br",
      password: "horeb123",
      role: "PARTNER",
      pix_key: "financeiro@grupohoreb.com.br",
      document: "",
      phone: "",
      active: true,
      created_at: "2026-10-02T10:00:00Z",
    },
  ],
  groups: [
    {
      id: "grp-horeb",
      asaas_group_name: "horeb",
      display_name: "Grupo Horeb",
      description:
        "Grupo oficial Asaas 'horeb' (ID 376965 - 14 clientes): Do valor líquido já com desconto do Asaas, tira 32% Impostos e 15% Custo da Operação/Infraestrutura, deduz despesas extras e divide o líquido em 2 partes iguais (50% / 50%).",
      calculation_base: "ASAAS_NET",
      deduct_asaas_fees: true,
      active: true,
      created_at: "2026-10-01T10:00:00Z",
    },
    {
      id: "grp-lynxems",
      asaas_group_name: "lynxems",
      display_name: "Grupo Lynx EMS",
      description:
        "Grupo oficial Asaas 'lynxems' (ID 376586 - 4 clientes): Operação principal Lynx EMS sobre valor líquido Asaas.",
      calculation_base: "ASAAS_NET",
      deduct_asaas_fees: true,
      active: true,
      created_at: "2026-10-02T10:00:00Z",
    },
    {
      id: "grp-isaac",
      asaas_group_name: "Isaac",
      display_name: "Grupo Isaac",
      description:
        "Grupo oficial Asaas 'Isaac' (ID 378341): Cálculo sobre valor líquido já com desconto do Asaas.",
      calculation_base: "ASAAS_NET",
      deduct_asaas_fees: true,
      active: true,
      created_at: "2026-10-03T10:00:00Z",
    },
    {
      id: "grp-barbermindset",
      asaas_group_name: "barbermindset",
      display_name: "Grupo BarberMindset",
      description:
        "Grupo oficial Asaas 'barbermindset' (ID 376979): Cálculo sobre valor líquido já com desconto do Asaas.",
      calculation_base: "ASAAS_NET",
      deduct_asaas_fees: true,
      active: true,
      created_at: "2026-10-04T10:00:00Z",
    },
    {
      id: "grp-amoreja",
      asaas_group_name: "Amoreja",
      display_name: "Grupo Amoreja",
      description:
        "Grupo oficial Asaas 'Amoreja' (ID 376517): Cálculo sobre valor líquido já com desconto do Asaas.",
      calculation_base: "ASAAS_NET",
      deduct_asaas_fees: true,
      active: true,
      created_at: "2026-10-05T10:00:00Z",
    },
  ],
  deductions: [
    // GRUPO HOREB: 32% Impostos + 15% Custo da Operação / Infraestrutura
    {
      id: "ded-horeb-1",
      group_id: "grp-horeb",
      name: "Impostos",
      type: "PERCENTAGE",
      value: 32,
      sort_order: 1,
      active: true,
    },
    {
      id: "ded-horeb-2",
      group_id: "grp-horeb",
      name: "Custo da Operação / Infraestrutura",
      type: "PERCENTAGE",
      value: 15,
      sort_order: 2,
      active: true,
    },
    // GRUPO LYNXEMS
    {
      id: "ded-lynx-1",
      group_id: "grp-lynxems",
      name: "Impostos",
      type: "PERCENTAGE",
      value: 32,
      sort_order: 1,
      active: true,
    },
    {
      id: "ded-lynx-2",
      group_id: "grp-lynxems",
      name: "Custo da Operação / Infraestrutura",
      type: "PERCENTAGE",
      value: 15,
      sort_order: 2,
      active: true,
    },
    // GRUPO ISAAC
    {
      id: "ded-isaac-1",
      group_id: "grp-isaac",
      name: "Impostos",
      type: "PERCENTAGE",
      value: 32,
      sort_order: 1,
      active: true,
    },
    {
      id: "ded-isaac-2",
      group_id: "grp-isaac",
      name: "Custo da Operação / Infraestrutura",
      type: "PERCENTAGE",
      value: 15,
      sort_order: 2,
      active: true,
    },
    // GRUPO BARBERMINDSET
    {
      id: "ded-barber-1",
      group_id: "grp-barbermindset",
      name: "Impostos",
      type: "PERCENTAGE",
      value: 32,
      sort_order: 1,
      active: true,
    },
    {
      id: "ded-barber-2",
      group_id: "grp-barbermindset",
      name: "Custo da Operação / Infraestrutura",
      type: "PERCENTAGE",
      value: 15,
      sort_order: 2,
      active: true,
    },
    // GRUPO AMOREJA
    {
      id: "ded-amoreja-1",
      group_id: "grp-amoreja",
      name: "Impostos",
      type: "PERCENTAGE",
      value: 32,
      sort_order: 1,
      active: true,
    },
    {
      id: "ded-amoreja-2",
      group_id: "grp-amoreja",
      name: "Custo da Operação / Infraestrutura",
      type: "PERCENTAGE",
      value: 15,
      sort_order: 2,
      active: true,
    },
  ],
  splits: [
    // GRUPO HOREB: Dividido em 2 partes iguais (50% / 50%)
    {
      id: "spl-horeb-1",
      group_id: "grp-horeb",
      partner_id: "usr-parceiro-horeb",
      partner_label: "Cota Parceiro Horeb (Parte 1)",
      percentage: 50,
      can_view_group: true,
    },
    {
      id: "spl-horeb-2",
      group_id: "grp-horeb",
      partner_id: "usr-superadmin",
      partner_label: "Cota Lynx / Edson Manoel (Parte 2)",
      percentage: 50,
      can_view_group: true,
    },
    // GRUPO LYNXEMS
    {
      id: "spl-lynx-1",
      group_id: "grp-lynxems",
      partner_id: "usr-superadmin",
      partner_label: "Cota Principal Lynx EMS",
      percentage: 100,
      can_view_group: true,
    },
    // GRUPO ISAAC
    {
      id: "spl-isaac-1",
      group_id: "grp-isaac",
      partner_id: "usr-superadmin",
      partner_label: "Cota Lynx / Edson Manoel",
      percentage: 100,
      can_view_group: true,
    },
    // GRUPO BARBERMINDSET
    {
      id: "spl-barber-1",
      group_id: "grp-barbermindset",
      partner_id: "usr-superadmin",
      partner_label: "Cota Lynx / Edson Manoel",
      percentage: 100,
      can_view_group: true,
    },
    // GRUPO AMOREJA
    {
      id: "spl-amoreja-1",
      group_id: "grp-amoreja",
      partner_id: "usr-superadmin",
      partner_label: "Cota Lynx / Edson Manoel",
      percentage: 100,
      can_view_group: true,
    },
  ],
  expenses: [],
  payments: [],
  customers: [],
  payouts: [],
  evolution_instances: [],
  evolution_contacts: [],
  settings: {
    asaas_api_url: process.env.ASAAS_API_URL || "https://api.asaas.com/v3",
    asaas_api_key: process.env.ASAAS_API_KEY || "",
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    supabase_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    supabase_service_role_key: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  },
};

export function readLocalDb(): LynxDatabaseState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(
        DB_FILE,
        JSON.stringify(INITIAL_SEED_DATA, null, 2),
        "utf-8"
      );
      return structuredClone(INITIAL_SEED_DATA);
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw) as LynxDatabaseState;
    const hasSuperAdmin = parsed.users?.some(
      (u) => u.email.toLowerCase() === "edsonmanoel2012@gmail.com"
    );
    if (!hasSuperAdmin) {
      parsed.users = [INITIAL_SEED_DATA.users[0], ...(parsed.users || [])];
    }
    parsed.evolution_instances = parsed.evolution_instances || [];
    parsed.evolution_contacts = parsed.evolution_contacts || [];
    parsed.customers = parsed.customers || [];
    parsed.products = parsed.products || [];
    parsed.product_categories = parsed.product_categories || [];
    return parsed;
  } catch {
    return structuredClone(INITIAL_SEED_DATA);
  }
}

export function writeLocalDb(state: LynxDatabaseState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
}

export function getSupabaseServerClient(
  customUrl?: string,
  customKey?: string
): SupabaseClient | null {
  const local = readLocalDb();
  const url =
    customUrl ||
    local.settings.supabase_url ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const key =
    customKey ||
    local.settings.supabase_service_role_key ||
    local.settings.supabase_anon_key ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (!url || !key || url.includes("seu-supabase")) {
    return null;
  }

  try {
    return createClient(url, key, {
      auth: { persistSession: false },
    });
  } catch {
    return null;
  }
}

async function fetchAllEvolutionContacts(sb: SupabaseClient): Promise<any[]> {
  let all: any[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await sb
      .from("lynx_evolution_contacts")
      .select("*")
      .range(from, from + pageSize - 1);
    if (error || !data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += data.length;
  }
  return all;
}

/**
 * Lê os dados do Supabase na VPS caso esteja conectado e populado;
 * se o banco no Supabase estiver vazio, envia o seed inicial automaticamente!
 */
export async function loadStateWithSupabase(): Promise<{
  state: LynxDatabaseState;
  supabaseConnected: boolean;
  supabaseMessage?: string;
}> {
  const localState = readLocalDb();
  const sb = getSupabaseServerClient();
  if (!sb) {
    return { state: localState, supabaseConnected: false };
  }

  try {
    const [
      usersRes,
      groupsRes,
      dedRes,
      splitsRes,
      expRes,
      payRes,
      payoutsRes,
      instancesRes,
      contactsRes,
    ] = await Promise.all([
      sb.from("lynx_users").select("*"),
      sb.from("lynx_groups").select("*"),
      sb.from("lynx_group_deductions").select("*"),
      sb.from("lynx_group_splits").select("*"),
      sb.from("lynx_expenses").select("*"),
      sb.from("lynx_payments").select("*"),
      sb.from("lynx_payouts").select("*"),
      sb.from("lynx_evolution_instances").select("*"),
      sb.from("lynx_evolution_contacts").select("*"),
    ]);

    if (usersRes.error) {
      return {
        state: localState,
        supabaseConnected: false,
        supabaseMessage: usersRes.error.message,
      };
    }

    // Se o Supabase na VPS está com as tabelas criadas mas sem grupos ainda, faz o push do estado atual
    if (!groupsRes.data || groupsRes.data.length === 0) {
      await syncStateToSupabaseIfConfigured(localState);
      return {
        state: localState,
        supabaseConnected: true,
        supabaseMessage: "Banco na VPS inicializado com os dados do Parceiro Lynx.",
      };
    }

    let allContacts = contactsRes?.data || [];
    if (allContacts.length >= 1000) {
      allContacts = await fetchAllEvolutionContacts(sb);
    }

    const remoteState: LynxDatabaseState = {
      users:
        usersRes.data && usersRes.data.length > 0
          ? usersRes.data
          : localState.users,
      groups: groupsRes.data,
      deductions: dedRes.data || [],
      splits: splitsRes.data || [],
      expenses: expRes.data || [],
      payments: payRes.data || [],
      payouts: payoutsRes.data || [],
      evolution_instances:
        instancesRes?.data && !instancesRes.error
          ? instancesRes.data
          : localState.evolution_instances || [],
      evolution_contacts:
        allContacts && allContacts.length > 0
          ? (allContacts as any)
          : localState.evolution_contacts || [],
      products: localState.products || [],
      product_categories: localState.product_categories || [],
      settings: localState.settings,
    };

    writeLocalDb(remoteState);
    return { state: remoteState, supabaseConnected: true };
  } catch (err: unknown) {
    return {
      state: localState,
      supabaseConnected: false,
      supabaseMessage: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Sincroniza o estado para o Supabase da VPS caso esteja configurado
 */
export async function syncStateToSupabaseIfConfigured(
  state: LynxDatabaseState
): Promise<{ synced: boolean; error?: string }> {
  const sb = getSupabaseServerClient();
  if (!sb) {
    return { synced: false };
  }

  try {
    if (state.users.length > 0) {
      const userIds = state.users.map((u) => u.id);
      await sb
        .from("lynx_users")
        .delete()
        .not("id", "in", `(${userIds.map((id) => `"${id}"`).join(",")})`);

      const { error } = await sb.from("lynx_users").upsert(
        state.users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email.toLowerCase(),
          password: u.password || "123456",
          role: u.role,
          pix_key: u.pix_key,
          document: u.document,
          phone: u.phone,
          active: u.active,
        }))
      );
      if (error) throw error;
    }

    if (state.groups.length > 0) {
      const groupIds = state.groups.map((g) => g.id);
      await sb
        .from("lynx_groups")
        .delete()
        .not("id", "in", `(${groupIds.map((id) => `"${id}"`).join(",")})`);

      const { error } = await sb.from("lynx_groups").upsert(
        state.groups.map((g) => ({
          id: g.id,
          asaas_group_name: g.asaas_group_name,
          display_name: g.display_name,
          description: g.description,
          calculation_base: g.calculation_base,
          deduct_asaas_fees: g.deduct_asaas_fees,
          active: g.active,
        }))
      );
      if (error) throw error;
    }

    await sb
      .from("lynx_group_deductions")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (state.deductions.length > 0) {
      await sb.from("lynx_group_deductions").upsert(state.deductions);
    }

    await sb
      .from("lynx_group_splits")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (state.splits.length > 0) {
      await sb.from("lynx_group_splits").upsert(state.splits);
    }

    await sb
      .from("lynx_expenses")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (state.expenses.length > 0) {
      await sb.from("lynx_expenses").upsert(state.expenses);
    }

    await sb
      .from("lynx_payments")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (state.payments.length > 0) {
      await sb.from("lynx_payments").upsert(state.payments);
    }

    if (state.payouts.length > 0) {
      await sb.from("lynx_payouts").upsert(state.payouts);
    }

    if (state.evolution_instances && state.evolution_instances.length > 0) {
      await sb
        .from("lynx_evolution_instances")
        .upsert(state.evolution_instances);
    }

    if (state.evolution_contacts && state.evolution_contacts.length > 0) {
      // Upsert em lotes de 500 para evitar limitação de payload no PostgREST
      const BATCH_SIZE = 500;
      for (let i = 0; i < state.evolution_contacts.length; i += BATCH_SIZE) {
        const batch = state.evolution_contacts.slice(i, i + BATCH_SIZE);
        await sb.from("lynx_evolution_contacts").upsert(batch);
      }
    }

    return { synced: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { synced: false, error: message };
  }
}
