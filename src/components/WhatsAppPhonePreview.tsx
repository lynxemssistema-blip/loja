"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  BatteryCharging,
  Camera,
  CheckCheck,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Lock,
  Mic,
  Moon,
  MoreVertical,
  Paperclip,
  Phone,
  Signal,
  Smile,
  Sun,
  Video,
  Wifi,
  X,
} from "lucide-react";
import { EvolutionContact, LynxProduct } from "../lib/types";

interface WhatsAppPhonePreviewProps {
  /** Texto da mensagem (com ou sem tags {nome}, {produto}, etc.) */
  message: string;
  /** URL opcional da imagem (capa do produto, banner, etc.) */
  imageUrl?: string;
  /** Nome da loja / remetente (ex: "Loja Lynx Oficial" ou "Vendas Lynx") */
  senderName?: string;
  /** Foto do perfil da loja / remetente */
  senderAvatarUrl?: string;
  /** Contato selecionado para teste dinâmico do {nome} */
  selectedContact?: EvolutionContact | null;
  /** Lista opcional de contatos para permitir trocar e testar diferentes nomes */
  contactsList?: EvolutionContact[];
  /** Callback quando o usuário troca o contato de teste */
  onSelectContact?: (contact: EvolutionContact) => void;
  /** Produto selecionado para preencher tags {produto}, {preco}, {link_venda} */
  selectedProduct?: LynxProduct | null;
  /** Título do produto avulso para preencher tag {produto} */
  productTitle?: string;
  /** Preço da oferta avulso para preencher tag {preco} */
  productPrice?: string;
  /** Link direto de compra para preencher tag {link_venda} */
  buyLink?: string;
  /** Link do catálogo para tag {link_catalogo} */
  catalogUrl?: string;
  /** Horário fixo ou atual (ex: "10:35") */
  timeString?: string;
  /** Modo compacto (para embutir em cards laterais) ou completo */
  compact?: boolean;
}

/**
 * Converte a formatação clássica do WhatsApp em elementos React ricos:
 * - *negrito* -> <strong>
 * - _itálico_ -> <em>
 * - ~tachado~ -> <del>
 * - ```código``` -> <code>
 * - URLs -> links estilizados em azul/verde
 */
