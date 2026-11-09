import { NextRequest, NextResponse } from "next/server";
import {
  loadStateWithSupabase,
  syncStateToSupabaseIfConfigured,
  writeLocalDb,
} from "../../../lib/db";
import {
  extractTokenFromHeader,
  verifySessionToken,
} from "../../../lib/auth";
import {
  EvolutionContact,
  EvolutionInstance,
  EvolutionWhatsAppGroup,
  checkPromotionEligibility,
} from "../../../lib/types";
import { BRAZIL_DDD_MAP, COUNTRY_CODES, normalizePhoneNumber } from "../../../lib/ddd";

/**
 * Valida se um nome é válido (não é vazio, nem número puro, nem id de grupo)
 */
function isValidContactName(name?: string, rawPhone?: string): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;

  if (trimmed.includes("@") || trimmed.includes(".net") || trimmed.includes(".us")) {
    return false;
  }

  const digitsOnly = trimmed.replace(/[\s\+\-\(\)]/g, "");
  if (/^\d+$/.test(digitsOnly) && digitsOnly.length >= 7) {
    return false;
  }

  if (rawPhone && digitsOnly === rawPhone.replace(/\D/g, "")) {
    return false;
  }

  return true;
}

/**
 * Normaliza a URL da Evolution API garantindo que remova /manager e barras finais
 */
function cleanEvolutionUrl(url?: string): string {
  if (!url) return "";
  return url
    .trim()
    .replace(/\/$/, "")
    .replace(/\/manager\/?$/i, "")
    .replace(/\/$/, "");
}

/**
 * Detecta se a URL da foto vem dos servidores CDN do WhatsApp/Meta.
 * Links diretos como pps.whatsapp.net expiram rapidamente e geram erros 403 Forbidden nos navegadores.
 */
function isEphemeralWhatsappCdn(url?: string): boolean {
  if (!url) return false;
  return (
    url.includes("pps.whatsapp.net") ||
    url.includes("mmg.whatsapp.net") ||
    url.includes("whatsapp.net") ||
    url.includes("fbcdn.net")
  );
}

