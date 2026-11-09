"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BillingType,
  LynxDatabaseState,
  LynxGroup,
  LynxGroupDeduction,
  LynxGroupSplit,
  LynxUser,
  PaymentStatus,
} from "../lib/types";
import { calculateGroupFinancialReport, formatBRL } from "../lib/calculator";
import TransparencyDashboard from "../components/TransparencyDashboard";
import GroupRuleBuilderModal from "../components/GroupRuleBuilderModal";
import EvolutionManager from "../components/EvolutionManager";
import ProductCatalogManager from "../components/ProductCatalogManager";
import {
  Building2,
  CheckCircle2,
  Database,
  Eye,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  MessageSquare,
  Package,
  Plus,
  RefreshCw,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  Sliders,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";

type ActiveTab = "DASHBOARD" | "GROUPS" | "PARTNERS" | "SETTINGS" | "EVOLUTION" | "PRODUCTS";

export default function ParceiroLynxApp() {
  const [state, setState] = useState<LynxDatabaseState | null>(null);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncingAsaas, setSyncingAsaas] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Controle de usuário ativo (Sistema PRIVADO: Requer autenticação obrigatória via e-mail e senha cadastrados)
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Navegação
  const [activeTab, setActiveTab] = useState<ActiveTab>("DASHBOARD");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("grp-horeb");
  const [referenceMonth, setReferenceMonth] = useState<string>("2026-11");

  // Modais do SuperAdmin
  const [editingGroup, setEditingGroup] = useState<{
    group?: LynxGroup;
    deductions: LynxGroupDeduction[];
    splits: LynxGroupSplit[];
  } | null>(null);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expDesc, setExpDesc] = useState("");
  const [expCategory, setExpCategory] = useState("Infraestrutura / Operação");
  const [expAmount, setExpAmount] = useState("");
  const [expDate, setExpDate] = useState("2026-11-08");
  const [expNotes, setExpNotes] = useState("");

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payCustomer, setPayCustomer] = useState("");
  const [payDesc, setPayDesc] = useState("");
  const [payGross, setPayGross] = useState("");
  const [payDiscount, setPayDiscount] = useState("0");
  const [payFee, setPayFee] = useState("1.99");
  const [payBilling, setPayBilling] = useState<BillingType>("PIX");
  const [payStatus, setPayStatus] = useState<PaymentStatus>("RECEIVED");
  const [payDate, setPayDate] = useState("2026-11-08");

  // Form de Parceiros
  const [editingPartner, setEditingPartner] = useState<LynxUser | null>(null);
  const [partnerName, setPartnerName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerPassword, setPartnerPassword] = useState("");
  const [partnerPix, setPartnerPix] = useState("");
  const [partnerDoc, setPartnerDoc] = useState("");
  const [partnerPhone, setPartnerPhone] = useState("");
  const [partnerGroupIds, setPartnerGroupIds] = useState<string[]>([
    "grp-horeb",
  ]);
  const [partnerDefaultSplit, setPartnerDefaultSplit] = useState("50");

  // Form de Configurações (Supabase VPS + Asaas)
  const [cfgAsaasUrl, setCfgAsaasUrl] = useState("https://api.asaas.com/v3");
  const [cfgAsaasKey, setCfgAsaasKey] = useState("");
  const [cfgSupabaseUrl, setCfgSupabaseUrl] = useState("");
  const [cfgSupabaseAnon, setCfgSupabaseAnon] = useState("");
  const [cfgSupabaseService, setCfgSupabaseService] = useState("");

  const notify = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchState = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/state");
      const data = await res.json();
      if (data.state) {
        setState(data.state);
        setSupabaseConnected(Boolean(data.supabaseConnected));
        setCfgAsaasUrl(
          data.state.settings?.asaas_api_url || "https://api.asaas.com/v3"
        );
        setCfgAsaasKey(data.state.settings?.asaas_api_key || "");
        setCfgSupabaseUrl(data.state.settings?.supabase_url || "");
        setCfgSupabaseAnon(data.state.settings?.supabase_anon_key || "");
        setCfgSupabaseService(
          data.state.settings?.supabase_service_role_key || ""
        );
      }
    } catch {
      notify("error", "Falha ao carregar dados do Parceiro Lynx.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    if (typeof window !== "undefined") {
      const savedUserId = localStorage.getItem("lynx_session_user_id");
      if (savedUserId) {
        setActiveUserId(savedUserId);
      }
      setAuthChecked(true);
    }
  }, []);

  const currentUser: LynxUser | undefined = useMemo(() => {
    if (!state || !activeUserId) return undefined;
    return state.users.find((u) => u.id === activeUserId);
  }, [state, activeUserId]);

  const isSuperAdmin =
    currentUser?.role === "SUPERADMIN" ||
    currentUser?.email.toLowerCase() === "edsonmanoel2012@gmail.com";

  // Grupos que o usuário atual está autorizado a visualizar
  const visibleGroups = useMemo(() => {
    if (!state || !currentUser) return [];
    if (isSuperAdmin) return state.groups;

    const allowedGroupIds = state.splits
      .filter((s) => s.partner_id === currentUser.id && s.can_view_group)
      .map((s) => s.group_id);

    return state.groups.filter((g) => allowedGroupIds.includes(g.id));
  }, [state, currentUser, isSuperAdmin]);

  // Garante que o grupo selecionado seja válido para o parceiro atual
  useEffect(() => {
    if (visibleGroups.length > 0) {
      const stillVisible = visibleGroups.some((g) => g.id === selectedGroupId);
      if (!stillVisible) {
        setSelectedGroupId(visibleGroups[0].id);
      }
    }
  }, [visibleGroups, selectedGroupId]);

  // Se mudar para visão de parceiro, volta para a aba DASHBOARD
  useEffect(() => {
    if (!isSuperAdmin && activeTab !== "DASHBOARD") {
      setActiveTab("DASHBOARD");
    }
  }, [isSuperAdmin, activeTab]);

  const activeGroup = useMemo(() => {
    return (
      visibleGroups.find((g) => g.id === selectedGroupId) || visibleGroups[0]
    );
  }, [visibleGroups, selectedGroupId]);

  const currentReport = useMemo(() => {
    if (!state || !activeGroup) return null;
    return calculateGroupFinancialReport({
      group: activeGroup,
      referenceMonth,
      allPayments: state.payments,
      allDeductions: state.deductions,
      allSplits: state.splits,
      allExpenses: state.expenses,
      allUsers: state.users,
      allPayouts: state.payouts,
    });
  }, [state, activeGroup, referenceMonth]);

  const postAction = async (
    action: string,
    payload: unknown,
    extra?: Record<string, unknown>
  ) => {
    const res = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload, ...extra }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || "Erro ao salvar alteração");
    }
    setState(data.state);
    if (data.supabaseSync?.synced) {
      setSupabaseConnected(true);
    }
    return data;
  };

  const handleSyncAsaas = async () => {
    setSyncingAsaas(true);
    try {
      const res = await fetch("/api/asaas/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asaas_api_url: cfgAsaasUrl,
          asaas_api_key: cfgAsaasKey,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        notify("error", data.error || "Erro ao sincronizar Asaas");
        if (!cfgAsaasKey) setActiveTab("SETTINGS");
        return;
      }
      setState(data.state);
      notify(
        "success",
        `Sincronização concluída! ${data.importedCount} cobranças e ${data.groupsCount} grupos atualizados do Asaas.`
      );
    } catch (e: unknown) {
      notify(
        "error",
        e instanceof Error ? e.message : "Erro ao conectar com Asaas"
      );
    } finally {
      setSyncingAsaas(false);
    }
  };

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName.trim() || !partnerEmail.trim()) return;
    try {
      const isEdson =
        partnerEmail.trim().toLowerCase() === "edsonmanoel2012@gmail.com";
      await postAction(
        "SAVE_PARTNER",
        {
          id: editingPartner?.id || `usr-${Date.now()}`,
          name: partnerName.trim(),
          email: partnerEmail.trim().toLowerCase(),
          password: partnerPassword.trim() || "parceiro123",
          role: isEdson ? "SUPERADMIN" : "PARTNER",
          pix_key: partnerPix.trim(),
          document: partnerDoc.trim(),
          phone: partnerPhone.trim(),
          active: true,
          created_at: editingPartner?.created_at || new Date().toISOString(),
        },
        {
          authorizedGroupIds: partnerGroupIds,
          defaultSplitPercentage: parseFloat(partnerDefaultSplit) || 50,
        }
      );
      notify(
        "success",
        editingPartner
          ? "Parceiro e permissões de grupos atualizados!"
          : "Novo parceiro cadastrado e vinculado aos grupos selecionados!"
      );
      setEditingPartner(null);
      setPartnerName("");
      setPartnerEmail("");
      setPartnerPassword("");
      setPartnerPix("");
      setPartnerDoc("");
      setPartnerPhone("");
    } catch (err: unknown) {
      notify(
        "error",
        err instanceof Error ? err.message : "Erro ao salvar parceiro"
      );
    }
  };

  const startEditPartner = (u: LynxUser) => {
    setEditingPartner(u);
    setPartnerName(u.name);
    setPartnerEmail(u.email);
    setPartnerPassword(u.password || "");
    setPartnerPix(u.pix_key || "");
    setPartnerDoc(u.document || "");
    setPartnerPhone(u.phone || "");
    if (state) {
      const gids = state.splits
        .filter((s) => s.partner_id === u.id && s.can_view_group)
        .map((s) => s.group_id);
      setPartnerGroupIds(gids);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state) return;
    const cleanEmail = loginEmail.trim().toLowerCase();
    const cleanPass = loginPassword.trim();

    const found = state.users.find(
      (u) => u.email.toLowerCase() === cleanEmail
    );

    if (!found) {
      notify(
        "error",
        "E-mail não autorizado. O cadastro de novos parceiros e usuários é feito exclusivamente pelo SuperAdmin."
      );
      return;
    }

    if (found.password && found.password.trim() !== cleanPass) {
      notify("error", "Senha incorreta.");
      return;
    }

    setActiveUserId(found.id);
    if (typeof window !== "undefined") {
      localStorage.setItem("lynx_session_user_id", found.id);
    }
    setLoginEmail("");
    setLoginPassword("");
    notify("success", `Bem-vindo(a), ${found.name}!`);
  };

  const handleLogout = () => {
    setActiveUserId(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("lynx_session_user_id");
    }
    notify("success", "Sessão encerrada com sucesso.");
  };

  if (loading || !state || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090d16] text-slate-300">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-sky-400" />
          <span>Carregando Parceiro Lynx...</span>
        </div>
      </div>
    );
  }

  // TELA DE LOGIN PRIVADA (Sem opção de auto-cadastro para usuários)
  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#090d16] p-4 text-slate-100">
        {toast && (
          <div
            className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl border text-xs font-medium flex items-center gap-2 ${
              toast.type === "success"
                ? "bg-emerald-950/95 border-emerald-500/50 text-emerald-200"
                : "bg-rose-950/95 border-rose-500/50 text-rose-200"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toast.text}</span>
          </div>
        )}

        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500" />

          {/* Cabeçalho do Login */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-sky-500/20 text-white font-black">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Shield className="w-3.5 h-3.5" />
              Sistema Privado • Acesso Restrito
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Parceiro Lynx — Gestão & Leads
            </h1>
            <p className="text-xs text-slate-400">
              Entre com suas credenciais autorizadas para acessar o painel.
            </p>
          </div>

          {/* Formulário de Login */}
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                E-mail Cadastrado *
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="edsonmanoel2012@gmail.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:border-sky-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Senha de Acesso *
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:border-sky-500 focus:outline-none transition"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-lg shadow-sky-950/40 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4 text-slate-950" />
              <span>Entrar no Painel</span>
            </button>
          </form>

          {/* Aviso Explícito de Política Privada */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 space-y-1.5">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              Política de Acesso Privado:
            </div>
            <p className="text-slate-400 leading-relaxed">
              Este aplicativo não possui auto-cadastro. Novos parceiros e usuários são cadastrados exclusivamente pelo <strong>SuperAdmin</strong> dentro do painel administrativo.
            </p>
          </div>

          <div className="pt-2 text-center text-[11px] text-slate-600">
            © {new Date().getFullYear()} Lynx. Todos os direitos reservados.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl border text-xs font-medium flex items-center gap-2 ${
            toast.type === "success"
              ? "bg-emerald-950/95 border-emerald-500/50 text-emerald-200"
              : "bg-rose-950/95 border-rose-500/50 text-rose-200"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast.text}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Nome do App */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20 font-black text-slate-950 text-lg">
              PL
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-white">
                  Parceiro <span className="text-sky-400">Lynx</span>
                </h1>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 font-semibold">
                  Asaas Split & DRE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gestão de Grupos Asaas, Custos Operacionais e Transparência de
                Parceiros
              </p>
            </div>
          </div>

          {/* Identificação do Usuário Logado & Logout */}
          <div className="flex flex-wrap items-center gap-2.5">
            {isSuperAdmin ? (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
                <Eye className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Visão:
                </span>
                <select
                  value={currentUser.id}
                  onChange={(e) => setActiveUserId(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
                  title="Simular visualização de parceiros"
                >
                  {state.users.map((u) => (
                    <option key={u.id} value={u.id} className="bg-slate-900">
                      {u.role === "SUPERADMIN"
                        ? `★ SuperAdmin (${u.email})`
                        : `Parceiro: ${u.name} (${u.email})`}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{currentUser.name}</span>
                <span className="text-[10px] text-slate-400">({currentUser.email})</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-800/50 transition cursor-pointer"
              title="Encerrar sessão no sistema"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Sair</span>
            </button>

            {isSuperAdmin && (
              <button
                type="button"
                onClick={handleSyncAsaas}
                disabled={syncingAsaas}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-lg shadow-sky-500/15 transition disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${syncingAsaas ? "animate-spin" : ""}`}
                />
                {syncingAsaas ? "Sincronizando..." : "Sincronizar Asaas"}
              </button>
            )}
          </div>
        </div>

        {/* Barra de Navegação e Filtro de Grupo */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 border-t border-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("DASHBOARD")}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === "DASHBOARD"
                  ? "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Transparência & Split do Grupo
            </button>

            {isSuperAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab("GROUPS")}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    activeTab === "GROUPS"
                      ? "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  Grupos & Regras Individuais ({state.groups.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("PARTNERS")}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    activeTab === "PARTNERS"
                      ? "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Cadastrar Parceiros & Acessos ({state.users.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("EVOLUTION")}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    activeTab === "EVOLUTION"
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  WhatsApp & Leads Evolution ({state.evolution_contacts?.length || 0})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("PRODUCTS")}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    activeTab === "PRODUCTS"
                      ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <Package className="w-4 h-4 text-purple-400" />
                  Produtos & Loja ({state.products?.length || 0})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("SETTINGS")}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    activeTab === "SETTINGS"
                      ? "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <Database className="w-4 h-4" />
                  Supabase VPS & API Asaas
                </button>
              </>
            )}
          </div>

          {/* Seletor de Grupo Autorizado e Mês de Referência */}
          {activeTab === "DASHBOARD" && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-slate-400">Grupo:</span>
                <select
                  value={activeGroup?.id || ""}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  {visibleGroups.map((g) => (
                    <option key={g.id} value={g.id} className="bg-slate-900">
                      {g.display_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
                <span className="text-xs text-slate-400">Competência:</span>
                <select
                  value={referenceMonth}
                  onChange={(e) => setReferenceMonth(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value="2026-11" className="bg-slate-900">
                    Novembro / 2026
                  </option>
                  <option value="2026-10" className="bg-slate-900">
                    Outubro / 2026
                  </option>
                  <option value="ALL" className="bg-slate-900">
                    Todo o Período
                  </option>
                </select>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* ABA 1: DASHBOARD DE TRANSPARÊNCIA E SPLIT */}
        {activeTab === "DASHBOARD" && (
          <>
            {!activeGroup || !currentReport ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                <Lock className="w-8 h-8 text-amber-400 mx-auto" />
                <h3 className="text-lg font-bold text-white">
                  Nenhum Grupo Autorizado para este Parceiro
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  O SuperAdmin (edsonmanoel2012@gmail.com) ainda não vinculou
                  grupos do Asaas para visualização nesta conta de parceiro.
                </p>
              </div>
            ) : (
              <TransparencyDashboard
                report={currentReport}
                currentUser={currentUser}
                isSuperAdminView={isSuperAdmin}
                onEditGroupRules={() =>
                  setEditingGroup({
                    group: activeGroup,
                    deductions: state.deductions.filter(
                      (d) => d.group_id === activeGroup.id
                    ),
                    splits: state.splits.filter(
                      (s) => s.group_id === activeGroup.id
                    ),
                  })
                }
                onOpenNewExpenseModal={() => setShowExpenseModal(true)}
                onOpenNewPaymentModal={() => setShowPaymentModal(true)}
                onDeleteExpense={async (expenseId) => {
                  await postAction("DELETE_EXPENSE", { expenseId });
                  notify("success", "Despesa removida do grupo.");
                }}
                onDeletePayment={async (paymentId) => {
                  await postAction("DELETE_PAYMENT", { paymentId });
                  notify("success", "Cobrança removida.");
                }}
                onTogglePayout={async (params) => {
                  await postAction("TOGGLE_PAYOUT", params);
                  notify(
                    "success",
                    params.status === "PAID"
                      ? "Repasse marcado como PAGO!"
                      : "Status do repasse reaberto como PENDENTE."
                  );
                }}
              />
            )}
          </>
        )}

        {/* ABA 2: GRUPOS & REGRAS INDIVIDUAIS (SUPERADMIN) */}
        {activeTab === "GROUPS" && isSuperAdmin && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Grupos de Clientes Asaas & Regras Individuais de Split
                </h2>
                <p className="text-xs text-slate-400">
                  Configure impostos, custos de operação/infraestrutura e a
                  divisão do valor líquido individualmente para cada grupo.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setEditingGroup({
                    group: undefined,
                    deductions: [],
                    splits: [],
                  })
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-lg shadow-sky-500/20"
              >
                <Plus className="w-4 h-4" />
                Criar Novo Grupo & Regra
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {state.groups.map((grp) => {
                const grpReport = calculateGroupFinancialReport({
                  group: grp,
                  referenceMonth,
                  allPayments: state.payments,
                  allDeductions: state.deductions,
                  allSplits: state.splits,
                  allExpenses: state.expenses,
                  allUsers: state.users,
                  allPayouts: state.payouts,
                });

                return (
                  <div
                    key={grp.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-sky-300">
                            Asaas: {grp.asaas_group_name}
                          </span>
                          <h3 className="text-lg font-bold text-white mt-1">
                            {grp.display_name}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await postAction("DELETE_GROUP", {
                              groupId: grp.id,
                            });
                            notify("success", "Grupo removido.");
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1"
                          title="Excluir grupo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2">
                        {grp.description}
                      </p>

                      {/* Resumo das Deduções Configuradas */}
                      <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-1.5 text-xs">
                        <div className="font-semibold text-amber-300">
                          Deduções Configuradas:
                        </div>
                        {grpReport.deductionItems.map((d) => (
                          <div
                            key={d.id}
                            className="flex justify-between text-slate-300"
                          >
                            <span>• {d.name}</span>
                            <span className="font-mono font-semibold text-amber-200">
                              {d.type === "PERCENTAGE"
                                ? `${d.rateOrFixed}%`
                                : formatBRL(d.rateOrFixed)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Resumo do Split Configurado */}
                      <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-1.5 text-xs">
                        <div className="font-semibold text-emerald-300">
                          Divisão do Líquido (Split):
                        </div>
                        {grpReport.splits.map((s) => (
                          <div
                            key={s.splitId}
                            className="flex justify-between text-slate-300"
                          >
                            <span className="truncate pr-2">
                              • {s.partnerName}
                            </span>
                            <span className="font-mono font-bold text-emerald-300">
                              {s.percentage}% ({formatBRL(s.amountToReceive)})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGroupId(grp.id);
                          setActiveTab("DASHBOARD");
                        }}
                        className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
                      >
                        Ver Demonstrativo →
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingGroup({
                            group: grp,
                            deductions: state.deductions.filter(
                              (d) => d.group_id === grp.id
                            ),
                            splits: state.splits.filter(
                              (s) => s.group_id === grp.id
                            ),
                          })
                        }
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white"
                      >
                        Editar Regras & Split
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ABA 3: GESTÃO DE PARCEIROS E PERMISSÕES POR GRUPO */}
        {activeTab === "PARTNERS" && isSuperAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Formulário de Cadastro / Edição de Parceiro */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 h-fit">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-sky-400" />
                    {editingPartner
                      ? `Editar Parceiro: ${editingPartner.name}`
                      : "Cadastrar Novo Parceiro"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Defina os dados de acesso e quais grupos do Asaas este
                    parceiro está autorizado a ver.
                  </p>
                </div>
                {editingPartner && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPartner(null);
                      setPartnerName("");
                      setPartnerEmail("");
                      setPartnerPassword("");
                      setPartnerPix("");
                      setPartnerDoc("");
                      setPartnerPhone("");
                    }}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Novo
                  </button>
                )}
              </div>

              <form onSubmit={handleSavePartner} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Nome do Parceiro / Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="Ex: João Silva - Parceiro Horeb"
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      E-mail de Login *
                    </label>
                    <input
                      type="email"
                      required
                      value={partnerEmail}
                      onChange={(e) => setPartnerEmail(e.target.value)}
                      placeholder="parceiro@empresa.com.br"
                      className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Senha de Acesso *
                    </label>
                    <input
                      type="text"
                      required
                      value={partnerPassword}
                      onChange={(e) => setPartnerPassword(e.target.value)}
                      placeholder="Ex: parceiro123"
                      className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Chave Pix (Para Receber Split)
                    </label>
                    <input
                      type="text"
                      value={partnerPix}
                      onChange={(e) => setPartnerPix(e.target.value)}
                      placeholder="CPF, CNPJ, E-mail ou Aleatória"
                      className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      CPF / CNPJ
                    </label>
                    <input
                      type="text"
                      value={partnerDoc}
                      onChange={(e) => setPartnerDoc(e.target.value)}
                      placeholder="00.000.000/0001-00"
                      className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Telefone / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={partnerPhone}
                      onChange={(e) => setPartnerPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      % Participação Inicial no Split
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={partnerDefaultSplit}
                      onChange={(e) => setPartnerDefaultSplit(e.target.value)}
                      className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-emerald-300 font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Seleção de Grupos que o Parceiro está autorizado a ver */}
                <div className="pt-2">
                  <label className="block text-slate-300 font-semibold mb-2">
                    Grupos do Asaas que este Parceiro está autorizado a ver:
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {state.groups.map((g) => {
                      const checked = partnerGroupIds.includes(g.id);
                      return (
                        <label
                          key={g.id}
                          className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition ${
                            checked
                              ? "bg-sky-500/10 border-sky-500/40 text-white"
                              : "bg-slate-950 border-slate-800 text-slate-400"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setPartnerGroupIds((prev) => [...prev, g.id]);
                                } else {
                                  setPartnerGroupIds((prev) =>
                                    prev.filter((id) => id !== g.id)
                                  );
                                }
                              }}
                              className="rounded border-slate-600 text-sky-500"
                            />
                            <span className="font-medium">{g.display_name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            Asaas: {g.asaas_group_name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/20 transition"
                >
                  {editingPartner
                    ? "Salvar Alterações do Parceiro"
                    : "Cadastrar Parceiro e Liberar Acesso"}
                </button>
              </form>
            </div>

            {/* Lista de Parceiros Cadastrados */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  Parceiros & Administradores Cadastrados
                </h3>
                <p className="text-xs text-slate-400">
                  Clique em &quot;Testar Visão&quot; para ver o painel exatamente
                  como o parceiro enxerga.
                </p>
              </div>

              <div className="space-y-3">
                {state.users.map((u) => {
                  const userSplits = state.splits.filter(
                    (s) => s.partner_id === u.id && s.can_view_group
                  );
                  const isMainSuperAdmin =
                    u.email.toLowerCase() === "edsonmanoel2012@gmail.com";

                  return (
                    <div
                      key={u.id}
                      className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            {u.name}
                          </span>
                          {u.role === "SUPERADMIN" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <Shield className="w-3 h-3" />
                              SUPERADMIN
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/15 text-sky-300">
                              PARCEIRO
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          Login: {u.email} • Senha: {u.password || "***"}
                        </div>
                        {u.pix_key && (
                          <div className="text-xs text-slate-300">
                            Pix: <code className="text-sky-300">{u.pix_key}</code>
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] text-slate-400">
                            Grupos autorizados:
                          </span>
                          {u.role === "SUPERADMIN" ? (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-medium">
                              Todos os Grupos (Acesso Total)
                            </span>
                          ) : userSplits.length === 0 ? (
                            <span className="text-[11px] text-rose-400">
                              Nenhum grupo vinculado
                            </span>
                          ) : (
                            userSplits.map((s) => {
                              const g = state.groups.find(
                                (grp) => grp.id === s.group_id
                              );
                              return (
                                <span
                                  key={s.id}
                                  className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700"
                                >
                                  {g?.display_name || s.group_id} ({s.percentage}
                                  %)
                                </span>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveUserId(u.id);
                            setActiveTab("DASHBOARD");
                            notify(
                              "success",
                              `Alternado para a visão de ${u.name}`
                            );
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30"
                        >
                          Testar Visão
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditPartner(u)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200"
                        >
                          Editar
                        </button>
                        {!isMainSuperAdmin && (
                          <button
                            type="button"
                            onClick={async () => {
                              await postAction("DELETE_PARTNER", {
                                userId: u.id,
                              });
                              notify("success", "Parceiro removido.");
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-400"
                            title="Remover parceiro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ABA 4: CONFIGURAÇÕES SUPABASE VPS + API ASAAS */}
        {activeTab === "SETTINGS" && isSuperAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Server className="w-5 h-5 text-sky-400" />
                  Conexão Banco Supabase (Sua VPS) & Chave API Asaas
                </h2>
                <p className="text-xs text-slate-400">
                  Assim que tiver os dados do Supabase na sua VPS e da API do
                  Asaas, cole abaixo para ativar a sincronização em nuvem.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="font-bold text-sky-300 text-sm">
                    1. Integração API Asaas v3
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">
                      URL da API Asaas (Produção ou Sandbox)
                    </label>
                    <input
                      type="text"
                      value={cfgAsaasUrl}
                      onChange={(e) => setCfgAsaasUrl(e.target.value)}
                      placeholder="https://api.asaas.com/v3"
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">
                      Chave de API do Asaas (`access_token`)
                    </label>
                    <input
                      type="password"
                      value={cfgAsaasKey}
                      onChange={(e) => setCfgAsaasKey(e.target.value)}
                      placeholder="$aact_..."
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300 text-sm">
                      2. Supabase Self-Hosted na sua VPS
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        supabaseConnected
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {supabaseConnected
                        ? "Conectado à VPS"
                        : "Modo Local Ativo (Aguardando Credenciais VPS)"}
                    </span>
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">
                      URL do Supabase na VPS (`NEXT_PUBLIC_SUPABASE_URL`)
                    </label>
                    <input
                      type="text"
                      value={cfgSupabaseUrl}
                      onChange={(e) => setCfgSupabaseUrl(e.target.value)}
                      placeholder="https://supabase.suavps.com.br ou http://IP_DA_VPS:8000"
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">
                      Anon Key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
                    </label>
                    <input
                      type="password"
                      value={cfgSupabaseAnon}
                      onChange={(e) => setCfgSupabaseAnon(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">
                      Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`)
                    </label>
                    <input
                      type="password"
                      value={cfgSupabaseService}
                      onChange={(e) => setCfgSupabaseService(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await postAction("RESET_DEMO_DATA", {});
                      notify(
                        "success",
                        "Dados de demonstração (Grupo Horeb 32%/15%) restaurados!"
                      );
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                  >
                    Restaurar Dados de Exemplo (Grupo Horeb)
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const res = await postAction("SAVE_SETTINGS", {
                        asaas_api_url: cfgAsaasUrl,
                        asaas_api_key: cfgAsaasKey,
                        supabase_url: cfgSupabaseUrl,
                        supabase_anon_key: cfgSupabaseAnon,
                        supabase_service_role_key: cfgSupabaseService,
                      });
                      if (res.supabaseSync?.synced) {
                        notify(
                          "success",
                          "Configurações salvas e dados sincronizados com o Supabase na VPS!"
                        );
                      } else if (res.supabaseSync?.error) {
                        notify(
                          "error",
                          `Salvo localmente. Aviso Supabase VPS: ${res.supabaseSync.error}`
                        );
                      } else {
                        notify("success", "Configurações salvas com sucesso!");
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold shadow-lg shadow-sky-500/20"
                  >
                    Salvar Credenciais & Sincronizar Banco
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 h-fit">
              <h3 className="text-base font-bold text-white">
                Pronto para o Supabase da sua VPS
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                O arquivo SQL completo com todas as tabelas do{" "}
                <strong>Parceiro Lynx</strong> já foi gerado em{" "}
                <code className="text-sky-300 bg-slate-950 px-1.5 py-0.5 rounded">
                  supabase/schema.sql
                </code>
                .
              </p>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs space-y-2 text-slate-300">
                <div className="font-semibold text-white">
                  Como conectar quando tiver os dados da VPS:
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
                  <li>
                    Acesse o SQL Editor do Supabase na sua VPS e execute o
                    script <code className="text-sky-300">supabase/schema.sql</code>.
                  </li>
                  <li>
                    Informe a URL e a Service Role Key ao lado (ou envie aqui no
                    chat que eu configuro direto no projeto para você).
                  </li>
                  <li>
                    O SuperAdmin{" "}
                    <code className="text-emerald-300">
                      edsonmanoel2012@gmail.com
                    </code>{" "}
                    e a estrutura do <strong>Grupo Horeb</strong> serão
                    sincronizados automaticamente.
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* ABA 5: GESTÃO EVOLUTION API & LEADS WHATSAPP (SuperAdmin Only) */}
        {activeTab === "EVOLUTION" && isSuperAdmin && (
          <EvolutionManager
            instances={state?.evolution_instances || []}
            contacts={state?.evolution_contacts || []}
            products={state?.products || []}
            onRefreshData={fetchState}
            notify={notify}
          />
        )}

        {/* ABA 6: CATÁLOGO E GESTÃO DE PRODUTOS (SuperAdmin Only) */}
        {activeTab === "PRODUCTS" && isSuperAdmin && (
          <ProductCatalogManager notify={notify} />
        )}
      </main>

      {/* MODAL: Construtor de Regras e Split do Grupo */}
      {editingGroup && (
        <GroupRuleBuilderModal
          initialGroup={editingGroup.group}
          initialDeductions={editingGroup.deductions}
          initialSplits={editingGroup.splits}
          groupPayments={state.payments.filter(
            (p) =>
              editingGroup.group &&
              p.group_id === editingGroup.group.id &&
              (referenceMonth === "ALL" || p.reference_month === referenceMonth)
          )}
          groupExpenses={state.expenses.filter(
            (e) =>
              editingGroup.group &&
              e.group_id === editingGroup.group.id &&
              (referenceMonth === "ALL" || e.reference_month === referenceMonth)
          )}
          allUsers={state.users}
          onCancel={() => setEditingGroup(null)}
          onSave={async (data) => {
            await postAction("SAVE_GROUP_CONFIG", data);
            setSelectedGroupId(data.group.id);
            setEditingGroup(null);
            notify(
              "success",
              `Regras de impostos, custos e Split do grupo "${data.group.display_name}" salvas!`
            );
          }}
        />
      )}

      {/* MODAL: Lançar Outra Despesa / Custo da Operação */}
      {showExpenseModal && activeGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                Lançar Custo / Outra Despesa ({activeGroup.display_name})
              </h3>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Fechar
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await postAction("ADD_EXPENSE", {
                  group_id: activeGroup.id,
                  description: expDesc,
                  category: expCategory,
                  amount: parseFloat(expAmount) || 0,
                  expense_date: expDate,
                  reference_month: expDate.slice(0, 7),
                  notes: expNotes,
                  created_by: currentUser.email,
                });
                setExpDesc("");
                setExpAmount("");
                setExpNotes("");
                setShowExpenseModal(false);
                notify(
                  "success",
                  "Despesa lançada e descontada no cálculo líquido do grupo!"
                );
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-300 mb-1">
                  Descrição da Despesa *
                </label>
                <input
                  type="text"
                  required
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  placeholder="Ex: Servidor Cloud Extra / Disparos WhatsApp"
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Categoria</label>
                  <input
                    type="text"
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="350.00"
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Data</label>
                <input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">
                  Observação p/ Transparência do Parceiro
                </label>
                <input
                  type="text"
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  placeholder="Detalhe opcional visível para o parceiro"
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold"
                >
                  Confirmar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Lançar Venda / Cobrança Manual no Grupo */}
      {showPaymentModal && activeGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                Registrar Venda / Cobrança ({activeGroup.display_name})
              </h3>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Fechar
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await postAction("ADD_MANUAL_PAYMENT", {
                  group_id: activeGroup.id,
                  customer_id: `cus_${Date.now()}`,
                  customer_name: payCustomer,
                  description: payDesc || "Mensalidade / Venda",
                  billing_type: payBilling,
                  status: payStatus,
                  gross_value: parseFloat(payGross) || 0,
                  discount_value: parseFloat(payDiscount) || 0,
                  asaas_fee: parseFloat(payFee) || 0,
                  payment_date: payDate,
                  due_date: payDate,
                  reference_month: payDate.slice(0, 7),
                });
                setPayCustomer("");
                setPayDesc("");
                setPayGross("");
                setShowPaymentModal(false);
                notify("success", "Cobrança adicionada ao grupo!");
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-300 mb-1">
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  required
                  value={payCustomer}
                  onChange={(e) => setPayCustomer(e.target.value)}
                  placeholder="Ex: Empresa Cliente Ltda"
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Descrição</label>
                <input
                  type="text"
                  value={payDesc}
                  onChange={(e) => setPayDesc(e.target.value)}
                  placeholder="Ex: Fatura Mensalidade"
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">
                    Valor Pago (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={payGross}
                    onChange={(e) => setPayGross(e.target.value)}
                    placeholder="2500.00"
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">
                    Desconto (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={payDiscount}
                    onChange={(e) => setPayDiscount(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">
                    Taxa Asaas (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={payFee}
                    onChange={(e) => setPayFee(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-2 text-white font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">Meio</label>
                  <select
                    value={payBilling}
                    onChange={(e) =>
                      setPayBilling(e.target.value as BillingType)
                    }
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-2 text-white"
                  >
                    <option value="PIX">PIX</option>
                    <option value="BOLETO">BOLETO</option>
                    <option value="CREDIT_CARD">CARTÃO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Status</label>
                  <select
                    value={payStatus}
                    onChange={(e) =>
                      setPayStatus(e.target.value as PaymentStatus)
                    }
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-2 text-white"
                  >
                    <option value="RECEIVED">Recebido</option>
                    <option value="PENDING">A Vencer</option>
                    <option value="OVERDUE">Vencido</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Data</label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-2 text-white"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                >
                  Salvar Venda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

