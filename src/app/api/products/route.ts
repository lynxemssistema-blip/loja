import { NextRequest, NextResponse } from "next/server";
import {
  loadStateWithSupabase,
  writeLocalDb,
  syncStateToSupabaseIfConfigured,
} from "../../../lib/db";
import {
  extractTokenFromHeader,
  verifySessionToken,
} from "../../../lib/auth";
import {
  DEFAULT_PRODUCT_CATEGORIES,
  LynxProduct,
  ProductCategory,
  ProductCategoryItem,
} from "../../../lib/types";

const INITIAL_DEMO_PRODUCTS: LynxProduct[] = [
  {
    id: "prod-evo-leads",
    title: "Sistema Evolution API & Gestão de Leads",
    description:
      "Plataforma completa de extração de contatos, membros de grupos do WhatsApp e catálogo virtual integrado com link de checkout direto.",
    category: "SISTEMA",
    price: 197,
    price_label: "R$ 197,00 / mês",
    image_url:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    buy_link: "https://evo.lynxems.com.br",
    badge: "Mais Vendido",
    active: true,
    order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prod-asaas-split",
    title: "Kit Gestão Financeira & Split Asaas",
    description:
      "Regras automatizadas de split líquido, dedução de taxas e transparência financeira para parceiros e coprodutores.",
    category: "DIGITAL",
    price: 97,
    price_label: "R$ 97,00 (Pagamento Único)",
    image_url:
      "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
    buy_link: "https://www.asaas.com",
    badge: "Lançamento",
    active: true,
    order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prod-consultoria-lynx",
    title: "Consultoria e Automação de Vendas Lynx",
    description:
      "Implementação especializada de campanhas de WhatsApp, integração de gateways de pagamento e funis de conversão.",
    category: "SERVICO",
    price_label: "Sob Consulta",
    image_url:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
    buy_link: "https://wa.me/5531995574906",
    badge: "Destaque",
    active: true,
    order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedAdminMode = searchParams.get("admin") === "true";
    const category = searchParams.get("category");

    // Valida se o solicitante de modo administrativo é de fato um SuperAdmin
    let adminMode = false;
    if (requestedAdminMode) {
      const token = extractTokenFromHeader(req.headers.get("authorization"));
      const sessionUser = verifySessionToken(token);
      if (sessionUser && (sessionUser.role === "SUPERADMIN" || sessionUser.email.toLowerCase() === "edsonmanoel2012@gmail.com")) {
        adminMode = true;
      }
    }

    const { state } = await loadStateWithSupabase();

    // Se a lista de produtos estiver vazia, inicializa com os produtos demonstrativos
    if (!state.products || state.products.length === 0) {
      state.products = INITIAL_DEMO_PRODUCTS;
      writeLocalDb(state);
      await syncStateToSupabaseIfConfigured(state);
    }

    let products = state.products || [];

    if (!adminMode) {
      // Clientes públicos só enxergam produtos ativos
      products = products.filter((p) => p.active);
    }

    if (category && category !== "ALL") {
      products = products.filter(
        (p) => p.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Ordena: SINCO em primeiro lugar absoluto, seguido pelos produtos mais visitados e clicados
    products.sort((a, b) => {
      const isSincoA =
        a.id === "prod-1794226878875-fbmz" ||
        (a.title && a.title.toLowerCase().includes("sinco")) ||
        (a.description && a.description.toLowerCase().includes("sinco"));
      const isSincoB =
        b.id === "prod-1794226878875-fbmz" ||
        (b.title && b.title.toLowerCase().includes("sinco")) ||
        (b.description && b.description.toLowerCase().includes("sinco"));

      if (isSincoA && !isSincoB) return -1;
      if (!isSincoA && isSincoB) return 1;

      // Se houver ordem prioritária explícita definida
      const orderA = a.order ?? 99;
      const orderB = b.order ?? 99;
      if (orderA !== orderB) return orderA - orderB;

      // Ordena por popularidade: cliques e vendas
      const scoreA = (a.clicks_count || 0) + (a.sales_count || 0) * 2;
      const scoreB = (b.clicks_count || 0) + (b.sales_count || 0) * 2;
      return scoreB - scoreA;
    });

    // Combina categorias padrão e customizadas salvas
    const catMap = new Map<string, ProductCategoryItem>();
    DEFAULT_PRODUCT_CATEGORIES.forEach((c) => catMap.set(c.id.toUpperCase(), c));

    (state.product_categories || []).forEach((c) => {
      catMap.set(c.id.toUpperCase(), { ...c, is_custom: true });
    });

    // Também verifica categorias usadas nos produtos cadastrados
    (state.products || []).forEach((p) => {
      if (p.category && !catMap.has(p.category.toUpperCase())) {
        catMap.set(p.category.toUpperCase(), {
          id: p.category.toUpperCase(),
          name: p.custom_category || p.category,
          is_custom: true,
        });
      }
    });

    const categoryList = Array.from(catMap.values());

    return NextResponse.json({
      ok: true,
      products,
      categories: [
        { id: "ALL", key: "ALL", name: "Todos os Produtos", label: "Todos os Produtos" },
        ...categoryList.map((c) => ({
          id: c.id,
          key: c.id,
          name: c.name,
          label: c.name,
          is_custom: Boolean(c.is_custom),
        })),
      ],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    // Ação pública: registrar clique/visita em tempo real quando o cliente clica no produto
    if (action === "REGISTER_CLICK") {
      const { id } = (payload || {}) as { id: string };
      if (!id) {
        return NextResponse.json({ error: "ID do produto ausente" }, { status: 400 });
      }

      const { state } = await loadStateWithSupabase();
      state.products = state.products || [];
      const target = state.products.find((p) => p.id === id);
      if (target) {
        target.clicks_count = (target.clicks_count || 0) + 1;
        target.updated_at = new Date().toISOString();
        writeLocalDb(state);
        syncStateToSupabaseIfConfigured(state).catch(() => {});
        return NextResponse.json({ ok: true, id, clicks: target.clicks_count });
      }
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }

    // Demais ações requerem autenticação estrita de SuperAdmin
    const token = extractTokenFromHeader(req.headers.get("authorization"));
    const sessionUser = verifySessionToken(token);

    if (!sessionUser) {
      return NextResponse.json(
        { error: "Acesso não autorizado. Faça login para gerenciar produtos." },
        { status: 401 }
      );
    }

    const isSuperAdmin =
      sessionUser.role === "SUPERADMIN" ||
      sessionUser.email.toLowerCase() === "edsonmanoel2012@gmail.com";

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Permissão insuficiente. Apenas administradores podem gerenciar o catálogo de produtos." },
        { status: 403 }
      );
    }

    const { state } = await loadStateWithSupabase();
    state.products = state.products || [];
    state.product_categories = state.product_categories || [];

    switch (action) {
      case "SAVE_CATEGORY": {
        const { name, id } = payload as { name: string; id?: string };
        const cleanName = (name || "").trim();
        if (!cleanName) {
          return NextResponse.json(
            { error: "O nome da categoria é obrigatório." },
            { status: 400 }
          );
        }

        // Gera id único ou slug
        const cleanId = (
          id ||
          cleanName
            .toUpperCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^A-Z0-9]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_|_$/g, "") ||
          `CAT_${Date.now()}`
        ).trim();

        const existingIdx = state.product_categories.findIndex(
          (c) =>
            c.id.toUpperCase() === cleanId.toUpperCase() ||
            c.name.toLowerCase() === cleanName.toLowerCase()
        );

        const newCat: ProductCategoryItem = {
          id: cleanId,
          name: cleanName,
          is_custom: true,
        };

        if (existingIdx >= 0) {
          state.product_categories[existingIdx] = newCat;
        } else {
          state.product_categories.push(newCat);
        }

        writeLocalDb(state);
        await syncStateToSupabaseIfConfigured(state);

        return NextResponse.json({
          ok: true,
          category: newCat,
          categories: state.product_categories,
        });
      }

      case "DELETE_CATEGORY": {
        const { id } = payload as { id: string };
        state.product_categories = state.product_categories.filter(
          (c) => c.id.toUpperCase() !== id.toUpperCase()
        );
        writeLocalDb(state);
        await syncStateToSupabaseIfConfigured(state);
        return NextResponse.json({
          ok: true,
          categories: state.product_categories,
        });
      }
      case "SAVE_PRODUCT": {
        const prod = payload as Partial<LynxProduct>;
        if (!prod.title || !prod.buy_link) {
          return NextResponse.json(
            { error: "O título do produto e o link de venda são obrigatórios." },
            { status: 400 }
          );
        }

        const cleanBuyLink = prod.buy_link.trim();
        if (
          !cleanBuyLink.startsWith("http://") &&
          !cleanBuyLink.startsWith("https://")
        ) {
          return NextResponse.json(
            { error: "O link de venda deve começar com https:// ou http://" },
            { status: 400 }
          );
        }

        const existingIdx = state.products.findIndex((p) => p.id === prod.id);
        const now = new Date().toISOString();

        const record: LynxProduct = {
          id:
            prod.id ||
            `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: prod.title.trim(),
          description: prod.description ? prod.description.trim() : "",
          category: (prod.category as ProductCategory) || "DIGITAL",
          custom_category: prod.custom_category?.trim() || undefined,
          price:
            prod.price !== undefined && prod.price !== null
              ? Number(prod.price)
              : undefined,
          price_label: prod.price_label?.trim() || undefined,
          image_url: prod.image_url?.trim() || undefined,
          buy_link: cleanBuyLink,
          badge: prod.badge?.trim() || undefined,
          active: prod.active !== undefined ? Boolean(prod.active) : true,
          order: prod.order !== undefined ? Number(prod.order) : 0,
          clicks_count:
            prod.clicks_count !== undefined
              ? Number(prod.clicks_count)
              : existingIdx >= 0
              ? state.products[existingIdx].clicks_count ?? 635
              : 635,
          sales_count:
            prod.sales_count !== undefined
              ? Number(prod.sales_count)
              : existingIdx >= 0
              ? state.products[existingIdx].sales_count ?? 150
              : 150,
          rating:
            prod.rating !== undefined
              ? Number(prod.rating)
              : existingIdx >= 0
              ? state.products[existingIdx].rating ?? 5.0
              : 5.0,
          reviews_count:
            prod.reviews_count !== undefined
              ? Number(prod.reviews_count)
              : existingIdx >= 0
              ? state.products[existingIdx].reviews_count ?? 100
              : 100,
          created_at:
            existingIdx >= 0 ? state.products[existingIdx].created_at : now,
          updated_at: now,
        };

        if (existingIdx >= 0) {
          state.products[existingIdx] = record;
        } else {
          state.products.push(record);
        }

        writeLocalDb(state);
        await syncStateToSupabaseIfConfigured(state);

        return NextResponse.json({
          ok: true,
          product: record,
          products: state.products,
        });
      }

      case "DELETE_PRODUCT": {
        const { id } = payload as { id: string };
        state.products = state.products.filter((p) => p.id !== id);
        writeLocalDb(state);
        await syncStateToSupabaseIfConfigured(state);
        return NextResponse.json({ ok: true, products: state.products });
      }

      case "TOGGLE_ACTIVE": {
        const { id } = payload as { id: string };
        const target = state.products.find((p) => p.id === id);
        if (target) {
          target.active = !target.active;
          target.updated_at = new Date().toISOString();
          writeLocalDb(state);
          await syncStateToSupabaseIfConfigured(state);
        }
        return NextResponse.json({ ok: true, products: state.products });
      }

      default:
        return NextResponse.json(
          { error: `Ação desconhecida: ${action}` },
          { status: 400 }
        );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