export async function GET(req: NextRequest) {
  const token = extractTokenFromHeader(req.headers.get("authorization"));
  const sessionUser = verifySessionToken(token);

  if (!sessionUser) {
    return NextResponse.json(
      { error: "Acesso não autorizado. Faça login para acessar os recursos da Evolution API." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const { state } = await loadStateWithSupabase();
  const instances = state.evolution_instances || [];
  const contacts = state.evolution_contacts || [];

  // Carregamento sob demanda da base completa de contatos apenas na aba de Leads
  if (action === "all_contacts") {
    return NextResponse.json({
      ok: true,
      contacts,
    });
  }

  // Se for busca paginada de contatos sob demanda
  if (action === "contacts") {
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(200, Math.max(10, parseInt(searchParams.get("limit") || "50", 10)));
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const category = searchParams.get("category");

    let filtered = contacts;

    if (category === "UNIQUE") filtered = filtered.filter((c) => !c.is_repeated);
    else if (category === "REPEATED") filtered = filtered.filter((c) => c.is_repeated);
    else if (category === "GROUPS") filtered = filtered.filter((c) => c.source_type === "GROUP_MEMBER");
    else if (category === "NATIONAL") filtered = filtered.filter((c) => c.is_national);
    else if (category === "INTERNATIONAL") filtered = filtered.filter((c) => !c.is_national);

    if (search) {
      filtered = filtered.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(search) ||
          (c.phone || "").includes(search) ||
          (c.email || "").toLowerCase().includes(search) ||
          (c.ddd || "").includes(search)
      );
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      ok: true,
      contacts: paginated,
      total,
      page,
      limit,
      totalPages,
    });
  }

  // Resposta padrão (instâncias e estatísticas sem os 10.8MB de contatos em massa)
  return NextResponse.json({
    ok: true,
    instances,
    contacts: [], // Protegido contra payload gigante
    stats: {
      totalInstances: instances.length,
      connectedInstances: instances.filter((i) => i.status === "open").length,
      totalContacts: contacts.length,
      uniqueContacts: contacts.filter((c) => !c.is_repeated).length,
      repeatedContacts: contacts.filter((c) => c.is_repeated).length,
      nationalContacts: contacts.filter((c) => c.is_national).length,
      internationalContacts: contacts.filter((c) => !c.is_national).length,
      validNameContacts: contacts.filter((c) => c.has_valid_name).length,
      contactsWithEmail: contacts.filter((c) => Boolean(c.email)).length,
      groupMembersCount: contacts.filter((c) => c.source_type === "GROUP_MEMBER").length,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get("authorization"));
    const sessionUser = verifySessionToken(token);

    if (!sessionUser) {
      return NextResponse.json(
        { error: "Acesso não autorizado. Token ausente ou inválido." },
        { status: 401 }
      );
    }

    const isSuperAdmin =
      sessionUser.role === "SUPERADMIN" ||
      sessionUser.email.toLowerCase() === "edsonmanoel2012@gmail.com";

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Permissão insuficiente. Apenas administradores podem gerenciar a Evolution API." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action, payload } = body;
    const { state } = await loadStateWithSupabase();

    state.evolution_instances = state.evolution_instances || [];
    state.evolution_contacts = state.evolution_contacts || [];

    // POLÍTICA DE SEGURANÇA MÁXIMA & ANTI-SPAM:
    // 1. Todas as 10 instâncias operacionais/pessoais são ESTRITAMENTE SOMENTE-LEITURA.
    // 2. APENAS a instância dedicada "Vendas Lynx" tem autorização para realizar disparos.
    // 3. As únicas ações de envio permitidas são "SEND_CATALOG_CAMPAIGN" e "SEND_PROMOTION_CAMPAIGN" com a instância "Vendas Lynx".
    // Qualquer outra tentativa de envio é sumariamente bloqueada no nível do servidor.
    const isSendingAction =
      typeof action === "string" &&
      (action.toUpperCase().includes("SEND") ||
        action.toUpperCase().includes("MESSAGE") ||
        action.toUpperCase().includes("DISPATCH") ||
        action.toUpperCase().includes("BROADCAST"));

    const ALLOWED_SEND_ACTIONS = ["SEND_CATALOG_CAMPAIGN", "SEND_PROMOTION_CAMPAIGN"];

    if (isSendingAction) {
      if (!ALLOWED_SEND_ACTIONS.includes(action)) {
        return NextResponse.json(
          {
            error:
              "Ação bloqueada por política de segurança: Esta rota não aceita comandos genéricos de envio. Disparos só são permitidos via campanhas controladas (Apresentação de Catálogo ou Promoção).",
          },
          { status: 403 }
        );
      }

      // Valida rigorosamente se a instância é estritamente "Vendas Lynx"
      const targetInstName = (payload?.instance_name || "").toString().trim().toLowerCase();
      if (targetInstName !== "vendas lynx") {
        return NextResponse.json(
          {
            error:
              "Ação bloqueada por política de segurança: APENAS a instância dedicada 'Vendas Lynx' possui autorização de envio. As demais instâncias cadastradas são estritamente somente-leitura.",
          },
          { status: 403 }
        );
      }
    }

    switch (action) {
      // 1. SALVAR / EDITAR INSTÂNCIA INDIVIDUAL
      case "SAVE_INSTANCE": {
        const inst = payload as {
          id?: string;
          name: string;
          server_url: string;
          api_key: string;
        };

        const cleanName = inst.name.trim();
        const cleanUrl = cleanEvolutionUrl(inst.server_url);
        const cleanKey = inst.api_key.trim();

        const existingIdx = state.evolution_instances.findIndex(
          (i) => i.id === inst.id || i.name.toLowerCase() === cleanName.toLowerCase()
        );

        const record: EvolutionInstance = {
          id: inst.id || `inst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: cleanName,
          server_url: cleanUrl,
          api_key: cleanKey,
          status: existingIdx >= 0 ? state.evolution_instances[existingIdx].status : "unknown",
          phone_number: existingIdx >= 0 ? state.evolution_instances[existingIdx].phone_number : undefined,
          profile_name: existingIdx >= 0 ? state.evolution_instances[existingIdx].profile_name : undefined,
          profile_picture_url: existingIdx >= 0 ? state.evolution_instances[existingIdx].profile_picture_url : undefined,
          contacts_count: existingIdx >= 0 ? state.evolution_instances[existingIdx].contacts_count : 0,
          active: true,
          created_at: existingIdx >= 0 ? state.evolution_instances[existingIdx].created_at : new Date().toISOString(),
        };

        if (existingIdx >= 0) {
          state.evolution_instances[existingIdx] = record;
        } else {
          state.evolution_instances.push(record);
        }

        writeLocalDb(state);
        await syncStateToSupabaseIfConfigured(state);

        return NextResponse.json({ ok: true, instance: record, state });
      }

      // 2. CADASTRO EM MASSA (MÚLTIPLAS INSTÂNCIAS DE UMA SÓ VEZ)
      case "BULK_ADD_INSTANCES": {
        const {
          default_server_url,
          default_api_key,
          items,
        } = payload as {
          default_server_url?: string;
          default_api_key?: string;
          items: Array<{ name: string; server_url?: string; api_key?: string } | string>;
        };

        let addedCount = 0;
        let updatedCount = 0;

        for (const item of items) {
          let name = "";
          let serverUrl = default_server_url || "";
          let apiKey = default_api_key || "";

          if (typeof item === "string") {
            const parts = item.split(/[,;\t]/).map((p) => p.trim());
            name = parts[0] || "";
            if (parts[1]) serverUrl = parts[1];
            if (parts[2]) apiKey = parts[2];
          } else if (item && typeof item === "object") {
            name = item.name || "";
            if (item.server_url) serverUrl = item.server_url;
            if (item.api_key) apiKey = item.api_key;
          }

          name = name.trim();
          serverUrl = cleanEvolutionUrl(serverUrl);
          apiKey = apiKey.trim();

          if (!name) continue;

          const existingIdx = state.evolution_instances.findIndex(
            (i) => i.name.toLowerCase() === name.toLowerCase()
          );

          if (existingIdx >= 0) {
            state.evolution_instances[existingIdx] = {
              ...state.evolution_instances[existingIdx],
              server_url: serverUrl || state.evolution_instances[existingIdx].server_url,
              api_key: apiKey || state.evolution_instances[existingIdx].api_key,
            };
            updatedCount++;
          } else {
            state.evolution_instances.push({
              id: `inst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name,
              server_url: serverUrl,
              api_key: apiKey,
              status: "unknown",
              contacts_count: 0,
              active: true,
              created_at: new Date().toISOString(),
            });
            addedCount++;
          }
        }

        writeLocalDb(state);
        await syncStateToSupabaseIfConfigured(state);

        return NextResponse.json({
          ok: true,
          addedCount,
          updatedCount,
          total: state.evolution_instances.length,
          state,
        });
      }

      // 3. DESCOBRIR INSTÂNCIAS NO SERVIDOR DA EVOLUTION API
      case "DISCOVER_SERVER_INSTANCES": {
        const { server_url, global_api_key } = payload as {
          server_url: string;
          global_api_key: string;
        };

        const cleanUrl = cleanEvolutionUrl(server_url);
        const cleanKey = global_api_key.trim();

        if (!cleanUrl || !cleanKey) {
          return NextResponse.json(
            { error: "URL do servidor e Global API Key são obrigatórios." },
            { status: 400 }
          );
        }

        let res: Response;
        try {
          res = await fetch(`${cleanUrl}/instance/fetchInstances`, {
            headers: {
              apikey: cleanKey,
              "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(10000),
          });
        } catch (fetchErr) {
          return NextResponse.json(
            {
              error: `Falha ao conectar no servidor Evolution (${cleanUrl}): ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`,
            },
            { status: 502 }
          );
        }

        if (!res.ok) {
          const errText = await res.text();
          return NextResponse.json(
            {
              error: `Erro ao consultar instâncias na Evolution API (${res.status}): ${errText.slice(0, 200)}`,
            },
            { status: 400 }
          );
        }

        let discovered: unknown;
        try {
          discovered = await res.json();
        } catch {
          return NextResponse.json(
            { error: "Resposta inválida recebida da Evolution API (não é JSON)." },
            { status: 502 }
          );
        }

        const discObj = (discovered && typeof discovered === "object" ? discovered : {}) as Record<string, unknown>;
        const list: Array<Record<string, unknown>> = Array.isArray(discovered)
          ? (discovered as Array<Record<string, unknown>>)
          : Array.isArray(discObj.instances)
          ? (discObj.instances as Array<Record<string, unknown>>)
          : Array.isArray(discObj.data)
          ? (discObj.data as Array<Record<string, unknown>>)
          : [];

        let imported = 0;

        for (const item of list) {
          const instName =
            (item.name as string) ||
            (item.instanceName as string) ||
            ((item.instance as Record<string, unknown>)?.name as string) ||
            "";

          if (!instName) continue;

          const instStatus =
            (item.connectionStatus as string) ||
            (item.status as string) ||
            ((item.instance as Record<string, unknown>)?.status as string) ||
            "unknown";

          const phone =
            (item.number as string) ||
            (item.ownerJid as string) ||
            ((item.instance as Record<string, unknown>)?.ownerJid as string) ||
            "";

          const profileName =
            (item.profileName as string) ||
            ((item.instance as Record<string, unknown>)?.profileName as string) ||
            undefined;

          const profilePic =
            (item.profilePicUrl as string) ||
            ((item.instance as Record<string, unknown>)?.profilePicUrl as string) ||
            undefined;

          const itemToken = (item.token as string) || cleanKey;

          const existingIdx = state.evolution_instances.findIndex(
            (i) => i.name.toLowerCase() === instName.toLowerCase()
          );

          const record: EvolutionInstance = {
            id:
              existingIdx >= 0
                ? state.evolution_instances[existingIdx].id
                : `inst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: instName,
            server_url: cleanUrl,
            api_key: itemToken,
            status: instStatus === "open" ? "open" : instStatus === "close" ? "close" : "unknown",
            phone_number: phone ? normalizePhoneNumber(phone).phone : undefined,
            profile_name: profileName,
            profile_picture_url: isEphemeralWhatsappCdn(profilePic) ? undefined : profilePic,
            contacts_count:
              existingIdx >= 0 ? state.evolution_instances[existingIdx].contacts_count : 0,
            active: true,
            created_at:
              existingIdx >= 0
                ? state.evolution_instances[existingIdx].created_at
                : new Date().toISOString(),
          };

          if (existingIdx >= 0) {
            state.evolution_instances[existingIdx] = record;
          } else {
            state.evolution_instances.push(record);
          }
          imported++;
        }

        writeLocalDb(state);
        await syncStateToSupabaseIfConfigured(state);

        return NextResponse.json({
          ok: true,
          imported,
          total: state.evolution_instances.length,
          state,
        });
      }

      // 4. TESTAR / ATUALIZAR STATUS DE UMA INSTÂNCIA
      case "CHECK_INSTANCE_STATUS": {
        const { instanceId } = payload as { instanceId: string };
        const inst = state.evolution_instances.find((i) => i.id === instanceId);
        if (!inst) {
          return NextResponse.json({ error: "Instância não encontrada." }, { status: 404 });
        }

        const cleanInstUrl = cleanEvolutionUrl(inst.server_url);
        inst.server_url = cleanInstUrl;

        try {
          const res = await fetch(
            `${cleanInstUrl}/instance/connectionState/${inst.name}`,
            {
              headers: {
                apikey: inst.api_key,
                "Content-Type": "application/json",
              },
              signal: AbortSignal.timeout(8000),
            }
          );

          if (res.ok) {
            const data = await res.json();
            const stateValue =
              data?.instance?.state || data?.state || (data?.status as string) || "unknown";

            inst.status = stateValue === "open" ? "open" : "close";
            if (data?.instance?.phoneNumber) {
              inst.phone_number = normalizePhoneNumber(data.instance.phoneNumber).phone || data.instance.phoneNumber;
            }
            if (data?.instance?.profileName) inst.profile_name = data.instance.profileName;
            if (data?.instance?.profilePictureUrl && !isEphemeralWhatsappCdn(data.instance.profilePictureUrl)) {
              inst.profile_picture_url = data.instance.profilePictureUrl;
            }
          } else {
            inst.status = "close";
          }
        } catch {
          inst.status = "close";
        }

        writeLocalDb(state);
        await syncStateToSupabaseIfConfigured(state);

        return NextResponse.json({ ok: true, instance: inst, state });
      }

      // 5. EXCLUIR INSTÂNCIA
      case "DELETE_INSTANCE": {
        const { instanceId } = payload as { instanceId: string };
        const target = state.evolution_instances.find((i) => i.id === instanceId);
        if (target) {
          const instName = target.name;
          state.evolution_instances = state.evolution_instances.filter(
            (i) => i.id !== instanceId
          );

          state.evolution_contacts = state.evolution_contacts
            .map((c) => {
              const updatedInstances = c.instances.filter((n) => n !== instName);
              const count = updatedInstances.length;
              return {
                ...c,
                instances: updatedInstances,
                instances_count: count,
                is_repeated: count > 1,
              };
            })
            .filter((c) => c.instances_count > 0);

          writeLocalDb(state);
          await syncStateToSupabaseIfConfigured(state);
        }

        return NextResponse.json({ ok: true, state });
      }

      // 6. SINCRONIZAR CONTATOS DA AGENDA DE TODAS AS INSTÂNCIAS
      case "SYNC_ALL_CONTACTS": {
        const activeInstances = state.evolution_instances.filter((i) => i.active);

        if (activeInstances.length === 0) {
          return NextResponse.json(
            { error: "Nenhuma instância cadastrada para sincronizar." },
            { status: 400 }
          );
        }

        const emailByPhoneMap = new Map<string, string>();
        for (const cust of state.customers || []) {
          if (cust.phone && cust.email) {
            const digits = cust.phone.replace(/\D/g, "");
            if (digits) emailByPhoneMap.set(digits, cust.email);
            if (digits.startsWith("55")) emailByPhoneMap.set(digits.slice(2), cust.email);
          }
        }

        const unifiedMap = new Map<string, EvolutionContact>();

        // Preserva contatos existentes e dados já enriquecidos (cargo, empresa, social, email) com normalização canônica
        for (const oldContact of state.evolution_contacts) {
          const norm = normalizePhoneNumber(oldContact.phone);
          const canonicalPhone = norm.phone || oldContact.phone;
          const existing = unifiedMap.get(canonicalPhone);
          if (existing) {
            for (const instName of oldContact.instances || []) {
              if (!existing.instances.includes(instName)) {
                existing.instances.push(instName);
              }
            }
            existing.instances_count = existing.instances.length;
            existing.is_repeated = existing.instances_count > 1;
            if (!existing.has_valid_name && oldContact.has_valid_name) {
              existing.name = oldContact.name;
              existing.has_valid_name = true;
            }
            if (!existing.email && oldContact.email) existing.email = oldContact.email;
            if (!existing.job_title && oldContact.job_title) existing.job_title = oldContact.job_title;
            if (!existing.company && oldContact.company) existing.company = oldContact.company;
            if (!existing.social_links && oldContact.social_links) existing.social_links = oldContact.social_links;
          } else {
            unifiedMap.set(canonicalPhone, {
              ...oldContact,
              id: canonicalPhone,
              phone: canonicalPhone,
              formatted_phone: norm.formatted_phone || oldContact.formatted_phone,
              ddd: norm.ddd || oldContact.ddd,
              state_uf: norm.state_uf || oldContact.state_uf,
              city: norm.city || oldContact.city,
            });
          }
        }

        const instanceContactCounts = new Map<string, number>();

        for (const inst of activeInstances) {
          const cleanInstUrl = cleanEvolutionUrl(inst.server_url);
          inst.server_url = cleanInstUrl;

          if (!cleanInstUrl || !inst.api_key) continue;

          let rawContactsList: Array<Record<string, unknown>> = [];

          try {
            // Tenta POST /chat/findContacts/{instance} com body {}
            let res = await fetch(
              `${cleanInstUrl}/chat/findContacts/${inst.name}`,
              {
                method: "POST",
                headers: {
                  apikey: inst.api_key,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({}),
                signal: AbortSignal.timeout(12000),
              }
            );

            if (!res.ok) {
              res = await fetch(`${cleanInstUrl}/chat/findContacts/${inst.name}`, {
                headers: { apikey: inst.api_key },
                signal: AbortSignal.timeout(10000),
              });
            }

            if (!res.ok) {
              res = await fetch(`${cleanInstUrl}/contact/find/${inst.name}`, {
                headers: { apikey: inst.api_key },
                signal: AbortSignal.timeout(10000),
              });
            }

            if (res.ok) {
              const data = await res.json();
              rawContactsList = Array.isArray(data)
                ? data
                : data.contacts || data.data || [];
            }
          } catch (fetchErr) {
            console.error(`Aviso: Falha ao buscar contatos da instância ${inst.name}:`, fetchErr);
          }

          let validCountInInstance = 0;

          for (const item of rawContactsList) {
            // Em Evolution v2, o telefone fica em remoteJid, jid ou number. O campo item.id é o UUID interno do banco!
            const jid =
              (item.remoteJid as string) ||
              (item.jid as string) ||
              (item.number as string) ||
              ((item.id as string)?.includes("@") ? (item.id as string) : "") ||
              "";

            if (
              !jid ||
              item.isGroup === true ||
              jid.includes("@g.us") ||
              jid.includes("broadcast") ||
              jid.includes("@lid")
            ) {
              continue;
            }

            const norm = normalizePhoneNumber(jid);
            if (!norm.phone || norm.phone.length < 8) continue;

            validCountInInstance++;

            const rawName =
              (item.pushName as string) ||
              (item.name as string) ||
              (item.notify as string) ||
              (item.shortName as string) ||
              "";

            const pushName = (item.pushName as string) || undefined;
            const rawProfilePic =
              (item.profilePictureUrl as string) ||
              (item.profilePicUrl as string) ||
              undefined;
            const profilePic = isEphemeralWhatsappCdn(rawProfilePic) ? undefined : rawProfilePic;

            const hasValid = isValidContactName(rawName, norm.phone);
            const sanitizedName = hasValid
              ? rawName.trim()
              : pushName && isValidContactName(pushName, norm.phone)
              ? pushName.trim()
              : norm.formatted_phone;

            const existingEmail =
              emailByPhoneMap.get(norm.phone) ||
              (norm.phone.startsWith("55") ? emailByPhoneMap.get(norm.phone.slice(2)) : undefined);

            const existing = unifiedMap.get(norm.phone);

            if (existing) {
              if (!existing.instances.includes(inst.name)) {
                existing.instances.push(inst.name);
                existing.instances_count = existing.instances.length;
                existing.is_repeated = existing.instances_count > 1;
              }
              if (!existing.has_valid_name && hasValid) {
                existing.name = sanitizedName;
                existing.has_valid_name = true;
              }
              if (!existing.profile_picture_url && profilePic) {
                existing.profile_picture_url = profilePic;
              }
              if (!existing.email && existingEmail) {
                existing.email = existingEmail;
              }
            } else {
              unifiedMap.set(norm.phone, {
                id: norm.phone,
                phone: norm.phone,
                formatted_phone: norm.formatted_phone,
                name: sanitizedName,
                push_name: pushName,
                email: existingEmail,
                ddd: norm.ddd,
                state_uf: norm.state_uf,
                city: norm.city,
                source_type: "DIRECT_CONTACT",
                source_groups: [],
                is_national: norm.is_national,
                country_code: norm.country_code,
                country_name: norm.country_name,
                instances: [inst.name],
                instances_count: 1,
                is_repeated: false,
                profile_picture_url: profilePic,
                has_valid_name: hasValid,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
            }
          }

          instanceContactCounts.set(inst.name, validCountInInstance);
        }

        state.evolution_instances = state.evolution_instances.map((i) => ({
          ...i,
          contacts_count: instanceContactCounts.get(i.name) ?? i.contacts_count ?? 0,
          last_sync: new Date().toISOString(),
        }));

        state.evolution_contacts = Array.from(unifiedMap.values()).map((c) => ({
          ...c,
          is_repeated: c.instances_count > 1,
        }));

        writeLocalDb(state);
        await syncStateToSupabaseIfConfigured(state);

        return NextResponse.json({
          ok: true,
          totalContacts: state.evolution_contacts.length,
          unique: state.evolution_contacts.filter((c) => !c.is_repeated).length,
          repeated: state.evolution_contacts.filter((c) => c.is_repeated).length,
          national: state.evolution_contacts.filter((c) => c.is_national).length,
          international: state.evolution_contacts.filter((c) => !c.is_national).length,
          validNames: state.evolution_contacts.filter((c) => c.has_valid_name).length,
          state,
        });
      }

      // 7. LISTAR GRUPOS DE WHATSAPP DAS INSTÂNCIAS (GET /group/fetchAllGroups)
      case "FETCH_GROUPS_LIST": {
        const activeInstances = state.evolution_instances.filter((i) => i.active);
        const groupsList: EvolutionWhatsAppGroup[] = [];

        for (const inst of activeInstances) {
          const cleanInstUrl = cleanEvolutionUrl(inst.server_url);
          if (!cleanInstUrl || !inst.api_key) continue;

          try {
            const res = await fetch(
              `${cleanInstUrl}/group/fetchAllGroups/${inst.name}?getParticipants=false`,
              {
                headers: { apikey: inst.api_key },
                signal: AbortSignal.timeout(10000),
              }
            );

            if (res.ok) {
              const data = await res.json();
              const arr: Array<Record<string, unknown>> = Array.isArray(data)
                ? data
                : data.groups || data.data || [];

              for (const g of arr) {
                const jid = (g.id as string) || (g.jid as string) || "";
                const subject = (g.subject as string) || (g.name as string) || "Grupo sem nome";
                const size =
                  Number(g.size || (Array.isArray(g.participants) ? g.participants.length : 0)) || 0;

                groupsList.push({
                  id: jid,
                  subject,
                  instance_name: inst.name,
                  participants_count: size,
                  description: (g.desc as string) || undefined,
                });
              }
            }
          } catch (err) {
            console.error(`Erro ao listar grupos da instância ${inst.name}:`, err);
          }
        }

        return NextResponse.json({ ok: true, groups: groupsList });
      }

      // 8. EXTRAIR MEMBROS DE GRUPOS E CONVERTER EM LEADS
      case "EXTRACT_GROUP_MEMBERS": {
        const { groupJids } = payload as { groupJids?: string[] }; // se vazio, extrai de todos os grupos
        const activeInstances = state.evolution_instances.filter((i) => i.active);

        let extractedCount = 0;
        let newLeadsCount = 0;

        const unifiedMap = new Map<string, EvolutionContact>();
        for (const c of state.evolution_contacts) {
          const norm = normalizePhoneNumber(c.phone);
          const canonicalPhone = norm.phone || c.phone;
          const existing = unifiedMap.get(canonicalPhone);
          if (existing) {
            for (const instName of c.instances || []) {
              if (!existing.instances.includes(instName)) {
                existing.instances.push(instName);
              }
            }
            existing.instances_count = existing.instances.length;
            existing.is_repeated = existing.instances_count > 1;
            if (!existing.has_valid_name && c.has_valid_name) {
              existing.name = c.name;
              existing.has_valid_name = true;
            }
          } else {
            unifiedMap.set(canonicalPhone, {
              ...c,
              id: canonicalPhone,
              phone: canonicalPhone,
              formatted_phone: norm.formatted_phone || c.formatted_phone,
              ddd: norm.ddd || c.ddd,
              state_uf: norm.state_uf || c.state_uf,
              city: norm.city || c.city,
            });
          }
        }

        for (const inst of activeInstances) {
          const cleanInstUrl = cleanEvolutionUrl(inst.server_url);
          if (!cleanInstUrl || !inst.api_key) continue;

          try {
            const res = await fetch(
              `${cleanInstUrl}/group/fetchAllGroups/${inst.name}?getParticipants=true`,
              {
                headers: { apikey: inst.api_key },
                signal: AbortSignal.timeout(15000),
              }
            );

            if (!res.ok) continue;

            const data = await res.json();
            const arr: Array<Record<string, unknown>> = Array.isArray(data)
              ? data
              : data.groups || data.data || [];

            for (const g of arr) {
              const jid = (g.id as string) || (g.jid as string) || "";
              if (groupJids && groupJids.length > 0 && !groupJids.includes(jid)) {
                continue;
              }

              const subject = (g.subject as string) || (g.name as string) || "Grupo WhatsApp";
              const participants = (g.participants as Array<Record<string, unknown>>) || [];

              for (const part of participants) {
                const partJid = (part.id as string) || (part.jid as string) || "";
                if (!partJid || partJid.includes("broadcast")) continue;

                const norm = normalizePhoneNumber(partJid);
                if (!norm.phone || norm.phone.length < 8) continue;

                extractedCount++;

                const existing = unifiedMap.get(norm.phone);

                if (existing) {
                  if (!existing.instances.includes(inst.name)) {
                    existing.instances.push(inst.name);
                    existing.instances_count = existing.instances.length;
                    existing.is_repeated = existing.instances_count > 1;
                  }
                  existing.source_groups = existing.source_groups || [];
                  if (!existing.source_groups.includes(subject)) {
                    existing.source_groups.push(subject);
                  }
                } else {
                  newLeadsCount++;
                  unifiedMap.set(norm.phone, {
                    id: norm.phone,
                    phone: norm.phone,
                    formatted_phone: norm.formatted_phone,
                    name: norm.formatted_phone, // Temporário até achar o nome no enriquecimento
                    ddd: norm.ddd,
                    state_uf: norm.state_uf,
                    city: norm.city,
                    source_type: "GROUP_MEMBER",
                    source_groups: [subject],
                    is_national: norm.is_national,
                    country_code: norm.country_code,
                    country_name: norm.country_name,
                    instances: [inst.name],
                    instances_count: 1,
                    is_repeated: false,
                    has_valid_name: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  });
                }
              }
            }
          } catch (err) {
            console.error(`Erro ao extrair participantes dos grupos na instância ${inst.name}:`, err);
          }
        }

        state.evolution_contacts = Array.from(unifiedMap.values()).map((c) => ({
          ...c,
          is_repeated: c.instances_count > 1,
        }));

        writeLocalDb(state);
        await syncStateToSupabaseIfConfigured(state);

        return NextResponse.json({
          ok: true,
          extractedCount,
          newLeadsCount,
          totalContacts: state.evolution_contacts.length,
          state,
        });
      }

      // 9. ENRIQUECER CONTATOS / ACHAR NOMES E BIOS DE NÚMEROS SEM NOME
      case "ENRICH_CONTACT_PROFILES": {
        const activeInstances = state.evolution_instances.filter((i) => i.status === "open" && i.active);
        const fallbackInstance = activeInstances[0] || state.evolution_instances[0];

        if (!fallbackInstance) {
          return NextResponse.json(
            { error: "Nenhuma instância conectada para consultar perfis no WhatsApp." },
            { status: 400 }
          );
        }

        // Pega contatos sem nome válido ou sem bio
        const targets = state.evolution_contacts.filter(
          (c) => !c.has_valid_name || !c.about_bio || !c.profile_picture_url
        );

        let enrichedCount = 0;

        for (const contact of targets.slice(0, 50)) {
          // Usa a primeira instância associada ao contato ou a padrão
          const instName = contact.instances[0] || fallbackInstance.name;
          const inst = state.evolution_instances.find((i) => i.name === instName) || fallbackInstance;
          const cleanInstUrl = cleanEvolutionUrl(inst.server_url);

          try {
            // Consulta perfil via Evolution API: POST /chat/fetchProfile/{instance}
            const res = await fetch(`${cleanInstUrl}/chat/fetchProfile/${inst.name}`, {
              method: "POST",
              headers: {
                apikey: inst.api_key,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ number: contact.phone }),
              signal: AbortSignal.timeout(6000),
            });

            if (res.ok) {
              const profile = await res.json();
              let updated = false;

              if (profile?.name && isValidContactName(profile.name, contact.phone)) {
                contact.name = profile.name.trim();
                contact.has_valid_name = true;
                updated = true;
              }

              if (profile?.status || profile?.about) {
                contact.about_bio = profile.status || profile.about;
                updated = true;
              }

              const pic = profile?.profilePictureUrl || profile?.picture;
              if (pic && !isEphemeralWhatsappCdn(pic)) {
                contact.profile_picture_url = pic;
                updated = true;
              }

              if (profile?.isBusiness) {
                contact.is_business = true;
                if (profile?.description) contact.business_category = profile.description;
                updated = true;
              }

              if (updated) {
                contact.updated_at = new Date().toISOString();
                enrichedCount++;
              }
            }
          } catch {
            // Ignora falhas individuais para não travar a lista
          }
        }

        writeLocalDb(state);
        await syncStateToSupabaseIfConfigured(state);

        return NextResponse.json({
          ok: true,
          enrichedCount,
          totalContacts: state.evolution_contacts.length,
          state,
        });
      }

      // 10. SALVAR DETALHES COMPLETOS DE UM LEAD (CARGO, EMPRESA, SOCIAL, ETC.)
      case "SAVE_LEAD_DETAILS": {
        const updatedLead = payload as EvolutionContact;
        const idx = state.evolution_contacts.findIndex((c) => c.id === updatedLead.id);

        if (idx >= 0) {
          const hasValid = isValidContactName(updatedLead.name, updatedLead.phone);
          state.evolution_contacts[idx] = {
            ...state.evolution_contacts[idx],
            ...updatedLead,
            has_valid_name: hasValid,
            updated_at: new Date().toISOString(),
          };

          writeLocalDb(state);
          await syncStateToSupabaseIfConfigured(state);
        }

        return NextResponse.json({ ok: true, contact: state.evolution_contacts[idx], state });
      }

      // 11. ATUALIZAR E-MAIL DE UM CONTATO
      case "UPDATE_CONTACT_EMAIL": {
        const { contactId, email } = payload as { contactId: string; email: string };
        const target = state.evolution_contacts.find((c) => c.id === contactId);
        if (target) {
          target.email = email.trim().toLowerCase();
          target.updated_at = new Date().toISOString();
          writeLocalDb(state);
          await syncStateToSupabaseIfConfigured(state);
        }
        return NextResponse.json({ ok: true, contact: target, state });
      }

      // 12. LIMPAR LISTA DE CONTATOS
      case "CLEAR_CONTACTS": {
        state.evolution_contacts = [];
        state.evolution_instances = state.evolution_instances.map((i) => ({
          ...i,
          contacts_count: 0,
        }));
        writeLocalDb(state);
        await syncStateToSupabaseIfConfigured(state);
        return NextResponse.json({ ok: true, state });
      }

      // 13. CAMPANHA DE APRESENTAÇÃO DO CATÁLOGO (EXCLUSIVO INSTÂNCIA "VENDAS LYNX")
      case "SEND_CATALOG_CAMPAIGN": {
        const {
          instance_name,
          contact_ids,
          message_template,
          catalog_url,
        } = payload as {
          instance_name: string;
          contact_ids: string[];
          message_template?: string;
          catalog_url?: string;
        };

        const cleanInstName = (instance_name || "").trim();
        if (cleanInstName.toLowerCase() !== "vendas lynx") {
          return NextResponse.json(
            {
              error:
                "Ação bloqueada: Somente a instância 'Vendas Lynx' tem autorização para disparos de catálogo.",
            },
            { status: 403 }
          );
        }

        // Localiza a instância "Vendas Lynx" no banco de dados
        const salesInstance = state.evolution_instances.find(
          (i) => i.name.trim().toLowerCase() === "vendas lynx"
        );

        if (!salesInstance) {
          return NextResponse.json(
            {
              error:
                "A instância 'Vendas Lynx' ainda não foi cadastrada no sistema. Acesse a aba 'Instâncias Cadastradas' e cadastre a instância 'Vendas Lynx' para habilitar esta campanha.",
            },
            { status: 400 }
          );
        }

        const template =
          message_template ||
          'Olá, {nome}! Somos da Lynx. Conheça nossa loja oficial com soluções, produtos e sistemas: {link_catalogo}\n\nCaso não deseje mais receber nossas novidades e promoções, basta responder "PARAR" a qualquer momento.';

        const defaultAppUrl =
          process.env.NEXT_PUBLIC_APP_URL || "https://loja.lynxems.com.br";
        const finalCatalogUrl = catalog_url || `${defaultAppUrl}/loja`;

        let sentCount = 0;
        let skippedOptOutCount = 0;
        let errorsCount = 0;

        const targetContacts = state.evolution_contacts.filter((c) =>
          contact_ids.includes(c.id)
        );

        const nowIso = new Date().toISOString();

        for (const contact of targetContacts) {
          // REGRA DE SEGURANÇA & LEI GERAL / ANTI-SPAM:
          // Se o contato já tiver solicitado PARAR (OPTED_OUT), nunca recebe nova mensagem
          if (contact.consent_status === "OPTED_OUT") {
            skippedOptOutCount++;
            continue;
          }

          const personalizedMsg = template
            .replace(/\{nome\}/gi, contact.name && contact.has_valid_name ? contact.name : "amigo(a)")
            .replace(/\{link_catalogo\}/gi, finalCatalogUrl);

          try {
            const sendUrl = `${cleanEvolutionUrl(salesInstance.server_url)}/message/sendText/${encodeURIComponent(salesInstance.name)}`;
            const res = await fetch(sendUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: salesInstance.api_key,
              },
              body: JSON.stringify({
                number: contact.phone,
                text: personalizedMsg,
              }),
            });

            if (res.ok) {
              contact.consent_status = "PENDING";
              contact.consent_requested_at = nowIso;
              contact.consent_updated_at = nowIso;
              contact.updated_at = nowIso;
              sentCount++;
            } else {
              // Se a instância estiver offline ou retornar erro
              errorsCount++;
            }
          } catch {
            errorsCount++;
          }
        }

        writeLocalDb(state);
        await syncStateToSupabaseIfConfigured(state);

        return NextResponse.json({
          ok: true,
          sentCount,
          skippedOptOutCount,
          errorsCount,
          totalTargeted: targetContacts.length,
          state,
        });
      }

      // 14. ATUALIZAR STATUS DE CONSENTIMENTO MANUALMENTE
      case "UPDATE_CONSENT": {
        const { contact_id, consent_status, reason } = payload as {
          contact_id: string;
          consent_status: "NOT_CONTACTED" | "PENDING" | "OPTED_IN" | "OPTED_OUT";
          reason?: string;
        };

        const target = state.evolution_contacts.find((c) => c.id === contact_id);
        if (target) {
          target.consent_status = consent_status;
          target.consent_updated_at = new Date().toISOString();
          target.updated_at = new Date().toISOString();
          if (reason) target.opt_out_reason = reason;

          writeLocalDb(state);
          await syncStateToSupabaseIfConfigured(state);
        }

        return NextResponse.json({ ok: true, contact: target, state });
      }

      // 15. CAMPANHA DE PROMOÇÃO DE PRODUTO (REGRA ESTRITA: MÍNIMO 25H APÓS CONVITE E SEM PARAR)
      case "SEND_PROMOTION_CAMPAIGN": {
        const {
          instance_name,
          contact_ids,
          product_title,
          buy_link,
          price_label,
          message_template,
        } = payload as {
          instance_name: string;
          contact_ids: string[];
          product_title?: string;
          buy_link?: string;
          price_label?: string;
          message_template?: string;
        };

        const cleanInstName = (instance_name || "").trim();
        if (cleanInstName.toLowerCase() !== "vendas lynx") {
          return NextResponse.json(
            {
              error:
                "Ação bloqueada: Somente a instância dedicada 'Vendas Lynx' possui autorização para disparos promocionais.",
            },
            { status: 403 }
          );
        }

        // Localiza a instância "Vendas Lynx" no banco de dados
        const salesInstance = state.evolution_instances.find(
          (i) => i.name.trim().toLowerCase() === "vendas lynx"
        );

        if (!salesInstance) {
          return NextResponse.json(
            {
              error:
                "A instância 'Vendas Lynx' ainda não está cadastrada no sistema. Cadastre-a para realizar disparos promocionais.",
            },
            { status: 400 }
          );
        }

        const template =
          message_template ||
          'Olá, {nome}! Tudo bem?\n\nTemos uma oportunidade especial para você hoje: *{produto}*!\n\nConfira todos os detalhes e garanta a sua condição exclusiva no link direto abaixo:\n{link_venda}\n\nCaso não queira mais receber nossas ofertas, basta responder "PARAR" a qualquer momento.';

        let sentCount = 0;
        let skippedCoolingOffCount = 0;
        let skippedOptOutCount = 0;
        let skippedNoInviteCount = 0;
        let errorsCount = 0;

        const targetContacts = state.evolution_contacts.filter((c) =>
          contact_ids.includes(c.id)
        );

        const nowIso = new Date().toISOString();

        for (const contact of targetContacts) {
          // REGRA ESTABELECIDA:
          // A mensagem de promoção SÓ pode ser enviada no MÍNIMO 25 HORAS
          // após o envio da mensagem de convite/apresentação E desde que o contato
          // NÃO tenha solicitado "PARAR".
          const eligibility = checkPromotionEligibility(contact);

          if (!eligibility.allowed) {
            if (eligibility.status === "OPTED_OUT") {
              skippedOptOutCount++;
            } else if (eligibility.status === "COOLING_OFF") {
              skippedCoolingOffCount++;
            } else if (eligibility.status === "NO_INVITE") {
              skippedNoInviteCount++;
            }
            continue; // Bloqueado de receber promoção!
          }

          const appBaseUrl =
            process.env.NEXT_PUBLIC_APP_URL || "https://loja.lynxems.com.br";
          const defaultCatalog = `${appBaseUrl}/loja`;

          const personalizedMsg = template
            .replace(/\{nome\}/gi, contact.name && contact.has_valid_name ? contact.name : "amigo(a)")
            .replace(/\{produto\}/gi, product_title || "nossa oferta exclusiva")
            .replace(/\{link_venda\}/gi, buy_link || defaultCatalog)
            .replace(/\{preco\}/gi, price_label || "")
            .replace(/\{link_catalogo\}/gi, defaultCatalog);

          try {
            const sendUrl = `${cleanEvolutionUrl(salesInstance.server_url)}/message/sendText/${encodeURIComponent(salesInstance.name)}`;
            const res = await fetch(sendUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: salesInstance.api_key,
              },
              body: JSON.stringify({
                number: contact.phone,
                text: personalizedMsg,
              }),
            });

            if (res.ok) {
              contact.last_promo_sent_at = nowIso;
              contact.promo_sent_count = (contact.promo_sent_count || 0) + 1;
              contact.updated_at = nowIso;
              sentCount++;
            } else {
              errorsCount++;
            }
          } catch {
            errorsCount++;
          }
        }

        writeLocalDb(state);
        await syncStateToSupabaseIfConfigured(state);

        return NextResponse.json({
          ok: true,
          sentCount,
          skippedCoolingOffCount,
          skippedOptOutCount,
          skippedNoInviteCount,
          errorsCount,
          totalTargeted: targetContacts.length,
          state,
        });
      }

      default:
        return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
