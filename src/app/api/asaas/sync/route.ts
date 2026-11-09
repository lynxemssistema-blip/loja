import { NextRequest, NextResponse } from "next/server";
import {
  loadStateWithSupabase,
  syncStateToSupabaseIfConfigured,
  writeLocalDb,
} from "../../../../lib/db";
import {
  extractTokenFromHeader,
  verifySessionToken,
} from "../../../../lib/auth";
import { BillingType, LynxPayment, PaymentStatus } from "../../../../lib/types";

interface AsaasGroupItem {
  id: string;
  name: string;
}

interface AsaasCustomerItem {
  id: string;
  name: string;
  groupName?: string;
  groups?: Array<{ name: string }>;
}

interface AsaasPaymentItem {
  id: string;
  customer: string;
  value: number;
  netValue: number;
  originalValue?: number;
  description?: string;
  billingType?: string;
  status?: string;
  dueDate: string;
  paymentDate?: string;
  clientPaymentDate?: string;
  confirmedDate?: string;
  discount?: {
    value?: number;
  };
}

/**
 * Helper que percorre TODAS as páginas da API v3 do Asaas (de 100 em 100)
 * até hasMore === false, trazendo 100% dos registros de uma só vez.
 */
async function fetchAllAsaasPages<T>(
  baseUrl: string,
  endpoint: string,
  apiKey: string,
  maxPages = 50
): Promise<T[]> {
  const allItems: T[] = [];
  let offset = 0;
  const limit = 100;

  for (let page = 0; page < maxPages; page++) {
    const separator = endpoint.includes("?") ? "&" : "?";
    const url = `${baseUrl}${endpoint}${separator}limit=${limit}&offset=${offset}`;

    const res = await fetch(url, {
      headers: {
        access_token: apiKey,
        "Content-Type": "application/json",
        "User-Agent": "ParceiroLynx/1.0",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `Erro na API Asaas (${endpoint} - HTTP ${res.status}): ${errText.slice(
          0,
          200
        )}`
      );
    }

    const json = await res.json();
    const pageItems: T[] = json.data || [];
    allItems.push(...pageItems);

    if (!json.hasMore || pageItems.length < limit) {
      break;
    }
    offset += limit;
  }

  return allItems;
}

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get("authorization"));
    const sessionUser = verifySessionToken(token);

    if (!sessionUser) {
      return NextResponse.json(
        { error: "Acesso não autorizado. Faça login para sincronizar dados com o Asaas." },
        { status: 401 }
      );
    }

    const isSuperAdmin =
      sessionUser.role === "SUPERADMIN" ||
      sessionUser.email.toLowerCase() === "edsonmanoel2012@gmail.com";

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Permissão insuficiente. Apenas administradores podem acionar sincronização com o Asaas." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { state } = await loadStateWithSupabase();

    const apiUrl = (
      body.asaas_api_url ||
      state.settings.asaas_api_url ||
      process.env.ASAAS_API_URL ||
      "https://api.asaas.com/v3"
    ).replace(/\/$/, "");

    const apiKey = (
      body.asaas_api_key ||
      state.settings.asaas_api_key ||
      process.env.ASAAS_API_KEY ||
      ""
    ).trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Chave de API do Asaas não informada. Vá na aba 'Supabase VPS & API Asaas' e cole sua chave ($aact_...).",
        },
        { status: 400 }
      );
    }

    const ensureGroupInState = (rawGroupName: string) => {
      const groupName = (rawGroupName || "Geral (Sem Grupo Asaas)").trim();
      let group = state.groups.find(
        (g) => g.asaas_group_name.toLowerCase() === groupName.toLowerCase()
      );
      if (!group) {
        const newGroupId = `grp-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 6)}`;
        group = {
          id: newGroupId,
          asaas_group_name: groupName,
          display_name: groupName,
          description: `Grupo importado automaticamente do Asaas (${groupName})`,
          calculation_base: "ASAAS_NET",
          deduct_asaas_fees: true,
          active: true,
          created_at: new Date().toISOString(),
        };
        state.groups.push(group);

        // Cria as alíquotas base padrão (32% Impostos e 15% Operação/Infra) editáveis pelo SuperAdmin
        state.deductions.push(
          {
            id: `ded-${newGroupId}-1`,
            group_id: newGroupId,
            name: "Impostos",
            type: "PERCENTAGE",
            value: 32,
            sort_order: 1,
            active: true,
          },
          {
            id: `ded-${newGroupId}-2`,
            group_id: newGroupId,
            name: "Custo da Operação / Infraestrutura",
            type: "PERCENTAGE",
            value: 15,
            sort_order: 2,
            active: true,
          }
        );

        const superAdmin = state.users.find((u) => u.role === "SUPERADMIN");
        if (superAdmin) {
          state.splits.push({
            id: `spl-${newGroupId}-1`,
            group_id: newGroupId,
            partner_id: superAdmin.id,
            partner_label: "Cota SuperAdmin / Lynx",
            percentage: 100,
            can_view_group: true,
          });
        }
      }
      return group;
    };

    // ETAPA 1: Busca TODOS os Grupos de Clientes cadastrados no Asaas (/v3/customerGroups)
    try {
      const asaasGroups = await fetchAllAsaasPages<AsaasGroupItem>(
        apiUrl,
        "/customerGroups",
        apiKey,
        20
      );
      for (const g of asaasGroups) {
        if (g.name) {
          ensureGroupInState(g.name);
        }
      }
    } catch {
      // Caso a conta não utilize /customerGroups separado, segue normalmente extraindo dos clientes
    }

    // ETAPA 2: Busca TODOS os Clientes de todas as páginas (/v3/customers) e mapeia Cliente -> Grupo
    const customerList = await fetchAllAsaasPages<AsaasCustomerItem>(
      apiUrl,
      "/customers",
      apiKey,
      50
    );

    const customerMap = new Map<
      string,
      { name: string; groupName: string }
    >();

    for (const c of customerList) {
      const groupName =
        c.groupName ||
        (Array.isArray(c.groups) && c.groups.length > 0
          ? c.groups[0].name
          : "Geral (Sem Grupo Asaas)");

      customerMap.set(c.id, {
        name: c.name || "Cliente Asaas",
        groupName,
      });

      ensureGroupInState(groupName);
    }

    // ETAPA 3: Busca TODAS as Cobranças/Vendas de todas as páginas (/v3/payments)
    const paymentList = await fetchAllAsaasPages<AsaasPaymentItem>(
      apiUrl,
      "/payments",
      apiKey,
      50
    );

    let importedCount = 0;

    for (const p of paymentList) {
      const custInfo = customerMap.get(p.customer) || {
        name: `Cliente ${p.customer}`,
        groupName: "Geral (Sem Grupo Asaas)",
      };

      const group = ensureGroupInState(custInfo.groupName);

      const grossVal = Number(p.value || 0);
      const netVal = Number(p.netValue ?? p.value ?? 0);
      const feeVal = Math.max(0, Number((grossVal - netVal).toFixed(2)));
      const discountVal = Number(
        p.discount?.value ||
          (p.originalValue && p.originalValue > grossVal
            ? p.originalValue - grossVal
            : 0)
      );

      let mappedStatus: PaymentStatus = "PENDING";
      if (
        p.status === "RECEIVED" ||
        p.status === "RECEIVED_IN_CASH" ||
        p.status === "DUNNING_RECEIVED"
      ) {
        mappedStatus = "RECEIVED";
      } else if (p.status === "CONFIRMED") {
        mappedStatus = "CONFIRMED";
      } else if (p.status === "OVERDUE") {
        mappedStatus = "OVERDUE";
      }

      let mappedBilling: BillingType = "UNDEFINED";
      if (p.billingType === "PIX") mappedBilling = "PIX";
      else if (p.billingType === "BOLETO") mappedBilling = "BOLETO";
      else if (p.billingType === "CREDIT_CARD") mappedBilling = "CREDIT_CARD";

      const effectiveDate =
        p.paymentDate || p.clientPaymentDate || p.confirmedDate || p.dueDate;
      const refMonth = (effectiveDate || new Date().toISOString()).slice(0, 7);

      const newPayment: LynxPayment = {
        id: `pay-${p.id}`,
        asaas_payment_id: p.id,
        group_id: group.id,
        customer_id: p.customer,
        customer_name: custInfo.name,
        description: p.description || "Cobrança Asaas",
        billing_type: mappedBilling,
        status: mappedStatus,
        gross_value: grossVal,
        discount_value: discountVal,
        asaas_fee: feeVal,
        net_value: netVal,
        payment_date: p.paymentDate || p.clientPaymentDate || p.confirmedDate,
        due_date: p.dueDate,
        reference_month: refMonth,
      };

      const idx = state.payments.findIndex(
        (existing) => existing.asaas_payment_id === p.id
      );
      if (idx >= 0) {
        state.payments[idx] = newPayment;
      } else {
        state.payments.push(newPayment);
      }
      importedCount++;
    }

    state.settings.asaas_api_url = apiUrl;
    state.settings.asaas_api_key = apiKey;
    state.settings.last_asaas_sync = new Date().toISOString();

    writeLocalDb(state);
    await syncStateToSupabaseIfConfigured(state);

    return NextResponse.json({
      ok: true,
      importedCount,
      customersCount: customerList.length,
      groupsCount: state.groups.length,
      state,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
