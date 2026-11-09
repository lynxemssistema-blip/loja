"use client";

import React, { useEffect, useMemo, useState } from "react";
import { LynxProduct, ProductCategoryItem } from "@/lib/types";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  HelpCircle,
  Layers,
  Lock,
  MessageCircle,
  Package,
  Search,
  Share2,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Zap,
} from "lucide-react";

export default function LojaPublicaPage() {
  const [products, setProducts] = useState<LynxProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      setLoading(true);
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        if (data.categories) {
          const cats = (data.categories as ProductCategoryItem[]).filter(
            (c) => c.id !== "ALL"
          );
          setCategories(cats);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar produtos da loja:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (
        selectedCategory !== "ALL" &&
        p.category.toUpperCase() !== selectedCategory.toUpperCase()
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesDesc = (p.description || "").toLowerCase().includes(q);
        const matchesBadge = (p.badge || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesBadge) return false;
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  function getCategoryColor(cat: string) {
    const upper = (cat || "").toUpperCase();
    switch (upper) {
      case "SISTEMA":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "DIGITAL":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "FISICO":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "SERVICO":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
    }
  }

  function getCategoryLabel(cat: string) {
    const found = categories.find(
      (c) => c.id.toUpperCase() === (cat || "").toUpperCase()
    );
    if (found) return found.name;

    const upper = (cat || "").toUpperCase();
    switch (upper) {
      case "SISTEMA":
        return "Sistema / Software";
      case "DIGITAL":
        return "Infoproduto / Digital";
      case "FISICO":
        return "Produto Físico";
      case "SERVICO":
        return "Serviço / Consultoria";
      default:
        return cat || "Geral";
    }
  }

  function getCategoryIcon(catId: string) {
    const upper = (catId || "").toUpperCase();
    switch (upper) {
      case "ALL":
        return Layers;
      case "SISTEMA":
        return Zap;
      case "DIGITAL":
        return Sparkles;
      case "FISICO":
        return Package;
      case "SERVICO":
        return Briefcase;
      default:
        return Tag;
    }
  }

  // Lista dinâmica de filtros
  const categoryFilters = useMemo(() => {
    const baseList: { id: string; label: string }[] = [
      { id: "ALL", label: "Todos os Produtos" },
    ];

    if (categories.length > 0) {
      categories.forEach((c) => {
        baseList.push({ id: c.id, label: c.name });
      });
    } else {
      baseList.push(
        { id: "SISTEMA", label: "Sistemas & Softwares" },
        { id: "DIGITAL", label: "Infoprodutos & Digitais" },
        { id: "FISICO", label: "Produtos Físicos" },
        { id: "SERVICO", label: "Serviços & Consultoria" }
      );
    }

    return baseList;
  }, [categories]);

  const handleShareProduct = (prod: LynxProduct) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(prod.buy_link);
      setCopiedLink(prod.id);
      setTimeout(() => setCopiedLink(null), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. TOP BANNER DE CONFIANÇA & SEGURANÇA */}
      <div className="bg-slate-900 text-slate-200 border-b border-slate-800 text-xs py-2 px-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4 text-[11px] font-medium">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              Ambiente 100% Seguro (SSL 256 bits)
            </span>
            <span className="hidden sm:flex items-center gap-1 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              Acesso Imediato & Entrega Digital
            </span>
            <span className="hidden md:flex items-center gap-1 text-slate-300">
              <BadgeCheck className="w-3.5 h-3.5 text-blue-400" />
              Garantia Oficial Lynx
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Dúvidas sobre alguma oferta?</span>
            <a
              href="https://wa.me/5531995574906?text=Ol%C3%A1%2C%20gostaria%20de%20tirar%20uma%20d%C3%BAvida%20sobre%20os%20produtos%20da%20loja"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp Oficial
            </a>
          </div>
        </div>
      </div>

      {/* 2. HEADER DA LOJA (LIMPO, CLARO E INSTITUCIONAL) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3.5 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                    LOJA LYNX
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    <BadgeCheck className="w-3 h-3 text-blue-600" />
                    Oficial
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Produtos, Soluções & Venda Direta
                </p>
              </div>
            </div>

            <div className="sm:hidden text-right">
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                ● Compra Segura
              </span>
            </div>
          </div>

          {/* Campo de Busca Leve */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar produtos, sistemas ou cursos..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
          </div>
        </div>
      </header>

      {/* 3. HERO / APRESENTAÇÃO AMIGÁVEL & CONFIÁVEL */}
      <section className="bg-gradient-to-b from-blue-50/60 to-transparent py-8 sm:py-10 border-b border-slate-200/50">
        <div className="max-w-6xl mx-auto px-4 text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-blue-200 text-blue-700 text-xs font-semibold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Soluções Selecionadas com Entrega Garantida
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Descubra Nossos Produtos & Lançamentos
          </h1>

          <p className="text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Escolha abaixo a solução perfeita para você ou sua empresa. Todos os links de checkout são protegidos com entrega imediata e suporte dedicado.
          </p>
        </div>
      </section>

      {/* 4. ÁREA PRINCIPAL DA VITRINE */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-6">
        {/* Filtros de Categoria em Estilo Pílula Leve */}
        <div className="flex items-center gap-2 pb-2 overflow-x-auto scrollbar-none">
          {categoryFilters.map((cat) => {
            const Icon = getCategoryIcon(cat.id);
            const isSelected =
              selectedCategory.toUpperCase() === cat.id.toUpperCase();
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-bold"
                    : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/90 shadow-2xs"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-slate-500"}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Listagem de Produtos */}
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-xs text-slate-500 font-medium">
              Carregando vitrine da Loja Lynx...
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center bg-white border border-slate-200 rounded-3xl p-8 space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Nenhum produto encontrado nesta categoria
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Tente selecionar &quot;Todos os Produtos&quot; ou limpe os termos de sua busca para ver todas as opções disponíveis.
            </p>
            {(selectedCategory !== "ALL" || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCategory("ALL");
                  setSearchQuery("");
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                Ver Todos os Produtos
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                className="bg-white border border-slate-200/90 hover:border-blue-400/80 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group"
              >
                {/* Banner / Foto do Produto */}
                <div className="relative aspect-video w-full bg-slate-100 overflow-hidden">
                  {prod.image_url ? (
                    <img
                      src={prod.image_url}
                      alt={prod.title}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-gradient-to-br from-slate-100 to-slate-200">
                      <ShoppingBag className="w-12 h-12 stroke-[1.5] text-slate-400" />
                      <span className="text-[11px] mt-1 text-slate-500 font-medium">
                        Imagem Oficial Lynx
                      </span>
                    </div>
                  )}

                  {/* Badge de Destaque */}
                  {prod.badge && (
                    <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
                      {prod.badge}
                    </div>
                  )}

                  {/* Badge de Categoria */}
                  <div className="absolute top-3 right-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${getCategoryColor(
                        prod.category
                      )}`}
                    >
                      {getCategoryLabel(prod.category)}
                    </span>
                  </div>
                </div>

                {/* Conteúdo & Informações */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h2 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                      {prod.title}
                    </h2>
                    {prod.description && (
                      <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                        {prod.description}
                      </p>
                    )}
                  </div>

                  {/* Preço e Botão de Venda Direta com Confiança */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider block">
                        Valor
                      </span>
                      <div className="text-base font-extrabold text-emerald-600">
                        {prod.price_label || (prod.price ? `R$ ${prod.price}` : "Sob Consulta")}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleShareProduct(prod)}
                        className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition"
                        title="Copiar link de venda direta"
                      >
                        {copiedLink === prod.id ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Share2 className="w-4 h-4" />
                        )}
                      </button>

                      <a
                        href={prod.buy_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition hover:scale-[1.02]"
                      >
                        <Lock className="w-3.5 h-3.5 text-blue-200" />
                        <span>Comprar Direto</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 5. SEÇÃO DE CONFIANÇA & BENEFÍCIOS (TRANSMITE TOTAL TRANQUILIDADE AO CLIENTE) */}
        <section className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-2 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Pagamento 100% Protegido
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Todos os pagamentos são processados em plataformas seguras e certificadas (Kiwify, Hotmart, Asaas, etc.) com criptografia de ponta.
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-2 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Liberação Imediata
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Para infoprodutos e sistemas, o acesso aos materiais ou ativação é enviado imediatamente no seu e-mail e WhatsApp após a confirmação.
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-2 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <MessageCircle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Suporte Humano Dedicado
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Nosso time está sempre à disposição para tirar qualquer dúvida antes, durante ou após a sua compra via WhatsApp.
            </p>
          </div>
        </section>

        {/* 6. DÚVIDAS FREQUENTES (FAQ RÁPIDO PARA QUEBRAR OBJEÇÕES) */}
        <section className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Perguntas Frequentes sobre as Compras
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
            <div className="space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
              <span className="font-bold text-slate-800">
                1. Quais são as formas de pagamento aceitas?
              </span>
              <p className="text-slate-500 leading-relaxed">
                Você pode pagar via Pix com compensação imediata, Cartão de Crédito com parcelamento em até 12x ou Boleto Bancário.
              </p>
            </div>

            <div className="space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
              <span className="font-bold text-slate-800">
                2. Tenho garantia se não ficar satisfeito?
              </span>
              <p className="text-slate-500 leading-relaxed">
                Sim! Todos os nossos produtos digitais e cursos contam com garantia incondicional de 7 dias conforme o Código de Defesa do Consumidor.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* 7. FOOTER DA LOJA */}
      <footer className="border-t border-slate-200 bg-white py-8 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-700 font-bold">
            <ShoppingBag className="w-4 h-4 text-blue-600" />
            <span>Loja Oficial Lynx • Todos os direitos reservados.</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Compra Segura</span>
            <span>•</span>
            <span>Privacidade Garantida</span>
            <span>•</span>
            <span>Suporte via WhatsApp</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
