"use client";

import React, { useMemo, useState } from "react";
import {
  EvolutionContact,
  EvolutionInstance,
  EvolutionWhatsAppGroup,
  LynxProduct,
  checkPromotionEligibility,
  getEffectiveConsent,
} from "../lib/types";
import { BRAZIL_DDD_MAP } from "../lib/ddd";
import {
  AlertTriangle,
  Ban,
  Briefcase,
  Building,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Edit,
  Edit2,
  ExternalLink,
  Filter,
  Globe,
  Instagram,
  Layers,
  Linkedin,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Server,
  Share2,
  Shield,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  User,
  UserCheck,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";

interface Props {
  instances: EvolutionInstance[];
  contacts: EvolutionContact[];
  products?: LynxProduct[];
  onRefreshData: () => Promise<void>;
  notify: (type: "success" | "error", text: string) => void;
}

type MainTab = "CONTACTS" | "INSTANCES";
type ContactCategory = "UNIQUE" | "REPEATED" | "GROUPS" | "NATIONAL" | "INTERNATIONAL" | "ALL";

/**
 * Gera um gradiente harmônico e consistente baseado no nome
 */
function getDeterministicGradient(seed: string): string {
  const gradients = [
    "from-blue-600 to-indigo-700 text-blue-100",
    "from-emerald-600 to-teal-700 text-emerald-100",
    "from-violet-600 to-purple-700 text-violet-100",
    "from-amber-600 to-orange-700 text-amber-100",
    "from-rose-600 to-pink-700 text-rose-100",
    "from-cyan-600 to-blue-700 text-cyan-100",
    "from-fuchsia-600 to-pink-700 text-fuchsia-100",
    "from-teal-600 to-emerald-700 text-teal-100",
  ];
  let hash = 0;
  for (let i = 0; i < (seed || "").length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

/**
 * Avatar seguro para leads e contatos.
 * Evita chamadas a URLs temporárias do WhatsApp CDN (pps.whatsapp.net / mmg.whatsapp.net)
 * que expiram rapidamente e causam erros 403 Forbidden no console do navegador.
 */
function ContactAvatar({
  name,
  src,
  size = "md",
}: {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
}) {
  const [imgError, setImgError] = useState(false);

  const cleanName = (name || "").trim();
  const words = cleanName.split(/\s+/).filter(Boolean);
  const initials =
    words.length >= 2
      ? `${words[0][0]}${words[1][0]}`.toUpperCase()
      : (cleanName.slice(0, 2) || "?").toUpperCase();

  // Links do CDN do WhatsApp (pps.whatsapp.net / mmg.whatsapp.net) expiram e geram 403 Forbidden
  const isWhatsappCdn = Boolean(
    src &&
      (src.includes("pps.whatsapp.net") ||
        src.includes("whatsapp.net") ||
        src.includes("fbcdn.net"))
  );

  const canShowImg = Boolean(src && !imgError && !isWhatsappCdn);

  const sizeClasses = {
    sm: "w-7 h-7 text-[10px]",
    md: "w-8 h-8 text-xs",
    lg: "w-10 h-10 text-sm",
  }[size];

  const gradient = getDeterministicGradient(cleanName || "Contato");

  if (canShowImg && src) {
    return (
      <div
        className={`${sizeClasses} rounded-full overflow-hidden bg-slate-800 border border-slate-700 shrink-0 shadow-sm`}
      >
        <img
          src={src}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-full bg-gradient-to-br ${gradient} border border-white/10 flex items-center justify-center font-bold tracking-wider shrink-0 shadow-inner`}
      title={name}
    >
      {initials}
    </div>
  );
}

/**
 * Avatar para Instâncias
 */
function InstanceAvatar({ name, src }: { name: string; src?: string }) {
  const [imgError, setImgError] = useState(false);
  const cleanName = (name || "IN").trim();
  const initials = cleanName.slice(0, 2).toUpperCase();

  const isWhatsappCdn = Boolean(
    src &&
      (src.includes("pps.whatsapp.net") ||
        src.includes("whatsapp.net") ||
        src.includes("fbcdn.net"))
  );

  const canShowImg = Boolean(src && !imgError && !isWhatsappCdn);
  const gradient = getDeterministicGradient(cleanName);

  if (canShowImg && src) {
    return (
      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
        <img
          src={src}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} border border-white/15 flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-md`}
      title={name}
    >
      {initials}
    </div>
  );
}

function formatPhoneDisplay(raw?: string): string {
  if (!raw) return "";
  const clean = raw.replace(/\D/g, "");
  if (clean.startsWith("55") && clean.length === 13) {
    return `+55 (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
  }
  if (clean.startsWith("55") && clean.length === 12) {
    return `+55 (${clean.slice(2, 4)}) ${clean.slice(4, 8)}-${clean.slice(8)}`;
  }
  return clean ? `+${clean}` : "";
}

export default function EvolutionManager({
  instances,
  contacts,
  products = [],
  onRefreshData,
  notify,
}: Props) {
  const [mainTab, setMainTab] = useState<MainTab>("CONTACTS");
  const [category, setCategory] = useState<ContactCategory>("UNIQUE");

  // Filtros
  const [selectedDdd, setSelectedDdd] = useState<string>("ALL");
  const [onlyValidNames, setOnlyValidNames] = useState(false);
  const [onlyWithEmail, setOnlyWithEmail] = useState(false);
  const [selectedInstanceFilter, setSelectedInstanceFilter] = useState("ALL");

  // Pesquisa por Campos Separados
  const [searchName, setSearchName] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchJob, setSearchJob] = useState("");
  const [searchCompany, setSearchCompany] = useState("");
  const [searchEmail, setSearchEmail] = useState("");

  const activeSearchCount = [
    searchName,
    searchPhone,
    searchJob,
    searchCompany,
    searchEmail,
  ].filter((s) => s.trim().length > 0).length;
  const hasActiveSearch = activeSearchCount > 0;

  const handleClearAllSearches = () => {
    setSearchName("");
    setSearchPhone("");
    setSearchJob("");
    setSearchCompany("");
    setSearchEmail("");
  };

  // Consentimento & Campanha de Loja Oficial
  const [consentFilter, setConsentFilter] = useState<
    "ALL" | "OPTED_IN" | "PENDING" | "OPTED_OUT" | "NOT_CONTACTED" | "ELIGIBLE_PROMO" | "COOLING_OFF_PROMO"
  >("ALL");
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignCatalogUrl, setCampaignCatalogUrl] = useState(
    typeof window !== "undefined"
      ? `${window.location.origin}/loja`
      : "https://loja.lynxems.com.br/loja"
  );
  const [campaignMessageTemplate, setCampaignMessageTemplate] = useState(
    'Olá, {nome}! Somos da Lynx. Conheça nossa loja oficial de produtos, sistemas e soluções: {link_catalogo}\n\nCaso não tenha interesse em receber nossas novidades e ofertas, basta responder "PARAR" a qualquer momento.'
  );
  const [campaignSending, setCampaignSending] = useState(false);

  // Campanha Promocional (Regra Estrita: Mínimo 25h pós-convite e sem PARAR)
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [selectedPromoProductId, setSelectedPromoProductId] = useState<string>("");
  const [promoProductTitle, setPromoProductTitle] = useState("");
  const [promoBuyLink, setPromoBuyLink] = useState("");
  const [promoPriceLabel, setPromoPriceLabel] = useState("");
  const [promoMessageTemplate, setPromoMessageTemplate] = useState(
    'Olá, {nome}! Tudo bem?\n\nPassando para compartilhar uma oportunidade exclusiva da Lynx com você:\n🔥 *{produto}* ({preco})\n\nConfira todos os detalhes e aproveite no link direto:\n{link_venda}\n\nCaso não queira mais receber nossas ofertas, basta responder "PARAR" a qualquer momento.'
  );
  const [promoSending, setPromoSending] = useState(false);

  const [updatingConsentId, setUpdatingConsentId] = useState<string | null>(null);

  // Instância de disparo dedicada ("Vendas Lynx")
  const salesInstance = useMemo(() => {
    return instances.find((i) => i.name.trim().toLowerCase() === "vendas lynx");
  }, [instances]);

  // Loading states
  const [syncing, setSyncing] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [extractingGroups, setExtractingGroups] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Modais
  const [showSingleModal, setShowSingleModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [showExtractGroupsModal, setShowExtractGroupsModal] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<EvolutionWhatsAppGroup[]>([]);
  const [selectedGroupJids, setSelectedGroupJids] = useState<string[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Modal / Drawer de Detalhes do Lead
  const [editingLead, setEditingLead] = useState<EvolutionContact | null>(null);
  const [savingLead, setSavingLead] = useState(false);

  // Formulário Individual
  const [instName, setInstName] = useState("");
  const [instUrl, setInstUrl] = useState("http://85.31.60.68:8080");
  const [instKey, setInstKey] = useState("");

  // Formulário em Massa
  const [bulkDefaultUrl, setBulkDefaultUrl] = useState("http://85.31.60.68:8080");
  const [bulkDefaultKey, setBulkDefaultKey] = useState("");
  const [bulkText, setBulkText] = useState("");

  // Formulário Descobrir do Servidor
  const [discoverUrl, setDiscoverUrl] = useState("http://85.31.60.68:8080");
  const [discoverKey, setDiscoverKey] = useState("");
  const [discovering, setDiscovering] = useState(false);

  // Lista dinâmica de DDDs disponíveis nos contatos atuais
  const availableDdds = useMemo(() => {
    const setDdd = new Set<string>();
    for (const c of contacts) {
      if (c.ddd) setDdd.add(c.ddd);
    }
    return Array.from(setDdd).sort();
  }, [contacts]);

  // Contatos Filtrados por Categoria + Filtros Secundários
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      // 1. Categoria Principal
      if (category === "UNIQUE" && c.is_repeated) return false; // Repetidos ficam fora da lista de itens únicos!
      if (category === "REPEATED" && !c.is_repeated) return false;
      if (category === "GROUPS" && c.source_type !== "GROUP_MEMBER") return false;
      if (category === "NATIONAL" && !c.is_national) return false;
      if (category === "INTERNATIONAL" && c.is_national) return false;

      // 2. Filtro por DDD
      if (selectedDdd !== "ALL" && c.ddd !== selectedDdd) return false;

      // 3. Apenas Nomes Válidos
      if (onlyValidNames && !c.has_valid_name) return false;

      // 4. Apenas Com E-mail
      if (onlyWithEmail && !c.email) return false;

      // 5. Filtro por Instância
      if (selectedInstanceFilter !== "ALL" && !c.instances.includes(selectedInstanceFilter)) {
        return false;
      }

      // 5.1 Filtro por Consentimento e Regra das 25h de Promoção
      if (consentFilter !== "ALL") {
        if (consentFilter === "ELIGIBLE_PROMO") {
          if (!checkPromotionEligibility(c).allowed) return false;
        } else if (consentFilter === "COOLING_OFF_PROMO") {
          if (checkPromotionEligibility(c).status !== "COOLING_OFF") return false;
        } else {
          const eff = getEffectiveConsent(c);
          if (eff !== consentFilter) return false;
        }
      }

      // 6. Busca por Campos Separados (Trabalham de forma cumulativa / refinada)
      if (searchName.trim()) {
        const qName = searchName.trim().toLowerCase();
        const matchesName =
          c.name.toLowerCase().includes(qName) ||
          (c.push_name ? c.push_name.toLowerCase().includes(qName) : false);
        if (!matchesName) return false;
      }

      if (searchPhone.trim()) {
        const qPhone = searchPhone.trim().toLowerCase();
        const cleanDigits = qPhone.replace(/\D/g, "");
        const matchesPhone =
          (cleanDigits.length > 0 && c.phone.includes(cleanDigits)) ||
          c.formatted_phone.toLowerCase().includes(qPhone);
        if (!matchesPhone) return false;
      }

      if (searchJob.trim()) {
        const qJob = searchJob.trim().toLowerCase();
        const matchesJob = (c.job_title || "").toLowerCase().includes(qJob);
        if (!matchesJob) return false;
      }

      if (searchCompany.trim()) {
        const qComp = searchCompany.trim().toLowerCase();
        const matchesComp = (c.company || "").toLowerCase().includes(qComp);
        if (!matchesComp) return false;
      }

      if (searchEmail.trim()) {
        const qEmail = searchEmail.trim().toLowerCase();
        const matchesEmail =
          (c.email || "").toLowerCase().includes(qEmail) ||
          (c.about_bio || "").toLowerCase().includes(qEmail) ||
          (c.social_links?.instagram || "").toLowerCase().includes(qEmail) ||
          (c.social_links?.linkedin || "").toLowerCase().includes(qEmail);
        if (!matchesEmail) return false;
      }

      return true;
    });
  }, [
    contacts,
    category,
    consentFilter,
    selectedDdd,
    onlyValidNames,
    onlyWithEmail,
    selectedInstanceFilter,
    searchName,
    searchPhone,
    searchJob,
    searchCompany,
    searchEmail,
  ]);

  // Estatísticas Rápidas
  const stats = useMemo(() => {
    return {
      totalInstances: instances.length,
      connectedInstances: instances.filter((i) => i.status === "open").length,
      totalContacts: contacts.length,
      unique: contacts.filter((c) => !c.is_repeated).length,
      repeated: contacts.filter((c) => c.is_repeated).length,
      groups: contacts.filter((c) => c.source_type === "GROUP_MEMBER").length,
      national: contacts.filter((c) => c.is_national).length,
      international: contacts.filter((c) => !c.is_national).length,
      validNames: contacts.filter((c) => c.has_valid_name).length,
      withEmail: contacts.filter((c) => Boolean(c.email)).length,
      withJobOrCompany: contacts.filter((c) => Boolean(c.job_title || c.company)).length,
      optInCount: contacts.filter((c) => getEffectiveConsent(c) === "OPTED_IN").length,
      pendingCount: contacts.filter((c) => getEffectiveConsent(c) === "PENDING").length,
      optOutCount: contacts.filter((c) => getEffectiveConsent(c) === "OPTED_OUT").length,
      notContactedCount: contacts.filter((c) => getEffectiveConsent(c) === "NOT_CONTACTED").length,
      eligibleForPromoCount: contacts.filter((c) => checkPromotionEligibility(c).allowed).length,
      coolingOffPromoCount: contacts.filter((c) => checkPromotionEligibility(c).status === "COOLING_OFF").length,
    };
  }, [instances, contacts]);

  // 1. Salvar Instância Individual
  const handleSaveSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instName.trim() || !instUrl.trim()) return;

    try {
      const res = await fetch("/api/evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_INSTANCE",
          payload: {
            name: instName.trim(),
            server_url: instUrl.trim(),
            api_key: instKey.trim(),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Erro ao salvar instância");

      notify("success", `Instância "${instName.trim()}" cadastrada!`);
      setShowSingleModal(false);
      setInstName("");
      setInstKey("");
      await onRefreshData();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Erro ao cadastrar");
    }
  };

  // 2. Salvar Cadastro em Massa
  const handleSaveBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) return;

    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    try {
      const res = await fetch("/api/evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BULK_ADD_INSTANCES",
          payload: {
            default_server_url: bulkDefaultUrl.trim(),
            default_api_key: bulkDefaultKey.trim(),
            items: lines,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Erro ao cadastrar instâncias");

      notify(
        "success",
        `${data.addedCount} novas instâncias cadastradas e ${data.updatedCount} atualizadas!`
      );
      setShowBulkModal(false);
      setBulkText("");
      await onRefreshData();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Erro ao cadastrar em massa");
    }
  };

  // 3. Descobrir do Servidor
  const handleDiscoverServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discoverUrl.trim() || !discoverKey.trim()) return;

    setDiscovering(true);
    try {
      const res = await fetch("/api/evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DISCOVER_SERVER_INSTANCES",
          payload: {
            server_url: discoverUrl.trim(),
            global_api_key: discoverKey.trim(),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Erro ao consultar servidor");

      notify("success", `${data.imported} instâncias descobertas e importadas!`);
      setShowDiscoverModal(false);
      await onRefreshData();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Falha na conexão com a Evolution API");
    } finally {
      setDiscovering(false);
    }
  };

  // 4. Testar Conexão
  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch("/api/evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CHECK_INSTANCE_STATUS",
          payload: { instanceId: id },
        }),
      });

      const data = await res.json();
      if (data.instance?.status === "open") {
        notify("success", `Instância "${data.instance.name}" está CONECTADA!`);
      } else {
        notify("error", `Instância "${data.instance?.name}" está DESCONECTADA.`);
      }
      await onRefreshData();
    } catch {
      notify("error", "Erro ao verificar conexão da instância.");
    } finally {
      setTestingId(null);
    }
  };

  // 5. Excluir Instância
  const handleDeleteInstance = async (id: string, name: string) => {
    try {
      await fetch("/api/evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_INSTANCE",
          payload: { instanceId: id },
        }),
      });
      notify("success", `Instância "${name}" removida.`);
      await onRefreshData();
    } catch {
      notify("error", "Erro ao remover instância.");
    }
  };

  // 6. Sincronizar Contatos das Agendas
  const handleSyncAllContacts = async () => {
    if (instances.length === 0) {
      notify("error", "Cadastre pelo menos uma instância antes de sincronizar.");
      return;
    }

    setSyncing(true);
    try {
      const res = await fetch("/api/evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SYNC_ALL_CONTACTS", payload: {} }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Erro na sincronização");

      notify(
        "success",
        `Sucesso! ${data.totalContacts} contatos sincronizados (${data.unique} únicos exclusivos, ${data.repeated} repetidos em +1 instância).`
      );
      setMainTab("CONTACTS");
      await onRefreshData();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Erro ao unificar contatos.");
    } finally {
      setSyncing(false);
    }
  };

  // 7. Abrir Modal de Extração de Grupos
  const handleOpenExtractGroupsModal = async () => {
    setShowExtractGroupsModal(true);
    setLoadingGroups(true);
    try {
      const res = await fetch("/api/evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "FETCH_GROUPS_LIST", payload: {} }),
      });
      const data = await res.json();
      setAvailableGroups(data.groups || []);
      setSelectedGroupJids((data.groups || []).map((g: EvolutionWhatsAppGroup) => g.id));
    } catch {
      notify("error", "Erro ao listar grupos das instâncias.");
    } finally {
      setLoadingGroups(false);
    }
  };

  // 8. Executar Extração de Membros de Grupos
  const handleExecuteExtractGroups = async () => {
    setExtractingGroups(true);
    try {
      const res = await fetch("/api/evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "EXTRACT_GROUP_MEMBERS",
          payload: { groupJids: selectedGroupJids },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Erro na extração");

      notify(
        "success",
        `Extração concluída! ${data.newLeadsCount} novos leads adicionados de participantes dos grupos.`
      );
      setShowExtractGroupsModal(false);
      setCategory("GROUPS");
      setMainTab("CONTACTS");
      await onRefreshData();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Erro ao extrair membros.");
    } finally {
      setExtractingGroups(false);
    }
  };

  // 9. Achar Nomes & Enriquecer Perfis via WhatsApp
  const handleEnrichProfiles = async () => {
    setEnriching(true);
    try {
      const res = await fetch("/api/evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ENRICH_CONTACT_PROFILES", payload: {} }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Erro ao enriquecer");

      notify(
        "success",
        `Enriquecimento finalizado! ${data.enrichedCount} contatos tiveram nome/bio/foto atualizados pelo WhatsApp.`
      );
      await onRefreshData();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Erro ao consultar perfis no WhatsApp.");
    } finally {
      setEnriching(false);
    }
  };

  // 10. Salvar Lead Completo (Cargo, Empresa, Redes Sociais, etc.)
  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;

    setSavingLead(true);
    try {
      const res = await fetch("/api/evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_LEAD_DETAILS",
          payload: editingLead,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Erro ao salvar lead");

      notify("success", `Informações de "${editingLead.name}" salvas com sucesso!`);
      setEditingLead(null);
      await onRefreshData();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Erro ao salvar dados do lead.");
    } finally {
      setSavingLead(false);
    }
  };

  // 11. Exportar CSV Completo
  const handleExportCsv = () => {
    if (filteredContacts.length === 0) {
      notify("error", "Nenhum contato para exportar com os filtros atuais.");
      return;
    }

    const rows: string[][] = [
      [
        "Nome",
        "Telefone Formatado",
        "Numero Puro",
        "DDD",
        "Estado / Regiao",
        "Tipo (Nacional/Internacional)",
        "Cargo / Profissao",
        "Empresa",
        "Email",
        "Instagram",
        "LinkedIn",
        "Website",
        "Status / Bio WhatsApp",
        "Permissao / Opt-in",
        "Origem (Agenda / Membro Grupo)",
        "Grupos de WhatsApp",
        "Instancias Onde Aparece",
        "Repetido em Multiplas Instancias?",
        "Qtd Instancias",
      ],
      ...filteredContacts.map((c) => {
        const eff = getEffectiveConsent(c);
        const consentLabel =
          eff === "OPTED_IN"
            ? "Permissao Ativa (Opt-in)"
            : eff === "PENDING"
            ? "Aguardando 24h"
            : eff === "OPTED_OUT"
            ? "Bloqueado (PARAR)"
            : "Nao Contactado";

        return [
          c.name,
          c.formatted_phone,
          c.phone,
          c.ddd || "",
          c.city || c.state_uf || "",
          c.is_national ? "Nacional" : "Internacional",
          c.job_title || "",
          c.company || "",
          c.email || "",
          c.social_links?.instagram || "",
          c.social_links?.linkedin || "",
          c.social_links?.website || "",
          c.about_bio || "",
          consentLabel,
          c.source_type === "GROUP_MEMBER" ? "Membro de Grupo" : "Contato Direto",
          (c.source_groups || []).join(", "),
          c.instances.join(", "),
          c.is_repeated ? "Sim (Repetido)" : "Nao (Unico)",
          String(c.instances_count),
        ];
      }),
    ];

    const csvContent =
      "\uFEFF" +
      rows
        .map((r) =>
          r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";")
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads-evolution-${category.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify("success", "Download do arquivo CSV de leads iniciado!");
  };

  // Disparo de Campanha de Apresentação de Catálogo
  const handleLaunchCampaign = async () => {
    // 1. Validação estrita da instância "Vendas Lynx"
    const targetInst = instances.find(
      (i) => i.name.trim().toLowerCase() === "vendas lynx"
    );

    if (!targetInst) {
      notify(
        "error",
        "Ação Bloqueada: A instância dedicada 'Vendas Lynx' ainda não está cadastrada. Cadastre-a para habilitar disparos."
      );
      return;
    }

    // Contatos alvos (apenas os que NÃO estão OPTED_OUT)
    const targetContactIds = filteredContacts
      .filter((c) => getEffectiveConsent(c) !== "OPTED_OUT")
      .map((c) => c.id);

    if (targetContactIds.length === 0) {
      notify(
        "error",
        "Nenhum contato apto para envio (todos os selecionados já solicitaram PARAR ou a lista filtrada está vazia)."
      );
      return;
    }

    if (
      !confirm(
        `Deseja iniciar o envio do catálogo para ${targetContactIds.length} contato(s) através da instância 'Vendas Lynx'?\n\nRegra das 24 Horas: Clientes que não responderem 'PARAR' nas primeiras 24h recebem permissão automática (Opt-in).`
      )
    ) {
      return;
    }

    try {
      setCampaignSending(true);
      const res = await fetch("/api/evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SEND_CATALOG_CAMPAIGN",
          payload: {
            instance_name: "Vendas Lynx",
            contact_ids: targetContactIds,
            message_template: campaignMessageTemplate,
            catalog_url: campaignCatalogUrl,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Erro ao disparar campanha");
      }

      notify(
        "success",
        `Campanha disparada com sucesso! ${data.sentCount} mensagens enviadas. (${data.skippedOptOutCount} contatos bloqueados/PARAR foram protegidos e ignorados)`
      );
      setShowCampaignModal(false);
      await onRefreshData();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Erro ao disparar campanha");
    } finally {
      setCampaignSending(false);
    }
  };

  // Disparo de Campanha Promocional (Regra Estrita de 25h pós-convite)
  const handleLaunchPromotionCampaign = async () => {
    // 1. Validação estrita da instância "Vendas Lynx"
    const targetInst = instances.find(
      (i) => i.name.trim().toLowerCase() === "vendas lynx"
    );

    if (!targetInst) {
      notify(
        "error",
        "Ação Bloqueada: A instância dedicada 'Vendas Lynx' ainda não está cadastrada. Cadastre-a para habilitar disparos."
      );
      return;
    }

    if (!promoProductTitle.trim()) {
      notify("error", "Informe o título da promoção ou selecione um produto.");
      return;
    }

    if (!promoBuyLink.trim()) {
      notify("error", "Informe o link de venda direta / checkout da promoção.");
      return;
    }

    // Contatos alvos (apenas os que atendem rigorosamente checkPromotionEligibility: >= 25h e sem PARAR)
    const eligibleContacts = filteredContacts.filter(
      (c) => checkPromotionEligibility(c).allowed
    );

    if (eligibleContacts.length === 0) {
      notify(
        "error",
        "Nenhum contato elegível para promoção. A regra exige que o convite tenha sido enviado há pelo menos 25 horas e que o cliente não tenha respondido 'PARAR'."
      );
      return;
    }

    if (
      !confirm(
        `Disparar promoção de "${promoProductTitle}" para ${eligibleContacts.length} contato(s) elegíveis?\n\n` +
          `Regra das 25 Horas: Apenas contatos com convite enviado há no mínimo 25 horas e SEM resposta 'PARAR' receberão a mensagem.`
      )
    ) {
      return;
    }

    try {
      setPromoSending(true);
      const res = await fetch("/api/evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SEND_PROMOTION_CAMPAIGN",
          payload: {
            instance_name: "Vendas Lynx",
            contact_ids: eligibleContacts.map((c) => c.id),
            product_id: selectedPromoProductId || undefined,
            product_title: promoProductTitle,
            buy_link: promoBuyLink,
            price_label: promoPriceLabel || undefined,
            message_template: promoMessageTemplate,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Erro ao disparar campanha de promoção");
      }

      notify(
        "success",
        `Campanha de promoção disparada! ${data.sentCount} mensagens enviadas. (${data.rejectedCoolingOffCount} protegidos na carência <25h, ${data.rejectedOptOutCount} bloqueados por PARAR)`
      );
      setShowPromoModal(false);
      await onRefreshData();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Erro ao disparar promoção");
    } finally {
      setPromoSending(false);
    }
  };

  // Atualização Manual de Consentimento (Opt-in / PARAR)
  const handleUpdateConsent = async (
    contactId: string,
    consentStatus: "NOT_CONTACTED" | "PENDING" | "OPTED_IN" | "OPTED_OUT",
    reason?: string
  ) => {
    try {
      setUpdatingConsentId(contactId);
      const res = await fetch("/api/evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_CONSENT",
          payload: {
            contact_id: contactId,
            consent_status: consentStatus,
            reason:
              reason ||
              (consentStatus === "OPTED_OUT"
                ? "Marcado manualmente como Bloqueado (PARAR)"
                : undefined),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Erro ao atualizar consentimento");
      }

      notify("success", `Status de permissão atualizado com sucesso!`);
      if (editingLead && editingLead.id === contactId) {
        setEditingLead({
          ...editingLead,
          consent_status: consentStatus,
          opt_out_reason: reason || editingLead.opt_out_reason,
        });
      }
      await onRefreshData();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Erro ao atualizar");
    } finally {
      setUpdatingConsentId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Principal com Ações de Prospecção & Leads */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <Users className="w-3.5 h-3.5" />
              Central de Leads & Contatos WhatsApp
            </span>
            <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              Evolution API Multi-Instâncias
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-medium">
              Acesso Exclusivo SuperAdmin
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white">
            Base de Contatos & Leads Enriquecidos
          </h2>
          <p className="text-sm text-slate-300 max-w-3xl">
            Lista única consolidada de todas as instâncias. Números repetidos ficam separados dos itens únicos,
            com separação por DDD, extração de membros de grupos, busca de nomes/bios e captura de cargos, empresas e redes sociais.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSyncAllContacts}
            disabled={syncing || instances.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando..." : "Sincronizar Todas as Instâncias"}
          </button>

          <button
            type="button"
            onClick={handleOpenExtractGroupsModal}
            disabled={instances.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 border border-sky-500/30 transition"
            title="Extrai participantes de grupos do WhatsApp para a lista de leads"
          >
            <Users className="w-4 h-4 text-sky-400" />
            Extrair Membros de Grupos
          </button>

          <button
            type="button"
            onClick={handleEnrichProfiles}
            disabled={enriching || contacts.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 border border-purple-500/30 transition"
            title="Consulta a foto, bio/status e nome real de números que estão sem identificação"
          >
            <Sparkles className={`w-4 h-4 text-purple-400 ${enriching ? "animate-spin" : ""}`} />
            {enriching ? "Buscando Nomes..." : "Achar Nomes & Bios"}
          </button>

          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Upload className="w-4 h-4 text-sky-400" />
            Cadastrar Instâncias
          </button>
        </div>
      </div>

      {/* Garantia de Segurança: Modo 100% Leitura (Anti-Spam / Sem Envio de Mensagens) */}
      <div className="bg-sky-950/40 border border-sky-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-sky-300" />
          </div>
          <div>
            <div className="font-bold text-sky-100 flex items-center gap-2">
              <span>Modo Estritamente Leitura & Consolidação de Leads</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-medium">
                🔒 NUNCA Envia Mensagens
              </span>
            </div>
            <p className="text-slate-300 text-[11px] mt-0.5">
              As instâncias da Evolution API cadastradas servem <strong>exclusivamente para ler e consolidar contatos</strong>, extrair nomes/bios de grupos e separar por DDD. O app não possui rotas de envio de mensagens nem dispara qualquer comunicação.
            </p>
          </div>
        </div>
        <div className="shrink-0 text-[11px] text-slate-400 font-mono bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
          Status: <span className="text-emerald-400 font-semibold">Leitura Segura Ativa</span>
        </div>
      </div>

      {/* Cards de Métricas e Contadores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Itens Únicos Exclusivos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-300">
            {stats.unique}
          </div>
          <div className="text-[10px] text-slate-400">
            Sem nenhuma repetição
          </div>
        </div>

        <div className="bg-slate-900 border border-amber-500/20 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-amber-300">
            <span>Números Repetidos</span>
            <Share2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300">
            {stats.repeated}
          </div>
          <div className="text-[10px] text-slate-400">
            Presentes em +1 instância
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>De Grupos WhatsApp</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-300">
            {stats.groups}
          </div>
          <div className="text-[10px] text-slate-400">
            Membros prospectados
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Nacionais (+55)</span>
            <span className="text-xs">🇧🇷</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {stats.national}
          </div>
          <div className="text-[10px] text-slate-400">
            {availableDdds.length} DDDs identificados
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Internacionais</span>
            <Globe className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-300">
            {stats.international}
          </div>
          <div className="text-[10px] text-slate-400">
            Outros países
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Com Cargo / Empresa</span>
            <Briefcase className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-300">
            {stats.withJobOrCompany}
          </div>
          <div className="text-[10px] text-slate-400">
            {stats.withEmail} com e-mail
          </div>
        </div>
      </div>

      {/* Navegação Principal: Lista de Contatos vs Gerenciador de Instâncias */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMainTab("CONTACTS")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              mainTab === "CONTACTS"
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Users className="w-4 h-4" />
            Lista de Leads & Contatos ({contacts.length})
          </button>

          <button
            type="button"
            onClick={() => setMainTab("INSTANCES")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              mainTab === "INSTANCES"
                ? "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Server className="w-4 h-4" />
            Instâncias Cadastradas ({instances.length})
          </button>
        </div>

        {mainTab === "CONTACTS" && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCampaignModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-900/30 transition cursor-pointer"
              title="Disparar mensagem inicial de apresentação com link da loja"
            >
              <Package className="w-3.5 h-3.5 text-purple-200" />
              Apresentar Loja (WhatsApp)
            </button>

            <button
              type="button"
              onClick={() => setShowPromoModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 shadow-md shadow-emerald-900/30 transition cursor-pointer"
              title="Disparar oferta/promoção respeitando o mínimo de 25h pós-convite"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Disparar Promoção (+25h)
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              Exportar CSV Completo
            </button>
          </div>
        )}
      </div>

      {/* VISÃO 1: LISTA DE CONTATOS & LEADS ENRIQUECIDOS */}
      {mainTab === "CONTACTS" && (
        <div className="space-y-4">
          {/* Categorias Principais (Únicos vs Repetidos vs Grupos vs Nacionais) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCategory("UNIQUE")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    category === "UNIQUE"
                      ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                      : "bg-slate-950 text-slate-300 hover:text-white border border-slate-800"
                  }`}
                  title="Apenas números exclusivos que aparecem em uma única instância"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Itens Únicos Exclusivos ({stats.unique})
                </button>

                <button
                  type="button"
                  onClick={() => setCategory("REPEATED")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    category === "REPEATED"
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                      : "bg-slate-950 text-amber-300 hover:text-white border border-amber-500/30"
                  }`}
                  title="Números que se repetem em 2 ou mais instâncias"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Repetidos em +1 Instância ({stats.repeated})
                </button>

                <button
                  type="button"
                  onClick={() => setCategory("GROUPS")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    category === "GROUPS"
                      ? "bg-sky-500 text-slate-950"
                      : "bg-slate-950 text-slate-300 hover:text-white border border-slate-800"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Membros de Grupos ({stats.groups})
                </button>

                <button
                  type="button"
                  onClick={() => setCategory("NATIONAL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    category === "NATIONAL"
                      ? "bg-slate-800 text-white border border-slate-700"
                      : "bg-slate-950 text-slate-400 hover:text-white"
                  }`}
                >
                  🇧🇷 Nacionais (+55) ({stats.national})
                </button>

                <button
                  type="button"
                  onClick={() => setCategory("INTERNATIONAL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    category === "INTERNATIONAL"
                      ? "bg-slate-800 text-white border border-slate-700"
                      : "bg-slate-950 text-slate-400 hover:text-white"
                  }`}
                >
                  🌐 Internacionais ({stats.international})
                </button>

                <button
                  type="button"
                  onClick={() => setCategory("ALL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    category === "ALL"
                      ? "bg-slate-800 text-white border border-slate-700"
                      : "bg-slate-950 text-slate-400 hover:text-white"
                  }`}
                >
                  Todos ({stats.totalContacts})
                </button>
              </div>

              {/* Seletor de DDD (Destaque Especial) */}
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-sky-500/40">
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-xs text-sky-300 font-semibold">Separar por DDD:</span>
                <select
                  value={selectedDdd}
                  onChange={(e) => setSelectedDdd(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900">
                    Todos os DDDs ({availableDdds.length} encontrados)
                  </option>
                  {availableDdds.map((ddd) => {
                    const info = BRAZIL_DDD_MAP[ddd];
                    const countInDdd = contacts.filter((c) => c.ddd === ddd).length;
                    return (
                      <option key={ddd} value={ddd} className="bg-slate-900">
                        DDD {ddd} ({info?.state || "BR"}) — {countInDdd} contatos
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Linha 2 de Filtros: Filtro de Instância, Nomes Válidos e Com E-mail */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedInstanceFilter}
                  onChange={(e) => setSelectedInstanceFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="ALL">Todas as Instâncias</option>
                  {instances.map((i) => (
                    <option key={i.id} value={i.name}>
                      Instância: {i.name}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
                  <input
                    type="checkbox"
                    checked={onlyValidNames}
                    onChange={(e) => setOnlyValidNames(e.target.checked)}
                    className="rounded border-slate-600 text-sky-500"
                  />
                  <span>Apenas Nomes Válidos ({stats.validNames})</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
                  <input
                    type="checkbox"
                    checked={onlyWithEmail}
                    onChange={(e) => setOnlyWithEmail(e.target.checked)}
                    className="rounded border-slate-600 text-sky-500"
                  />
                  <span>Apenas Com E-mail ({stats.withEmail})</span>
                </label>
              </div>

              {hasActiveSearch && (
                <button
                  type="button"
                  onClick={handleClearAllSearches}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/25 transition-colors font-medium cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Limpar pesquisas ({activeSearchCount})</span>
                </button>
              )}
            </div>

            {/* Linha 2.5 de Filtros: Filtro de Consentimento & Permissões WhatsApp */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mr-1">
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                  Permissão WhatsApp:
                </span>

                <button
                  type="button"
                  onClick={() => setConsentFilter("ALL")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    consentFilter === "ALL"
                      ? "bg-slate-700 text-white font-bold"
                      : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  Todos ({contacts.length})
                </button>

                <button
                  type="button"
                  onClick={() => setConsentFilter("OPTED_IN")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                    consentFilter === "OPTED_IN"
                      ? "bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20"
                      : "bg-slate-950 text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30"
                  }`}
                  title="Clientes com autorização ativa (aceite ou decorridas 24h sem resposta 'PARAR')"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Permissão Ativa ({stats.optInCount})
                </button>

                <button
                  type="button"
                  onClick={() => setConsentFilter("PENDING")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                    consentFilter === "PENDING"
                      ? "bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20"
                      : "bg-slate-950 text-amber-400 hover:bg-amber-500/10 border border-amber-500/30"
                  }`}
                  title="Mensagem enviada há menos de 24h aguardando confirmação tácita"
                >
                  <Clock className="w-3 h-3" />
                  Aguardando 24h ({stats.pendingCount})
                </button>

                <button
                  type="button"
                  onClick={() => setConsentFilter("OPTED_OUT")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                    consentFilter === "OPTED_OUT"
                      ? "bg-rose-500 text-white shadow-sm shadow-rose-500/20"
                      : "bg-slate-950 text-rose-400 hover:bg-rose-500/10 border border-rose-500/30"
                  }`}
                  title="Clientes que responderam 'PARAR'. Estão bloqueados permanentemente de qualquer disparo."
                >
                  <Ban className="w-3 h-3" />
                  Bloqueados / Respondeu PARAR ({stats.optOutCount})
                </button>

                <button
                  type="button"
                  onClick={() => setConsentFilter("ELIGIBLE_PROMO")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                    consentFilter === "ELIGIBLE_PROMO"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/20"
                      : "bg-slate-950 text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/40"
                  }`}
                  title="Contatos que receberam convite há mais de 25 horas e NÃO pediram PARAR (liberados para receber promoção)"
                >
                  <Sparkles className="w-3 h-3 text-emerald-300" />
                  Liberados p/ Promoção (+25h) ({stats.eligibleForPromoCount})
                </button>

                <button
                  type="button"
                  onClick={() => setConsentFilter("COOLING_OFF_PROMO")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                    consentFilter === "COOLING_OFF_PROMO"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-slate-950 text-amber-300 hover:bg-amber-500/10 border border-amber-500/30"
                  }`}
                  title="Contatos com convite enviado há menos de 25 horas (em carência de segurança)"
                >
                  <Clock className="w-3 h-3" />
                  Em Carência &lt;25h ({stats.coolingOffPromoCount})
                </button>

                <button
                  type="button"
                  onClick={() => setConsentFilter("NOT_CONTACTED")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    consentFilter === "NOT_CONTACTED"
                      ? "bg-slate-700 text-white font-bold"
                      : "bg-slate-950 text-slate-500 hover:text-slate-300 border border-slate-800"
                  }`}
                >
                  Não Enviados ({stats.notContactedCount})
                </button>
              </div>

              {consentFilter !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setConsentFilter("ALL")}
                  className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Ver todos os status
                </button>
              )}
            </div>

            {/* Linha 3 de Filtros: Pesquisa em Campos Separados */}
            <div className="pt-2.5 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
                  <Search className="w-3.5 h-3.5" />
                  Pesquisa por Campos Específicos:
                </span>
                <span className="text-[10px] text-slate-500 hidden sm:inline">
                  Digite em um ou mais campos para cruzar e refinar a busca
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {/* 1. Nome */}
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder="Buscar Nome..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                  />
                  {searchName && (
                    <button
                      type="button"
                      onClick={() => setSearchName("")}
                      className="absolute right-2 top-2 text-slate-500 hover:text-slate-300 p-0.5"
                      title="Limpar nome"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* 2. Telefone */}
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchPhone}
                    onChange={(e) => setSearchPhone(e.target.value)}
                    placeholder="Buscar Telefone..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none font-mono transition-colors"
                  />
                  {searchPhone && (
                    <button
                      type="button"
                      onClick={() => setSearchPhone("")}
                      className="absolute right-2 top-2 text-slate-500 hover:text-slate-300 p-0.5"
                      title="Limpar telefone"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* 3. Cargo */}
                <div className="relative">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchJob}
                    onChange={(e) => setSearchJob(e.target.value)}
                    placeholder="Buscar Cargo..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                  />
                  {searchJob && (
                    <button
                      type="button"
                      onClick={() => setSearchJob("")}
                      className="absolute right-2 top-2 text-slate-500 hover:text-slate-300 p-0.5"
                      title="Limpar cargo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* 4. Empresa */}
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchCompany}
                    onChange={(e) => setSearchCompany(e.target.value)}
                    placeholder="Buscar Empresa..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                  />
                  {searchCompany && (
                    <button
                      type="button"
                      onClick={() => setSearchCompany("")}
                      className="absolute right-2 top-2 text-slate-500 hover:text-slate-300 p-0.5"
                      title="Limpar empresa"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* 5. E-mail / Bio / Redes */}
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    placeholder="Buscar E-mail / Redes..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                  />
                  {searchEmail && (
                    <button
                      type="button"
                      onClick={() => setSearchEmail("")}
                      className="absolute right-2 top-2 text-slate-500 hover:text-slate-300 p-0.5"
                      title="Limpar e-mail"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabela de Leads */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  {category === "UNIQUE" && "Itens Únicos Exclusivos (Sem Repetição)"}
                  {category === "REPEATED" && "Contatos Repetidos / Em Conflito (+1 Instância)"}
                  {category === "GROUPS" && "Membros Extraídos de Grupos do WhatsApp"}
                  {category === "NATIONAL" && `Contatos Nacionais (+55) ${selectedDdd !== "ALL" ? `— DDD ${selectedDdd}` : ""}`}
                  {category === "INTERNATIONAL" && "Contatos Internacionais"}
                  {category === "ALL" && "Todos os Leads & Contatos"}
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-sky-300">
                    {filteredContacts.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {category === "UNIQUE"
                    ? "Exibindo apenas leads que pertencem a uma única instância (repetições excluídas desta lista)."
                    : category === "REPEATED"
                    ? "Estes números aparecem em 2 ou mais instâncias simultâneas. Verifique a coluna de instâncias."
                    : "Clique em qualquer contato para visualizar e editar cargo, empresa, redes sociais e anotações."}
                </p>
              </div>
              <span className="text-xs text-slate-400">
                Mostrando {filteredContacts.length} de {contacts.length} leads
              </span>
            </div>

            {filteredContacts.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl space-y-3">
                <Users className="w-8 h-8 text-slate-600 mx-auto" />
                <div>
                  {hasActiveSearch
                    ? "Nenhum lead encontrado para a combinação de campos pesquisados."
                    : "Nenhum lead encontrado para esta categoria ou filtros selecionados."}
                </div>
                {hasActiveSearch && (
                  <button
                    type="button"
                    onClick={handleClearAllSearches}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-sky-400 bg-sky-950/60 border border-sky-800 hover:bg-sky-900/60 transition inline-flex items-center gap-1.5 mx-auto"
                  >
                    <X className="w-3.5 h-3.5" />
                    Limpar campos de pesquisa ({activeSearchCount})
                  </button>
                )}
                {contacts.length === 0 && (
                  <button
                    type="button"
                    onClick={handleSyncAllContacts}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                  >
                    Sincronizar Contatos das Instâncias Agora
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 pr-3 font-medium">Lead / Nome</th>
                      <th className="py-2.5 px-2 font-medium">Telefone</th>
                      <th className="py-2.5 px-2 font-medium">DDD / Local</th>
                      <th className="py-2.5 px-2 font-medium">Cargo & Empresa</th>
                      <th className="py-2.5 px-2 font-medium">E-mail & Redes</th>
                      <th className="py-2.5 px-2 font-medium">Permissão / Envio</th>
                      <th className="py-2.5 px-2 font-medium">Instâncias / Origem</th>
                      <th className="py-2.5 pl-2 font-medium text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {filteredContacts.slice(0, 100).map((c) => (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-800/40 transition cursor-pointer"
                        onClick={() => setEditingLead(c)}
                      >
                        {/* Nome / Foto */}
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2.5">
                            <ContactAvatar
                              name={c.name}
                              src={c.profile_picture_url}
                              size="md"
                            />
                            <div>
                              <div className="font-semibold text-white flex items-center gap-1.5">
                                {c.name}
                                {!c.has_valid_name && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 font-normal">
                                    Sem nome
                                  </span>
                                )}
                              </div>
                              {c.about_bio && (
                                <div className="text-[11px] text-slate-400 truncate max-w-xs italic" title={c.about_bio}>
                                  &quot;{c.about_bio}&quot;
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Telefone */}
                        <td className="py-3 px-2 font-mono text-slate-200">
                          {c.formatted_phone}
                        </td>

                        {/* DDD / Local */}
                        <td className="py-3 px-2">
                          {c.is_national && c.ddd ? (
                            <div className="flex items-center gap-1">
                              <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-sky-500/15 text-sky-300 border border-sky-500/30">
                                ({c.ddd}) {c.state_uf}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-300">
                              🌐 {c.country_name}
                            </span>
                          )}
                        </td>

                        {/* Cargo & Empresa */}
                        <td className="py-3 px-2">
                          {c.job_title || c.company ? (
                            <div className="space-y-0.5">
                              {c.job_title && (
                                <div className="font-medium text-white text-[11px]">
                                  {c.job_title}
                                </div>
                              )}
                              {c.company && (
                                <div className="text-[10px] text-slate-400">
                                  {c.company}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600 text-[11px] italic">
                              + Adicionar cargo
                            </span>
                          )}
                        </td>

                        {/* E-mail & Redes Sociais */}
                        <td className="py-3 px-2">
                          <div className="space-y-0.5">
                            {c.email ? (
                              <div className="text-slate-300 font-mono text-[11px]">
                                {c.email}
                              </div>
                            ) : (
                              <span className="text-slate-600 text-[11px] italic">
                                Sem e-mail
                              </span>
                            )}
                            {(c.social_links?.instagram || c.social_links?.linkedin) && (
                              <div className="flex items-center gap-1.5 text-[10px] text-sky-400">
                                {c.social_links.instagram && (
                                  <span>@{c.social_links.instagram.replace(/^@/, "")}</span>
                                )}
                                {c.social_links.linkedin && <span>[LinkedIn]</span>}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Permissão / Consentimento & Promoção (+25h) */}
                        <td className="py-3 px-2">
                          {(() => {
                            const eff = getEffectiveConsent(c);
                            const promoCheck = checkPromotionEligibility(c);

                            if (eff === "OPTED_OUT") {
                              return (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                  title={c.opt_out_reason || "Respondeu PARAR"}
                                >
                                  <Ban className="w-3 h-3" />
                                  Bloqueado (PARAR)
                                </span>
                              );
                            }

                            if (promoCheck.allowed) {
                              return (
                                <div className="space-y-1">
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/10"
                                    title="Convite enviado há mais de 25h e cliente não respondeu PARAR. Liberado para receber promoções."
                                  >
                                    <Sparkles className="w-3 h-3 text-emerald-400" />
                                    Liberado Promo (+25h)
                                  </span>
                                  {c.promo_sent_count ? (
                                    <div className="text-[9px] text-slate-400 font-mono">
                                      {c.promo_sent_count} promo enviada(s)
                                    </div>
                                  ) : null}
                                </div>
                              );
                            }

                            if (promoCheck.status === "COOLING_OFF") {
                              return (
                                <div className="space-y-0.5">
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                    title={`Carência de segurança: faltam ${promoCheck.hoursRemaining}h para completar 25h pós-convite.`}
                                  >
                                    <Clock className="w-3 h-3" />
                                    Carência ({promoCheck.hoursRemaining}h rest.)
                                  </span>
                                  <div className="text-[9px] text-slate-500">
                                    {eff === "OPTED_IN" ? "Opt-in ativo (24h)" : "Aguardando 24h"}
                                  </div>
                                </div>
                              );
                            }

                            if (eff === "OPTED_IN") {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Opt-in Ativo
                                </span>
                              );
                            }

                            if (eff === "PENDING") {
                              return (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                  title="Aguardando 24h para opt-in tácito"
                                >
                                  <Clock className="w-3 h-3" />
                                  Aguardando 24h
                                </span>
                              );
                            }

                            return (
                              <span className="text-slate-500 text-[10px]">
                                Sem convite
                              </span>
                            );
                          })()}
                        </td>

                        {/* Instâncias & Origem */}
                        <td className="py-3 px-2">
                          <div className="flex flex-wrap items-center gap-1">
                            {c.instances.map((instName) => (
                              <span
                                key={instName}
                                className={`px-2 py-0.5 rounded border font-mono text-[10px] ${
                                  c.is_repeated
                                    ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                                    : "bg-slate-800 border-slate-700 text-sky-300"
                                }`}
                              >
                                {instName}
                              </span>
                            ))}
                            {c.is_repeated && (
                              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                                {c.instances_count}x repetido
                              </span>
                            )}
                            {c.source_type === "GROUP_MEMBER" && (
                              <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px]">
                                Grupo
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Ações */}
                        <td className="py-3 pl-2 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingLead(c)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                              title="Editar Lead Completo"
                            >
                              Editar
                            </button>
                            <a
                              href={`https://wa.me/${c.phone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[11px]"
                            >
                              WhatsApp ↗
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filteredContacts.length > 100 && (
              <div className="p-3 text-center text-xs text-slate-400 bg-slate-950 rounded-xl border border-slate-800">
                Mostrando os primeiros 100 de {filteredContacts.length} contatos filtrados. Para ver a lista completa, use o botão &quot;Exportar CSV Completo&quot;.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISÃO 2: GERENCIAMENTO DE INSTÂNCIAS */}
      {mainTab === "INSTANCES" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">
                Instâncias Evolution API ({instances.length})
              </h3>
              <p className="text-xs text-slate-400">
                Cadastre e monitore todas as instâncias conectadas à Evolution API.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 border border-sky-500/30"
              >
                + Cadastro em Massa
              </button>
              <button
                type="button"
                onClick={() => setShowDiscoverModal(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              >
                Descobrir do Servidor
              </button>
              <button
                type="button"
                onClick={() => setShowSingleModal(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
              >
                + Nova Instância
              </button>
            </div>
          </div>

          {instances.length === 0 ? (
            <div className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <Server className="w-10 h-10 text-slate-500 mx-auto" />
              <h4 className="text-base font-bold text-white">
                Nenhuma instância cadastrada ainda
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Cadastre suas instâncias para extrair e unificar contatos e leads automaticamente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {instances.map((inst) => {
                const isTesting = testingId === inst.id;
                const isConnected = inst.status === "open";

                return (
                  <div
                    key={inst.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <InstanceAvatar
                            name={inst.name}
                            src={inst.profile_picture_url}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-white text-sm">
                                {inst.name}
                              </h4>
                              {isConnected ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  <Wifi className="w-3 h-3" />
                                  Conectado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  <WifiOff className="w-3 h-3" />
                                  {inst.status === "close" ? "Desconectado" : "Desconhecido"}
                                </span>
                              )}
                            </div>
                            {inst.profile_name && (
                              <div className="text-xs text-slate-300">
                                {inst.profile_name}
                              </div>
                            )}
                            {inst.phone_number && (
                              <div className="text-[11px] text-slate-400 font-mono">
                                {formatPhoneDisplay(inst.phone_number)}
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteInstance(inst.id, inst.name)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                          title="Remover instância"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-1 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-xs">
                        <div className="flex justify-between text-slate-400">
                          <span>Servidor:</span>
                          <span className="font-mono text-slate-300 truncate max-w-[170px]" title={inst.server_url}>
                            {inst.server_url}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Contatos Nesta Instância:</span>
                          <span className="font-mono font-semibold text-emerald-300">
                            {inst.contacts_count || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInstanceFilter(inst.name);
                          setMainTab("CONTACTS");
                        }}
                        className="text-xs text-sky-400 hover:text-sky-300 font-medium"
                      >
                        Ver Contatos Desta Instância →
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTestConnection(inst.id)}
                        disabled={isTesting}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3 h-3 ${isTesting ? "animate-spin text-sky-400" : ""}`} />
                        {isTesting ? "Testando..." : "Testar Conexão"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* DRAWER / MODAL: EDITAR DETALHES COMPLETOS DO LEAD */}
      {editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <ContactAvatar
                  name={editingLead.name}
                  src={editingLead.profile_picture_url}
                  size="lg"
                />
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingLead.name}
                  </h3>
                  <div className="text-xs text-slate-400 font-mono">
                    {editingLead.formatted_phone} {editingLead.ddd ? `(DDD ${editingLead.ddd} - ${editingLead.state_uf})` : ""}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingLead(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Nome Completo do Lead *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingLead.name}
                    onChange={(e) => setEditingLead({ ...editingLead, name: e.target.value })}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={editingLead.email || ""}
                    onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                    placeholder="contato@empresa.com.br"
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Cargo de Trabalho / Profissão
                  </label>
                  <input
                    type="text"
                    value={editingLead.job_title || ""}
                    onChange={(e) => setEditingLead({ ...editingLead, job_title: e.target.value })}
                    placeholder="Ex: Diretor Comercial, Gerente, Médico, Sócio..."
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Empresa / Negócio
                  </label>
                  <input
                    type="text"
                    value={editingLead.company || ""}
                    onChange={(e) => setEditingLead({ ...editingLead, company: e.target.value })}
                    placeholder="Ex: Alfa Logística Ltda"
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Instagram (@perfil)
                  </label>
                  <input
                    type="text"
                    value={editingLead.social_links?.instagram || ""}
                    onChange={(e) =>
                      setEditingLead({
                        ...editingLead,
                        social_links: { ...editingLead.social_links, instagram: e.target.value },
                      })
                    }
                    placeholder="@usuario"
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    LinkedIn (URL)
                  </label>
                  <input
                    type="text"
                    value={editingLead.social_links?.linkedin || ""}
                    onChange={(e) =>
                      setEditingLead({
                        ...editingLead,
                        social_links: { ...editingLead.social_links, linkedin: e.target.value },
                      })
                    }
                    placeholder="linkedin.com/in/perfil"
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Website / Link
                  </label>
                  <input
                    type="text"
                    value={editingLead.social_links?.website || ""}
                    onChange={(e) =>
                      setEditingLead({
                        ...editingLead,
                        social_links: { ...editingLead.social_links, website: e.target.value },
                      })
                    }
                    placeholder="https://empresa.com.br"
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Recado / Status / Bio do WhatsApp
                </label>
                <input
                  type="text"
                  value={editingLead.about_bio || ""}
                  onChange={(e) => setEditingLead({ ...editingLead, about_bio: e.target.value })}
                  placeholder="Bio obtida do WhatsApp"
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white italic"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Notas / Observações Internas sobre o Lead
                </label>
                <textarea
                  rows={3}
                  value={editingLead.notes || ""}
                  onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })}
                  placeholder="Informações adicionais sobre reuniões, interesses de compra, etc."
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 p-2.5 text-white"
                />
              </div>

              {/* Informações de Origem e Instâncias */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] space-y-1 text-slate-400">
                <div className="flex justify-between">
                  <span>Instâncias onde está presente:</span>
                  <span className="font-semibold text-sky-300">
                    {editingLead.instances.join(", ")} ({editingLead.instances_count}x)
                  </span>
                </div>
                {editingLead.source_groups && editingLead.source_groups.length > 0 && (
                  <div className="flex justify-between">
                    <span>Grupos de onde foi extraído:</span>
                    <span className="font-semibold text-emerald-300">
                      {editingLead.source_groups.join(", ")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>DDI / Região:</span>
                  <span>
                    +{editingLead.country_code} ({editingLead.country_name}) {editingLead.city ? `— ${editingLead.city}` : ""}
                  </span>
                </div>
              </div>

              {/* Gestão de Consentimento / Opt-in / Opt-out ("PARAR") */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-400" />
                    <span className="font-semibold text-slate-200">
                      Permissão de Envio WhatsApp (Opt-in / PARAR)
                    </span>
                  </div>
                  <div>
                    {(() => {
                      const eff = getEffectiveConsent(editingLead);
                      if (eff === "OPTED_IN") {
                        return (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Permissão Ativa
                          </span>
                        );
                      }
                      if (eff === "PENDING") {
                        return (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <Clock className="w-3.5 h-3.5" />
                            Aguardando 24h
                          </span>
                        );
                      }
                      if (eff === "OPTED_OUT") {
                        return (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            <Ban className="w-3.5 h-3.5" />
                            Bloqueado (PARAR)
                          </span>
                        );
                      }
                      return (
                        <span className="text-xs text-slate-500">
                          Não Contactado
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {editingLead.opt_out_reason && (
                  <p className="text-[11px] text-rose-300 bg-rose-950/30 border border-rose-800/40 p-2 rounded-lg">
                    <strong>Motivo do Bloqueio:</strong> {editingLead.opt_out_reason}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  {getEffectiveConsent(editingLead) !== "OPTED_OUT" ? (
                    <button
                      type="button"
                      disabled={updatingConsentId === editingLead.id}
                      onClick={() =>
                        handleUpdateConsent(
                          editingLead.id,
                          "OPTED_OUT",
                          "Solicitou PARAR manualmente pelo painel"
                        )
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Bloquear Envio (Registrar PARAR)
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={updatingConsentId === editingLead.id}
                      onClick={() =>
                        handleUpdateConsent(editingLead.id, "OPTED_IN")
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Desbloquear / Conceder Permissão
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingLead(null)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingLead}
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold disabled:opacity-50"
                >
                  {savingLead ? "Salvando..." : "Salvar Dados do Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EXTRAÇÃO DE MEMBROS DE GRUPOS */}
      {showExtractGroupsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" />
                  Extrair Participantes de Grupos do WhatsApp
                </h3>
                <p className="text-xs text-slate-400">
                  Selecione os grupos para extrair todos os membros como novos leads.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowExtractGroupsModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingGroups ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-sky-400" />
                <div>Carregando grupos de todas as instâncias conectadas...</div>
              </div>
            ) : availableGroups.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl space-y-2">
                <div>Nenhum grupo encontrado nas instâncias conectadas no momento.</div>
                <div className="text-[11px] text-slate-500">
                  Verifique se as instâncias estão com status &quot;Conectado&quot;.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold">
                    Grupos Encontrados ({availableGroups.length}):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedGroupJids.length === availableGroups.length) {
                        setSelectedGroupJids([]);
                      } else {
                        setSelectedGroupJids(availableGroups.map((g) => g.id));
                      }
                    }}
                    className="text-xs text-sky-400 hover:text-sky-300"
                  >
                    {selectedGroupJids.length === availableGroups.length ? "Desmarcar Todos" : "Marcar Todos"}
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {availableGroups.map((grp) => {
                    const checked = selectedGroupJids.includes(grp.id);
                    return (
                      <label
                        key={grp.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer text-xs transition ${
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
                                setSelectedGroupJids((prev) => [...prev, grp.id]);
                              } else {
                                setSelectedGroupJids((prev) => prev.filter((id) => id !== grp.id));
                              }
                            }}
                            className="rounded border-slate-600 text-sky-500"
                          />
                          <div>
                            <div className="font-semibold text-white">{grp.subject}</div>
                            <div className="text-[10px] text-slate-400">Instância: {grp.instance_name}</div>
                          </div>
                        </div>
                        <span className="font-mono text-sky-300 text-[11px]">
                          {grp.participants_count} participantes
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowExtractGroupsModal(false)}
                    className="px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800 text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteExtractGroups}
                    disabled={extractingGroups || selectedGroupJids.length === 0}
                    className="px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <Users className={`w-3.5 h-3.5 ${extractingGroups ? "animate-spin" : ""}`} />
                    {extractingGroups ? "Extraindo..." : `Extrair de ${selectedGroupJids.length} Grupo(s)`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: CADASTRAR UMA INSTÂNCIA INDIVIDUAL */}
      {showSingleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                Cadastrar Instância Evolution API
              </h3>
              <button
                type="button"
                onClick={() => setShowSingleModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSingle} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Nome da Instância na Evolution API *
                </label>
                <input
                  type="text"
                  required
                  value={instName}
                  onChange={(e) => setInstName(e.target.value)}
                  placeholder="Ex: horeb, lynx, isaac, comercial..."
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  URL do Servidor Evolution API *
                </label>
                <input
                  type="text"
                  required
                  value={instUrl}
                  onChange={(e) => setInstUrl(e.target.value)}
                  placeholder="Ex: http://85.31.60.68:8080 ou https://evolution.seudominio.com"
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  API Key / Token da Instância
                </label>
                <input
                  type="password"
                  value={instKey}
                  onChange={(e) => setInstKey(e.target.value)}
                  placeholder="Token da instância ou Global API Key"
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSingleModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                >
                  Cadastrar Instância
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CADASTRO EM MASSA (MUITAS INSTÂNCIAS DE UMA VEZ) */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-sky-400" />
                  Cadastro em Massa de Instâncias
                </h3>
                <p className="text-xs text-slate-400">
                  Cole dezenas ou centenas de instâncias de uma só vez.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBulk} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    URL Padrão do Servidor Evolution
                  </label>
                  <input
                    type="text"
                    value={bulkDefaultUrl}
                    onChange={(e) => setBulkDefaultUrl(e.target.value)}
                    placeholder="http://85.31.60.68:8080"
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    API Key / Token Padrão
                  </label>
                  <input
                    type="password"
                    value={bulkDefaultKey}
                    onChange={(e) => setBulkDefaultKey(e.target.value)}
                    placeholder="Global API Key ou Token"
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Lista de Instâncias (Uma por linha) *
                </label>
                <p className="text-[11px] text-slate-400 mb-1.5">
                  Você pode colar apenas o nome por linha, ou no formato <code className="text-sky-300">nome,url,token</code>:
                </p>
                <textarea
                  required
                  rows={8}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`horeb\nlynx\nisaac\nbarbermindset\namoreja\ninstancia06\ninstancia07`}
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 p-3 text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold"
                >
                  Importar e Salvar Todas as Instâncias
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DESCOBRIR TODAS DO SERVIDOR GLOBAL */}
      {showDiscoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-purple-400" />
                Descobrir Instâncias na Evolution API
              </h3>
              <button
                type="button"
                onClick={() => setShowDiscoverModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Conecte-se com a Global API Key para importar automaticamente todas as instâncias existentes no servidor.
            </p>

            <form onSubmit={handleDiscoverServer} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  URL do Servidor Evolution API *
                </label>
                <input
                  type="text"
                  required
                  value={discoverUrl}
                  onChange={(e) => setDiscoverUrl(e.target.value)}
                  placeholder="http://85.31.60.68:8080"
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Global API Key *
                </label>
                <input
                  type="password"
                  required
                  value={discoverKey}
                  onChange={(e) => setDiscoverKey(e.target.value)}
                  placeholder="AUTHENTICATION_API_KEY"
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDiscoverModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={discovering}
                  className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${discovering ? "animate-spin" : ""}`} />
                  {discovering ? "Buscando..." : "Descobrir e Importar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CAMPANHA DE APRESENTAÇÃO DO CATÁLOGO DE PRODUTOS */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Apresentar Loja de Produtos
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                      WhatsApp Marketing
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Disparo de apresentação com link oficial da loja Lynx e gestão de consentimento (Opt-in / PARAR).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCampaignModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AVISO DA INSTÂNCIA EXCLUSIVA "Vendas Lynx" */}
            {salesInstance ? (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-emerald-300">
                    Instância Autorizada Conectada: &quot;Vendas Lynx&quot;
                  </div>
                  <p className="text-[11px] text-emerald-200/90 mt-0.5">
                    Os disparos serão realizados <strong>exclusivamente</strong> por esta instância dedicada. Todas as outras 10 instâncias de suporte/pessoais permanecem estritamente preservadas e somente-leitura.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-amber-950/50 border border-amber-500/50 text-xs text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-amber-300 text-sm">
                    Instância &quot;Vendas Lynx&quot; Não Encontrada
                  </div>
                  <p className="text-[11px] text-amber-200/90 leading-relaxed">
                    Por rigorosa política de segurança e anti-spam, <strong>nenhuma das 10 instâncias de suporte/pessoais pode enviar mensagens</strong>. Apenas a instância dedicada chamada <strong>&quot;Vendas Lynx&quot;</strong> tem permissão de disparo.
                  </p>
                  <div className="text-[11px] font-semibold text-amber-300 bg-amber-900/30 p-2 rounded-lg border border-amber-800/50">
                    👉 Cadastre a instância com o nome exato <code>Vendas Lynx</code> na aba &quot;Instâncias Cadastradas&quot; para habilitar os disparos desta campanha.
                  </div>
                </div>
              </div>
            )}

            {/* RESUMO DOS CONTATOS ALVOS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-0.5">
                <span className="text-slate-400 text-[11px]">Contatos no Filtro Atual:</span>
                <div className="text-xl font-bold font-mono text-white">
                  {filteredContacts.length}
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/30 space-y-0.5">
                <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Aptos para Envio:
                </span>
                <div className="text-xl font-bold font-mono text-emerald-300">
                  {filteredContacts.filter((c) => getEffectiveConsent(c) !== "OPTED_OUT").length}
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-rose-500/30 space-y-0.5">
                <span className="text-rose-400 text-[11px] font-semibold flex items-center gap-1">
                  <Ban className="w-3.5 h-3.5" />
                  Protegidos (Responderam PARAR):
                </span>
                <div className="text-xl font-bold font-mono text-rose-300">
                  {filteredContacts.filter((c) => getEffectiveConsent(c) === "OPTED_OUT").length}
                </div>
                <div className="text-[10px] text-slate-500">Nunca receberão mensagens</div>
              </div>
            </div>

            {/* REGRAS DE CONSENTIMENTO INTELIGENTE */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-sky-400" />
                Regras Automatizadas de Consentimento (WhatsApp):
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-400 pl-4 list-disc">
                <li>
                  <strong className="text-white">⏱️ Aceite Tácito após 24 Horas:</strong> Clientes que não responderem <em>&quot;PARAR&quot;</em> nas primeiras 24 horas recebem consentimento automático e passam para a lista com permissão (Opt-in).
                </li>
                <li>
                  <strong className="text-white">🚫 Bloqueio Imediato com &quot;PARAR&quot;:</strong> Se em qualquer momento o contato responder <em>&quot;PARAR&quot;</em>, <em>&quot;PARE&quot;</em> ou <em>&quot;SAIR&quot;</em>, o Webhook o descadastra imediatamente e o bloqueia para sempre.
                </li>
              </ul>
            </div>

            {/* CONFIGURAÇÃO DA MENSAGEM */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Link Direto da Loja Oficial *
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    value={campaignCatalogUrl}
                    onChange={(e) => setCampaignCatalogUrl(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    placeholder="https://loja.lynxems.com.br/loja"
                  />
                  <a
                    href={campaignCatalogUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Abrir
                  </a>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-medium">
                    Modelo de Mensagem de Apresentação *
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Tags: <code className="text-sky-300 font-bold">&#123;nome&#125;</code> | <code className="text-purple-300 font-bold">&#123;link_catalogo&#125;</code>
                  </span>
                </div>
                <textarea
                  rows={4}
                  required
                  value={campaignMessageTemplate}
                  onChange={(e) => setCampaignMessageTemplate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-xs font-sans leading-relaxed focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* PRÉVIA VISUAL DA MENSAGEM */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                  Prévia da Mensagem no WhatsApp:
                </span>
                <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-emerald-100 text-xs whitespace-pre-wrap leading-relaxed">
                  {campaignMessageTemplate
                    .replace(/\{nome\}/gi, filteredContacts[0]?.name || "Edson")
                    .replace(/\{link_catalogo\}/gi, campaignCatalogUrl)}
                </div>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCampaignModal(false)}
                className="px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800 text-xs"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleLaunchCampaign}
                disabled={
                  !salesInstance ||
                  campaignSending ||
                  filteredContacts.filter((c) => getEffectiveConsent(c) !== "OPTED_OUT").length === 0
                }
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-900/30 inline-flex items-center gap-2 cursor-pointer"
              >
                <Send className={`w-4 h-4 ${campaignSending ? "animate-pulse" : ""}`} />
                {campaignSending
                  ? "Disparando Mensagens..."
                  : !salesInstance
                  ? "Requer Instância 'Vendas Lynx'"
                  : `Disparar para ${
                      filteredContacts.filter((c) => getEffectiveConsent(c) !== "OPTED_OUT").length
                    } Contato(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DISPARAR PROMOÇÃO (+25 HORAS) ================= */}
      {showPromoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 my-8 shadow-2xl">
            {/* CABEÇALHO */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-amber-500/20 to-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Disparar Oferta / Promoção
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Regra +25 Horas
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Envio exclusivo com a instância &quot;Vendas Lynx&quot; respeitando carência de 25h pós-convite.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPromoModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AVISO DE INSTÂNCIA VENDAS LYNX */}
            {!salesInstance ? (
              <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-3.5 text-xs text-rose-200 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-rose-300">
                    Instância &quot;Vendas Lynx&quot; Não Encontrada
                  </div>
                  <p className="text-[11px] text-rose-300/80 leading-relaxed">
                    Por segurança de blindagem contra bloqueios, disparos de mensagens comerciais e promoções são restritos à instância dedicada <strong>&quot;Vendas Lynx&quot;</strong>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Instância de Envio: <strong>&quot;{salesInstance.name}&quot;</strong> ({salesInstance.status === "open" ? "Conectada" : "Desconectada"})
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  Canal Autorizado
                </span>
              </div>
            )}

            {/* REGRA DAS 25 HORAS - DESTAQUE */}
            <div className="bg-amber-950/25 border border-amber-500/30 rounded-xl p-3.5 text-xs space-y-2">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-amber-400" />
                Regra Estrita de Compliance (25 Horas Pós-Convite):
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                A primeira mensagem promocional para qualquer cliente <strong>SÓ PODE SER ENVIADA COM NO MÍNIMO 25 HORAS</strong> decorridas após a mensagem de apresentação, e <strong>DESDE QUE NÃO TENHA RESPONDIDO &quot;PARAR&quot;</strong>. Contatos com menos de 25 horas ficam retidos em carência de segurança.
              </p>
            </div>

            {/* SELEÇÃO DO PRODUTO */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-sky-400" />
                  Selecione o Produto ou Oferta do Catálogo:
                </label>
                <span className="text-[10px] text-slate-500">
                  {products.length} produto(s) cadastrado(s)
                </span>
              </div>

              {products.length > 0 ? (
                <select
                  value={selectedPromoProductId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    setSelectedPromoProductId(pid);
                    const prod = products.find((p) => p.id === pid);
                    if (prod) {
                      setPromoProductTitle(prod.title);
                      setPromoBuyLink(prod.buy_link);
                      setPromoPriceLabel(prod.price_label || "");
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">-- Escolher um produto cadastrado (ou preencher avulso) --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.price_label || "R$ " + p.price})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-[11px] text-slate-400 italic">
                  Nenhum produto cadastrado no momento. Você pode preencher os campos abaixo manualmente.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">
                    Nome da Oferta / Produto *
                  </label>
                  <input
                    type="text"
                    required
                    value={promoProductTitle}
                    onChange={(e) => setPromoProductTitle(e.target.value)}
                    placeholder="Ex: Sistema Evolution API"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">
                    Preço de Exibição / Condição
                  </label>
                  <input
                    type="text"
                    value={promoPriceLabel}
                    onChange={(e) => setPromoPriceLabel(e.target.value)}
                    placeholder="Ex: R$ 97,00 ou 50% OFF"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">
                  Link Direto de Venda / Checkout *
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    value={promoBuyLink}
                    onChange={(e) => setPromoBuyLink(e.target.value)}
                    placeholder="https://pay.kiwify.com.br/... ou https://wa.me/..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs"
                  />
                  {promoBuyLink && (
                    <a
                      href={promoBuyLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 inline-flex items-center gap-1 text-xs shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Testar
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* AUDITORIA DOS CONTATOS FILTRADOS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px]">No Filtro:</span>
                <div className="text-lg font-bold font-mono text-white">
                  {filteredContacts.length}
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-emerald-500/30">
                <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Aptos (+25h):
                </span>
                <div className="text-lg font-bold font-mono text-emerald-300">
                  {filteredContacts.filter((c) => checkPromotionEligibility(c).allowed).length}
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-500/30">
                <span className="text-amber-400 text-[10px] font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Carência (&lt;25h):
                </span>
                <div className="text-lg font-bold font-mono text-amber-300">
                  {
                    filteredContacts.filter(
                      (c) => checkPromotionEligibility(c).status === "COOLING_OFF"
                    ).length
                  }
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-rose-500/30">
                <span className="text-rose-400 text-[10px] font-semibold flex items-center gap-1">
                  <Ban className="w-3 h-3" />
                  Bloqueados:
                </span>
                <div className="text-lg font-bold font-mono text-rose-300">
                  {
                    filteredContacts.filter(
                      (c) => checkPromotionEligibility(c).status === "OPTED_OUT"
                    ).length
                  }
                </div>
              </div>
            </div>

            {/* TEMPLATE DA MENSAGEM */}
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-medium">
                    Modelo de Mensagem de Promoção *
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Tags: <code className="text-sky-300">&#123;nome&#125;</code> |{" "}
                    <code className="text-amber-300">&#123;produto&#125;</code> |{" "}
                    <code className="text-emerald-300">&#123;preco&#125;</code> |{" "}
                    <code className="text-purple-300">&#123;link_venda&#125;</code>
                  </span>
                </div>
                <textarea
                  rows={4}
                  required
                  value={promoMessageTemplate}
                  onChange={(e) => setPromoMessageTemplate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-xs font-sans leading-relaxed focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* PRÉVIA VISUAL NO WHATSAPP */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                  Prévia da Mensagem no WhatsApp:
                </span>
                <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-emerald-100 text-xs whitespace-pre-wrap leading-relaxed">
                  {promoMessageTemplate
                    .replace(/\{nome\}/gi, filteredContacts[0]?.name || "Edson")
                    .replace(/\{produto\}/gi, promoProductTitle || "Sistema Evolution API")
                    .replace(/\{preco\}/gi, promoPriceLabel || "R$ 97,00")
                    .replace(/\{link_venda\}/gi, promoBuyLink || "https://pay.kiwify.com.br/...")}
                </div>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowPromoModal(false)}
                className="px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800 text-xs"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleLaunchPromotionCampaign}
                disabled={
                  !salesInstance ||
                  promoSending ||
                  !promoProductTitle.trim() ||
                  !promoBuyLink.trim() ||
                  filteredContacts.filter((c) => checkPromotionEligibility(c).allowed).length === 0
                }
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/30 inline-flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className={`w-4 h-4 ${promoSending ? "animate-spin" : ""}`} />
                {promoSending
                  ? "Disparando Ofertas..."
                  : !salesInstance
                  ? "Requer Instância 'Vendas Lynx'"
                  : filteredContacts.filter((c) => checkPromotionEligibility(c).allowed).length === 0
                  ? "Nenhum Contato Apto (+25h)"
                  : `Disparar Oferta para ${
                      filteredContacts.filter((c) => checkPromotionEligibility(c).allowed).length
                    } Contato(s) Elegíveis (+25h)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