function renderWhatsAppFormattedText(text: string, isDark: boolean) {
  if (!text) return null;

  // Quebra por linhas
  const lines = text.split("\n");

  return lines.map((line, lineIdx) => {
    if (!line) {
      return <div key={lineIdx} className="h-2" />;
    }

    // Processa tokens de formatação na linha
    // Regex para identificar URLs, negrito, itálico, tachado e código
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let keyCounter = 0;

    // Regex global de tokens do WhatsApp
    const tokenRegex =
      /(https?:\/\/[^\s]+)|(\*[^*\n]+\*)|(_[^_\n]+_)|(~[^~\n]+~)|(```[^`\n]+```)/;

    while (remaining.length > 0) {
      const match = remaining.match(tokenRegex);
      if (!match || match.index === undefined) {
        parts.push(remaining);
        break;
      }

      // Texto antes do match
      if (match.index > 0) {
        parts.push(remaining.substring(0, match.index));
      }

      const matchedStr = match[0];
      const partKey = `${lineIdx}-${keyCounter++}`;

      if (matchedStr.startsWith("http://") || matchedStr.startsWith("https://")) {
        parts.push(
          <a
            key={partKey}
            href={matchedStr}
            target="_blank"
            rel="noreferrer"
            className={`underline break-all transition-colors ${
              isDark ? "text-sky-400 hover:text-sky-300" : "text-blue-600 hover:text-blue-700"
            }`}
          >
            {matchedStr}
          </a>
        );
      } else if (matchedStr.startsWith("*") && matchedStr.endsWith("*")) {
        parts.push(
          <strong key={partKey} className="font-bold">
            {matchedStr.slice(1, -1)}
          </strong>
        );
      } else if (matchedStr.startsWith("_") && matchedStr.endsWith("_")) {
        parts.push(
          <em key={partKey} className="italic">
            {matchedStr.slice(1, -1)}
          </em>
        );
      } else if (matchedStr.startsWith("~") && matchedStr.endsWith("~")) {
        parts.push(
          <del key={partKey} className="line-through opacity-75">
            {matchedStr.slice(1, -1)}
          </del>
        );
      } else if (matchedStr.startsWith("```") && matchedStr.endsWith("```")) {
        parts.push(
          <code
            key={partKey}
            className={`px-1 py-0.5 rounded text-[11px] font-mono ${
              isDark ? "bg-black/30 text-amber-300" : "bg-slate-200 text-slate-800"
            }`}
          >
            {matchedStr.slice(3, -3)}
          </code>
        );
      } else {
        parts.push(matchedStr);
      }

      remaining = remaining.substring(match.index + matchedStr.length);
    }

    return (
      <div key={lineIdx} className="min-h-[1.15rem] leading-relaxed">
        {parts}
      </div>
    );
  });
}

export default function WhatsAppPhonePreview({
  message,
  imageUrl,
  senderName = "Vendas Lynx",
  senderAvatarUrl,
  selectedContact,
  contactsList = [],
  onSelectContact,
  selectedProduct,
  productTitle,
  productPrice,
  buyLink,
  catalogUrl = "https://loja.lynxems.com.br/loja",
  timeString,
  compact = false,
}: WhatsAppPhonePreviewProps) {
  // Alternador de tema do WhatsApp (Dark Mode padrão ou Light Mode)
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  // Alternador de perspectiva: como o cliente recebe (recebida) ou como o operador enviou
  const [bubblePerspective, setBubblePerspective] = useState<"RECEIVED" | "SENT">("RECEIVED");
  // Zoom da imagem no preview
  const [showImageModal, setShowImageModal] = useState(false);

  // Hora do relógio
  const currentClockTime = useMemo(() => {
    if (timeString) return timeString;
    const now = new Date();
    return now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }, [timeString]);

  // Contato ativo para interpolação
  const activeContactName = useMemo(() => {
    if (selectedContact?.name && selectedContact.has_valid_name) {
      return selectedContact.name;
    }
    if (selectedContact?.push_name) {
      return selectedContact.push_name;
    }
    return "Edson Manoel";
  }, [selectedContact]);

  // Resolução dinâmica de tags {nome}, {produto}, {preco}, {link_venda}, {link_catalogo}
  const resolvedMessage = useMemo(() => {
    const raw = message || "";
    const prodTitle = productTitle || selectedProduct?.title || "Sistema SINCO SolidWorks";
    const prodPrice =
      productPrice ||
      selectedProduct?.price_label ||
      (selectedProduct?.price ? `R$ ${selectedProduct.price}` : "R$ 97,00");
    const prodLink = buyLink || selectedProduct?.buy_link || catalogUrl;

    return raw
      .replace(/\{nome\}/gi, activeContactName)
      .replace(/\{produto\}/gi, prodTitle)
      .replace(/\{preco\}/gi, prodPrice)
      .replace(/\{link_venda\}/gi, prodLink)
      .replace(/\{link_catalogo\}/gi, catalogUrl);
  }, [message, activeContactName, selectedProduct, productTitle, productPrice, buyLink, catalogUrl]);

  const isDark = theme === "dark";

  return (
    <div className="flex flex-col items-center select-none">
      {/* BARRA SUPERIOR DE CONTROLES DO SIMULADOR */}
      {!compact && (
        <div className="w-full max-w-[380px] mb-3 px-1 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400">Tema:</span>
            <div className="inline-flex p-0.5 rounded-lg bg-slate-900 border border-slate-700/80">
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition ${
                  isDark
                    ? "bg-slate-800 text-emerald-400 font-bold shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
                title="WhatsApp Modo Escuro"
              >
                <Moon className="w-3 h-3" />
                Escuro
              </button>
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition ${
                  !isDark
                    ? "bg-slate-200 text-slate-900 font-bold shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
                title="WhatsApp Modo Claro"
              >
                <Sun className="w-3 h-3" />
                Claro
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400">Visão:</span>
            <div className="inline-flex p-0.5 rounded-lg bg-slate-900 border border-slate-700/80">
              <button
                type="button"
                onClick={() => setBubblePerspective("RECEIVED")}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition ${
                  bubblePerspective === "RECEIVED"
                    ? "bg-emerald-600 text-white font-bold shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Visualização na tela do cliente (Mensagem Recebida)"
              >
                Do Cliente
              </button>
              <button
                type="button"
                onClick={() => setBubblePerspective("SENT")}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition ${
                  bubblePerspective === "SENT"
                    ? "bg-emerald-600 text-white font-bold shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Visualização na tela do operador (Mensagem Enviada)"
              >
                Da Loja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SELETOR RÁPIDO DE CONTATO DE TESTE */}
      {contactsList.length > 0 && onSelectContact && !compact && (
        <div className="w-full max-w-[380px] mb-3 px-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>Simular com Lead Real:</span>
            <span className="text-emerald-400 font-mono font-semibold">
              Tag: &#123;nome&#125; = {activeContactName}
            </span>
          </div>
          <select
            value={selectedContact?.id || ""}
            onChange={(e) => {
              const found = contactsList.find((c) => c.id === e.target.value);
              if (found) onSelectContact(found);
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            {contactsList.slice(0, 50).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name && c.has_valid_name ? c.name : c.push_name || c.phone} ({c.formatted_phone || c.phone})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* MOLDURA DO SMARTPHONE (CHASSI PREMIUM COM BORDAS E REFLEXO) */}
      <div className="relative w-[340px] sm:w-[365px] h-[640px] sm:h-[680px] rounded-[48px] p-3 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 border-[5px] border-slate-700/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] ring-1 ring-slate-600/40 flex flex-col justify-between overflow-hidden">
        {/* BOTÃO LATERAL FÍSICO ESQUERDO (VOLUME) */}
        <div className="absolute -left-[7px] top-28 w-[3px] h-10 bg-slate-600 rounded-l-sm" />
        <div className="absolute -left-[7px] top-42 w-[3px] h-12 bg-slate-600 rounded-l-sm" />
        {/* BOTÃO LATERAL FÍSICO DIREITO (POWER) */}
        <div className="absolute -right-[7px] top-32 w-[3px] h-14 bg-slate-600 rounded-r-sm" />

        {/* TELA INTERNA DO CELULAR */}
        <div
          className={`relative w-full h-full rounded-[40px] overflow-hidden flex flex-col transition-colors duration-200 ${
            isDark ? "bg-[#0b141a] text-slate-100" : "bg-[#efeae2] text-slate-900"
          }`}
          style={{
            backgroundImage: isDark
              ? "radial-gradient(circle at 50% 50%, rgba(16, 29, 37, 0.6) 0%, rgba(11, 20, 26, 0.95) 100%)"
              : "radial-gradient(circle at 50% 50%, rgba(240, 235, 227, 0.8) 0%, rgba(234, 226, 214, 0.95) 100%)",
          }}
        >
          {/* 1. STATUS BAR DO SISTEMA (HORA, 5G, WI-FI, BATERIA) */}
          <div
            className={`shrink-0 h-10 px-6 pt-1.5 flex items-center justify-between text-[12px] font-semibold tracking-tight z-20 ${
              isDark ? "text-slate-200 bg-[#1f2c34]" : "text-white bg-[#008069]"
            }`}
          >
            <span>{currentClockTime}</span>

            {/* NOTCH / DYNAMIC ISLAND COM CÂMERA FRONTAL */}
            <div className="w-24 h-4 bg-black rounded-full flex items-center justify-center gap-2 px-2 shadow-inner">
              <div className="w-2 h-2 rounded-full bg-[#111] ring-1 ring-slate-800" />
              <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
            </div>

            <div className="flex items-center gap-1.5">
              <Signal className="w-3.5 h-3.5 stroke-[2.2]" />
              <Wifi className="w-3.5 h-3.5 stroke-[2.2]" />
              <div className="flex items-center">
                <div className="w-5 h-2.5 rounded-xs border border-current p-0.5 flex items-center">
                  <div className="w-full h-full bg-emerald-400 rounded-2xs" />
                </div>
                <div className="w-0.5 h-1 bg-current rounded-r-xs" />
              </div>
            </div>
          </div>

          {/* 2. CABEÇALHO OFICIAL DO WHATSAPP */}
          <div
            className={`shrink-0 px-3 py-2 flex items-center justify-between shadow-xs z-10 ${
              isDark ? "bg-[#1f2c34] text-slate-100 border-b border-[#222e35]" : "bg-[#008069] text-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="p-1 -ml-1 text-slate-300 hover:text-white"
                title="Voltar"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              {/* Avatar da Loja / Contato */}
              <div className="relative">
                {senderAvatarUrl ? (
                  <img
                    src={senderAvatarUrl}
                    alt={senderName}
                    className="w-9 h-9 rounded-full object-cover ring-1 ring-black/10"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-extrabold text-xs shadow-xs">
                    {senderName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                {/* Ponto verde de online */}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#1f2c34]" />
              </div>

              {/* Nome e Status do Contato */}
              <div className="leading-tight">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-[13px] tracking-tight truncate max-w-[130px] sm:max-w-[150px]">
                    {senderName}
                  </span>
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 fill-emerald-400/20" />
                </div>
                <span className={`text-[10px] ${isDark ? "text-emerald-400" : "text-emerald-100"}`}>
                  online agora
                </span>
              </div>
            </div>

            {/* Ícones de Chamada e Menu */}
            <div className="flex items-center gap-3 text-slate-300">
              <Video className="w-4 h-4 cursor-pointer hover:text-white" />
              <Phone className="w-3.5 h-3.5 cursor-pointer hover:text-white" />
              <MoreVertical className="w-4 h-4 cursor-pointer hover:text-white" />
            </div>
          </div>

          {/* 3. ÁREA DE CHAT DO WHATSAPP (MENSAGENS & PAPEL DE PAREDE) */}
          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col justify-end space-y-3 relative">
            {/* PADRÃO SUTIL DE TEXTURA DO WHATSAPP (DOODLES BACKGROUND) */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.06] bg-repeat"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />

            {/* DATA CENTRAL (HOJE) */}
            <div className="flex justify-center z-10">
              <span
                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-xs ${
                  isDark
                    ? "bg-[#182229] text-[#8696a0] border border-[#222d34]"
                    : "bg-white/90 text-[#54656f] border border-slate-200/80 shadow-2xs"
                }`}
              >
                Hoje
              </span>
            </div>

            {/* AVISO DE CRIPTOGRAFIA DE PONTA A PONTA */}
            <div className="flex justify-center z-10 px-2">
              <div
                className={`max-w-[290px] p-2 rounded-lg text-[10px] text-center leading-tight flex items-start justify-center gap-1.5 shadow-2xs ${
                  isDark
                    ? "bg-[#182229]/95 text-[#ffd279] border border-[#ffd279]/15"
                    : "bg-[#ffeecd] text-[#54656f] border border-[#ffe4a0]"
                }`}
              >
                <Lock className="w-3 h-3 shrink-0 mt-0.5" />
                <span>
                  As mensagens são protegidas com a criptografia de ponta a ponta da Meta.
                </span>
              </div>
            </div>

            {/* BALÃO DE MENSAGEM DO WHATSAPP (COM IMAGEM & TEXTO) */}
            <div
              className={`flex w-full z-10 ${
                bubblePerspective === "SENT" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`relative max-w-[88%] sm:max-w-[85%] rounded-2xl shadow-md overflow-hidden transition-all duration-150 ${
                  bubblePerspective === "SENT"
                    ? isDark
                      ? "bg-[#005c4b] text-[#e9edef] rounded-tr-xs"
                      : "bg-[#d9fdd3] text-[#111b21] rounded-tr-xs"
                    : isDark
                    ? "bg-[#202c33] text-[#e9edef] rounded-tl-xs"
                    : "bg-white text-[#111b21] rounded-tl-xs"
                }`}
              >
                {/* 3.1. IMAGEM ANEXADA (SE HOUVER) */}
                {imageUrl && (
                  <div
                    className="relative w-full aspect-video sm:aspect-[16/10] bg-black/40 overflow-hidden cursor-pointer group"
                    onClick={() => setShowImageModal(true)}
                    title="Clique para expandir a imagem"
                  >
                    <img
                      src={imageUrl}
                      alt="Anexo da mensagem"
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    />

                    {/* Badge flutuante sobre a imagem */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold flex items-center gap-1 shadow-xs">
                      <ImageIcon className="w-2.5 h-2.5" />
                      Foto Oficial
                    </div>

                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Eye className="w-5 h-5 drop-shadow-md" />
                    </div>
                  </div>
                )}

                {/* 3.2. CORPO DA MENSAGEM (LEGENDA / TEXTO COM FORMATOS) */}
                <div className="p-2.5 sm:p-3 text-[12.5px] leading-relaxed break-words space-y-1">
                  {renderWhatsAppFormattedText(resolvedMessage, isDark)}

                  {/* 3.3. RODAPÉ DO BALÃO: HORA E DOUBLE CHECK AZUL */}
                  <div className="flex items-center justify-end gap-1 pt-1 -mb-0.5 text-[10px] select-none">
                    <span
                      className={`text-[10px] ${
                        isDark ? "text-[#8696a0]" : "text-[#667781]"
                      }`}
                    >
                      {currentClockTime}
                    </span>

                    {/* Double Check azul característico */}
                    <CheckCheck
                      className={`w-3.5 h-3.5 ${
                        bubblePerspective === "SENT"
                          ? "text-[#53bdeb]" // Azul clássico do WhatsApp lido
                          : isDark
                          ? "text-[#8696a0]"
                          : "text-[#667781]"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. BARRA INFERIOR DE DIGITAÇÃO DO WHATSAPP (AUTENTICIDADE TOTAL) */}
          <div
            className={`shrink-0 p-2 flex items-center gap-1.5 z-10 ${
              isDark ? "bg-[#1f2c34] border-t border-[#222e35]" : "bg-[#f0f2f5] border-t border-slate-200"
            }`}
          >
            <div
              className={`flex-1 h-9 rounded-full px-3 flex items-center gap-2 ${
                isDark ? "bg-[#2a3942] text-slate-400" : "bg-white text-slate-500 shadow-2xs"
              }`}
            >
              <Smile className="w-4 h-4 cursor-pointer hover:text-slate-300" />
              <span className="text-xs truncate flex-1 opacity-70">
                Mensagem
              </span>
              <Paperclip className="w-4 h-4 cursor-pointer hover:text-slate-300 -rotate-45" />
              <Camera className="w-4 h-4 cursor-pointer hover:text-slate-300" />
            </div>

            {/* Botão de Áudio (Microfone Verde) */}
            <div className="w-9 h-9 rounded-full bg-[#00a884] flex items-center justify-center text-white shadow-sm shrink-0 cursor-pointer hover:bg-[#029071] transition">
              <Mic className="w-4 h-4" />
            </div>
          </div>

          {/* BARRA INFERIOR DE NAVEGAÇÃO DO SMARTPHONE (HOME BAR) */}
          <div
            className={`shrink-0 h-3 flex items-center justify-center ${
              isDark ? "bg-[#1f2c34]" : "bg-[#f0f2f5]"
            }`}
          >
            <div
              className={`w-28 h-1 rounded-full ${
                isDark ? "bg-slate-600/70" : "bg-slate-400/80"
              }`}
            />
          </div>
        </div>
      </div>

      {/* MODAL DE ZOOM DA IMAGEM QUANDO CLICADA */}
      {showImageModal && imageUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-lg w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-200">
                Foto Enviada via WhatsApp
              </span>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] flex items-center justify-center bg-black/50 rounded-xl overflow-hidden">
              <img
                src={imageUrl}
                alt="Visualização expandida"
                className="max-h-[65vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

