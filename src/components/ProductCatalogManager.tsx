"use client";

import React, { useEffect, useState } from "react";
import {
  DEFAULT_PRODUCT_CATEGORIES,
  LynxProduct,
  ProductCategory,
  ProductCategoryItem,
} from "@/lib/types";
import {
  Briefcase,
  Check,
  CheckCircle2,
  Copy,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  FolderPlus,
  Layers,
  Link as LinkIcon,
  Package,
  Plus,
  Search,
  Share2,
  Sparkles,
  Tag,
  Trash2,
  X,
  Zap,
} from "lucide-react";

interface Props {
  notify: (type: "success" | "error", text: string) => void;
}

export default function ProductCatalogManager({ notify }: Props) {
  const [products, setProducts] = useState<LynxProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCatalog, setCopiedCatalog] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Gestão de Categorias Dinâmicas
  const [categories, setCategories] = useState<ProductCategoryItem[]>(DEFAULT_PRODUCT_CATEGORIES);
  const [showAddCategoryInline, setShowAddCategoryInline] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [showManageCategoriesModal, setShowManageCategoriesModal] = useState(false);

  // Modal de Produto
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ProductCategory>("DIGITAL");
  const [customCategory, setCustomCategory] = useState("");
  const [price, setPrice] = useState("");
  const [priceLabel, setPriceLabel] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [buyLink, setBuyLink] = useState("");
  const [badge, setBadge] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      const res = await fetch("/api/products?admin=true");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        if (data.categories && Array.isArray(data.categories)) {
          const validCats = data.categories
            .filter((c: any) => c.id !== "ALL" && c.key !== "ALL")
            .map((c: any) => ({
              id: c.id || c.key,
              name: c.name || c.label,
              is_custom: Boolean(c.is_custom),
            }));
          if (validCats.length > 0) {
            setCategories(validCats);
          }
        }
      }
    } catch {
      notify("error", "Falha ao carregar produtos.");
    } finally {
      setLoading(false);
    }
  }

  // Criação de Nova Categoria (pode ser chamada do modal ou da gestão)
  async function handleCreateCategory() {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      notify("error", "Digite um nome para a nova categoria.");
      return;
    }

    try {
      setSavingCategory(true);
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_CATEGORY",
          payload: { name: trimmed },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Erro ao salvar categoria");
      }

      notify("success", `Categoria "${trimmed}" adicionada com sucesso!`);
      const newCat: ProductCategoryItem = data.category;

      // Adiciona na lista local e seleciona no formulário ativo
      setCategories((prev) => {
        const exists = prev.some((c) => c.id.toUpperCase() === newCat.id.toUpperCase());
        return exists ? prev : [...prev, newCat];
      });

      setCategory(newCat.id);
      setCustomCategory(trimmed);
      setNewCategoryName("");
      setShowAddCategoryInline(false);
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Erro ao adicionar categoria");
    } finally {
      setSavingCategory(false);
    }
  }

  // Exclusão de Categoria Personalizada
  async function handleDeleteCategory(catId: string, catName: string) {
    if (!confirm(`Deseja remover a categoria "${catName}"?`)) return;

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_CATEGORY",
          payload: { id: catId },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Erro ao excluir categoria");
      }

      notify("success", `Categoria "${catName}" removida!`);
      setCategories((prev) => prev.filter((c) => c.id.toUpperCase() !== catId.toUpperCase()));
      if (category.toUpperCase() === catId.toUpperCase()) {
        setCategory("DIGITAL");
      }
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Erro ao remover categoria");
    }
  }

  function handleOpenNewModal() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setCategory("DIGITAL");
    setCustomCategory("");
    setPrice("");
    setPriceLabel("");
    setImageUrl("");
    setBuyLink("");
    setBadge("");
    setActive(true);
    setShowModal(true);
  }

  function handleEditProduct(prod: LynxProduct) {
    setEditingId(prod.id);
    setTitle(prod.title);
    setDescription(prod.description || "");
    setCategory(prod.category);
    setCustomCategory(prod.custom_category || "");
    setPrice(prod.price !== undefined ? String(prod.price) : "");
    setPriceLabel(prod.price_label || "");
    setImageUrl(prod.image_url || "");
    setBuyLink(prod.buy_link);
    setBadge(prod.badge || "");
    setActive(prod.active);
    setShowModal(true);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !buyLink.trim()) {
      notify("error", "Título e Link de Venda Direta são obrigatórios.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_PRODUCT",
          payload: {
            id: editingId || undefined,
            title: title.trim(),
            description: description.trim(),
            category,
            custom_category: customCategory.trim() || undefined,
            price: price.trim() ? Number(price.replace(",", ".")) : undefined,
            price_label: priceLabel.trim() || undefined,
            image_url: imageUrl.trim() || undefined,
            buy_link: buyLink.trim(),
            badge: badge.trim() || undefined,
            active,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        notify("error", data.error || "Erro ao salvar produto.");
        return;
      }

      setProducts(data.products || []);
      setShowModal(false);
      notify(
        "success",
        editingId ? "Produto atualizado com sucesso!" : "Produto cadastrado com sucesso!"
      );
    } catch {
      notify("error", "Falha de conexão ao salvar produto.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProduct(id: string, name: string) {
    if (!confirm(`Deseja realmente remover o produto "${name}" do catálogo?`)) {
      return;
    }

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_PRODUCT",
          payload: { id },
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setProducts(data.products || []);
        notify("success", "Produto removido com sucesso!");
      } else {
        notify("error", data.error || "Erro ao remover produto.");
      }
    } catch {
      notify("error", "Erro ao excluir produto.");
    }
  }

  async function handleToggleActive(id: string) {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_ACTIVE",
          payload: { id },
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setProducts(data.products || []);
        notify("success", "Status de visibilidade alterado!");
      }
    } catch {
      notify("error", "Erro ao alternar status do produto.");
    }
  }

  function handleCopyCatalogLink() {
    if (typeof window !== "undefined") {
      const catalogUrl = `${window.location.origin}/loja`;
      navigator.clipboard.writeText(catalogUrl);
      setCopiedCatalog(true);
      notify("success", "Link da Loja copiado para a área de transferência!");
      setTimeout(() => setCopiedCatalog(false), 3000);
    }
  }

  const filtered = products.filter((p) => {
    if (categoryFilter !== "ALL" && p.category !== categoryFilter) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      const matchesTitle = p.title.toLowerCase().includes(q);
      const matchesDesc = (p.description || "").toLowerCase().includes(q);
      const matchesBadge = (p.badge || "").toLowerCase().includes(q);
      if (!matchesTitle && !matchesDesc && !matchesBadge) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner de Ações Rápidas da Loja */}
      <div className="bg-gradient-to-r from-sky-950/70 via-slate-900 to-indigo-950/70 border border-sky-500/30 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Loja Oficial Lynx & Links de Venda Direta
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
              Admin
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Cadastre infoprodutos, produtos físicos, propagandas de sistemas e softwares.
            Cada produto possui seu link de venda direta próprio e fica disponível na vitrine pública da loja.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={handleCopyCatalogLink}
            className="flex-1 md:flex-initial px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white flex items-center justify-center gap-2 transition"
          >
            {copiedCatalog ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span>{copiedCatalog ? "Link Copiado!" : "Copiar Link da Loja"}</span>
          </button>

          <a
            href="/loja"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 md:flex-initial px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-700/50 text-indigo-300 hover:text-white flex items-center justify-center gap-2 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Ver Loja Pública</span>
          </a>

          <button
            type="button"
            onClick={() => setShowManageCategoriesModal(true)}
            className="flex-1 md:flex-initial px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-950/60 hover:bg-purple-900/60 border border-purple-700/50 text-purple-300 hover:text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
            title="Adicionar ou gerenciar categorias de produtos"
          >
            <Tag className="w-3.5 h-3.5 text-purple-400" />
            <span>Categorias ({categories.length})</span>
          </button>

          <button
            type="button"
            onClick={handleOpenNewModal}
            className="flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total de Produtos</span>
            <Package className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {products.length}
          </div>
          <div className="text-[10px] text-slate-400">No catálogo</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Ativos na Vitrine</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {products.filter((p) => p.active).length}
          </div>
          <div className="text-[10px] text-slate-400">Visíveis publicamente</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Sistemas & Softwares</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {products.filter((p) => p.category === "SISTEMA").length}
          </div>
          <div className="text-[10px] text-slate-400">SaaS e Ferramentas</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Infoprodutos & Digitais</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400">
            {products.filter((p) => p.category === "DIGITAL").length}
          </div>
          <div className="text-[10px] text-slate-400">Cursos e Ebooks</div>
        </div>
      </div>

      {/* Tabela de Gestão de Produtos */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
        {/* Filtros da Tabela */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todas as Categorias ({products.length})</option>
              {categories.map((c) => {
                const count = products.filter(
                  (p) => p.category.toUpperCase() === c.id.toUpperCase()
                ).length;
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filtrar por nome ou badge..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Listagem */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Carregando produtos...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl space-y-2">
            <Package className="w-8 h-8 text-slate-600 mx-auto" />
            <div>Nenhum produto cadastrado com esses filtros.</div>
            <button
              onClick={handleOpenNewModal}
              className="px-3 py-1.5 bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-semibold"
            >
              Cadastrar Primeiro Produto
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 pr-3 font-medium">Produto</th>
                  <th className="py-2.5 px-2 font-medium">Categoria</th>
                  <th className="py-2.5 px-2 font-medium">Preço / Condição</th>
                  <th className="py-2.5 px-2 font-medium">Link de Venda Direta</th>
                  <th className="py-2.5 px-2 font-medium text-center">Status</th>
                  <th className="py-2.5 pl-2 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filtered.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-800/30 transition">
                    {/* Imagem + Título */}
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                          {prod.image_url ? (
                            <img
                              src={prod.image_url}
                              alt={prod.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-5 h-5 text-slate-600" />
                          )}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span className="truncate">{prod.title}</span>
                            {prod.badge && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                {prod.badge}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">
                            {prod.description}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Categoria */}
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-slate-950 border-slate-800 text-slate-300">
                        {prod.category}
                      </span>
                    </td>

                    {/* Preço */}
                    <td className="py-3 px-2 font-mono font-bold text-emerald-400">
                      {prod.price_label ||
                        (prod.price !== undefined
                          ? `R$ ${prod.price.toFixed(2).replace(".", ",")}`
                          : "Sob Consulta")}
                    </td>

                    {/* Link de Venda Direta */}
                    <td className="py-3 px-2">
                      <a
                        href={prod.buy_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 max-w-[200px] truncate underline text-[11px]"
                        title={prod.buy_link}
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{prod.buy_link}</span>
                      </a>
                    </td>

                    {/* Status Ativo/Inativo */}
                    <td className="py-3 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(prod.id)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition ${
                          prod.active
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
                            : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                        }`}
                      >
                        {prod.active ? "Ativo" : "Inativo"}
                      </button>
                    </td>

                    {/* Ações */}
                    <td className="py-3 pl-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEditProduct(prod)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="Editar produto"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(prod.id, prod.title)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition"
                          title="Excluir produto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Cadastro e Edição de Produto */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-sky-400" />
                {editingId ? "Editar Produto / Oferta" : "Cadastrar Novo Produto"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-slate-800"
              >
                ✕ Fechar
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              {/* Título */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">
                  Nome do Produto / Oferta *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Sistema de Automação Evolution API, Curso de Tráfego, etc."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              {/* Link de Venda Direta (Obrigatório) */}
              <div className="space-y-1">
                <label className="text-sky-300 font-semibold flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-sky-400" />
                  Link de Venda Direta / Checkout *
                </label>
                <input
                  type="url"
                  required
                  value={buyLink}
                  onChange={(e) => setBuyLink(e.target.value)}
                  placeholder="https://pay.kiwify.com.br/... ou https://wa.me/..."
                  className="w-full bg-slate-950 border border-sky-500/40 focus:border-sky-400 rounded-xl px-3 py-2 text-white focus:outline-none font-mono"
                />
                <p className="text-[10px] text-slate-400">
                  O cliente clica no botão &quot;Acessar / Comprar&quot; no catálogo e é direcionado diretamente para esta URL.
                </p>
              </div>

              {/* Categoria + Preço */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-semibold">Categoria *</label>
                    <button
                      type="button"
                      onClick={() => setShowAddCategoryInline(!showAddCategoryInline)}
                      className="text-xs text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Adicionar uma nova categoria"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nova Categoria</span>
                    </button>
                  </div>

                  <select
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === "__ADD_NEW__") {
                        setShowAddCategoryInline(true);
                      } else {
                        setCategory(e.target.value as ProductCategory);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-white focus:outline-none cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.is_custom ? "★ (Personalizada)" : ""}
                      </option>
                    ))}
                    <option value="__ADD_NEW__" className="text-sky-400 font-bold">
                      + Adicionar Nova Categoria...
                    </option>
                  </select>

                  {/* Formulário Inline para adicionar categoria na hora */}
                  {showAddCategoryInline && (
                    <div className="p-3 bg-slate-950 border border-sky-500/50 rounded-xl space-y-2 mt-2 shadow-xl animate-in fade-in">
                      <div className="flex items-center justify-between text-xs font-bold text-sky-300">
                        <span className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-sky-400" />
                          Adicionar Nova Categoria:
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAddCategoryInline(false)}
                          className="text-slate-400 hover:text-white p-0.5"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          autoFocus
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Ex: Mentoria VIP, Calçados, Moda..."
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleCreateCategory();
                            }
                          }}
                        />
                        <button
                          type="button"
                          disabled={savingCategory || !newCategoryName.trim()}
                          onClick={handleCreateCategory}
                          className="px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Plus className="w-3 h-3" />
                          {savingCategory ? "Salvando..." : "Salvar"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">
                    Preço de Exibição / Condição
                  </label>
                  <input
                    type="text"
                    value={priceLabel}
                    onChange={(e) => setPriceLabel(e.target.value)}
                    placeholder="Ex: R$ 97,00 ou R$ 49/mês ou Sob Consulta"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* URL da Foto + Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">
                    URL da Imagem / Banner
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://.../foto-do-produto.jpg"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">
                    Etiqueta de Destaque (Badge)
                  </label>
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="Ex: Mais Vendido, Lançamento, 50% OFF"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">
                  Descrição / Detalhes do Produto
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Escreva um resumo claro sobre o que o produto oferece, benefícios e diferenciais..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-white focus:outline-none resize-none"
                />
              </div>

              {/* Checkbox Ativo */}
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-slate-700 text-sky-500"
                />
                <span className="font-semibold">
                  Produto Ativo (Visível na Vitrine Pública do Catálogo)
                </span>
              </label>

              {/* Botões */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold shadow-md transition disabled:opacity-50"
                >
                  {saving ? "Salvando..." : editingId ? "Salvar Alterações" : "Cadastrar Produto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE GERENCIAMENTO DE CATEGORIAS */}
      {showManageCategoriesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-400" />
                <h3 className="text-base font-bold text-white">
                  Gerenciar Categorias de Produtos
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowManageCategoriesModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Criar nova categoria */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <label className="text-xs font-semibold text-slate-200">
                Adicionar Nova Categoria
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ex: Cursos, Roupas, Eletrônicos, etc."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateCategory();
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={savingCategory || !newCategoryName.trim()}
                  onClick={handleCreateCategory}
                  className="px-4 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {savingCategory ? "Adicionando..." : "Adicionar"}
                </button>
              </div>
            </div>

            {/* Listagem de categorias cadastradas */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400">
                Categorias Disponíveis ({categories.length}):
              </span>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-xl">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-2.5 bg-slate-950/60 flex items-center justify-between text-xs hover:bg-slate-800/40 transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{cat.name}</span>
                      {cat.is_custom ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Personalizada
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                          Padrão
                        </span>
                      )}
                    </div>

                    {cat.is_custom && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Excluir categoria"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowManageCategoriesModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

