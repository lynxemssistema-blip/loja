"use client";

import React, { useMemo, useState } from "react";
import { GroupFinancialReport, LynxUser } from "@/lib/types";
import { formatBRL } from "@/lib/calculator";
import {
  ArrowDownRight,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  Download,
  Layers,
  MessageSquareShare,
  Percent,
  Plus,
  Receipt,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";

interface Props {
  report: GroupFinancialReport;
  currentUser: LynxUser;
  isSuperAdminView: boolean;
  onEditGroupRules: () => void;
  onOpenNewExpenseModal: () => void;
  onOpenNewPaymentModal: () => void;
  onDeleteExpense: (expenseId: string) => Promise<void>;
  onDeletePayment: (paymentId: string) => Promise<void>;
  onTogglePayout: (params: {
    groupId: string;
    partnerId: string;
    referenceMonth: string;
    calculatedAmount: number;
    status: "PENDING" | "PAID";
  }) => Promise<void>;
}

export default function TransparencyDashboard({
  report,
  currentUser,
  isSuperAdminView,
  onEditGroupRules,
  onOpenNewExpenseModal,
  onOpenNewPaymentModal,
  onDeleteExpense,
  onDeletePayment,
  onTogglePayout,
}: Props) {
  const [copiedPix, setCopiedPix] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "RECEIVED" | "PENDING" | "OVERDUE"
  >("ALL");

  const mySplit = report.splits.find((s) => s.partnerId === currentUser.id);

  const filteredPayments = useMemo(() => {
    return report.payments.filter((p) => {
      const matchesStatus =
        statusFilter === "ALL"
          ? true
          : statusFilter === "RECEIVED"
          ? p.status === "RECEIVED" || p.status === "CONFIRMED"
          : p.status === statusFilter;

      const q = paymentSearch.trim().toLowerCase();
      const matchesQuery =
        !q ||
        p.customer_name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        p.billing_type.toLowerCase().includes(q);

      return matchesStatus && matchesQuery;
    });
  }, [report.payments, statusFilter, paymentSearch]);

  const copyPix = (pix: string) => {
    if (!pix) return;
    navigator.clipboard.writeText(pix);
    setCopiedPix(pix);
    setTimeout(() => setCopiedPix(null), 2000);
  };

  const copyWhatsAppReport = () => {
    const lines = [
      `📊 *DEMONSTRATIVO PARCEIRO LYNX — ${report.group.display_name.toUpperCase()}*`,
      `📅 Competência: ${
        report.referenceMonth === "ALL"
          ? "Todo o Período"
          : report.referenceMonth
      }`,
      `-----------------------------------`,
      `💰 *Valor Bruto das Vendas Pagas:* ${formatBRL(report.receivedGross)}`,
      `🏷️ *(-) Taxas / Descontos do Asaas:* - ${formatBRL(
        report.asaasFeesTotal + report.totalDiscountsGranted
      )}`,
      `✅ *(=) Valor Líquido Asaas (Já c/ desconto Asaas):* *${formatBRL(
        report.asaasNetTotal
      )}*`,
      `-----------------------------------`,
      `📉 *DEDUÇÕES E CUSTOS DO GRUPO:*`,
      ...report.deductionItems.map(
        (d) =>
          `• (-) ${d.name} (${
            d.type === "PERCENTAGE" ? `${d.rateOrFixed}%` : "Fixo"
          }): - ${formatBRL(d.calculatedAmount)}`
      ),
      `• (-) Outras Despesas Lançadas (${report.expenses.length}): - ${formatBRL(
        report.totalExtraExpenses
      )}`,
      `-----------------------------------`,
      `💎 *(=) VALOR LÍQUIDO DISTRIBUÍVEL:* *${formatBRL(
        report.distributableNet
      )}*`,
      `-----------------------------------`,
      `🤝 *DIVISÃO ENTRE PARCEIROS (SPLIT):*`,
      ...report.splits.map(
        (s) =>
          `• *${s.partnerLabel}* (${s.percentage}%): *${formatBRL(
            s.amountToReceive
          )}* [${s.payoutStatus === "PAID" ? "PAGO ✅" : "PENDENTE ⏳"}]`
      ),
    ];

    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 3000);
  };

  const exportCsv = () => {
    const rows: string[][] = [
      ["PARCEIRO LYNX - EXTRATO DE TRANSPARENCIA FINANCEIRA"],
      ["Grupo", report.group.display_name],
      ["Competencia", report.referenceMonth],
      ["Valor Original Faturado", String(report.totalOriginalBilled)],
      ["Descontos Concedidos", String(report.totalDiscountsGranted)],
      ["Valor Recebido", String(report.receivedGross)],
      ...report.deductionItems.map((d) => [
        `Deducao: ${d.name} (${d.type === "PERCENTAGE" ? d.rateOrFixed + "%" : "Fixo"})`,
        String(-d.calculatedAmount),
      ]),
      ["Outras Despesas Operacionais", String(-report.totalExtraExpenses)],
      ["VALOR LIQUIDO DISTRIBUIVEL", String(report.distributableNet)],
      [],
      ["DIVISAO DO SPLIT POR PARCEIRO"],
      ["Parceiro", "Cota", "Percentual (%)", "Valor a Receber (R$)", "Status"],
      ...report.splits.map((s) => [
        s.partnerName,
        s.partnerLabel,
        String(s.percentage),
        String(s.amountToReceive),
        s.payoutStatus,
      ]),
      [],
      ["VENDAS E COBRANCAS DO GRUPO (ASAAS)"],
      [
        "ID Asaas",
        "Cliente",
        "Descricao",
        "Meio",
        "Valor Original",
        "Desconto",
        "Valor Pago",
        "Taxa Asaas",
        "Status",
        "Vencimento",
      ],
      ...report.payments.map((p) => [
        p.asaas_payment_id,
        p.customer_name,
        p.description,
        p.billing_type,
        String(Number(p.gross_value || 0) + Number(p.discount_value || 0)),
        String(p.discount_value || 0),
        String(p.gross_value || 0),
        String(p.asaas_fee || 0),
        p.status,
        p.due_date,
      ]),
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
    link.download = `extrato-${report.group.display_name
      .toLowerCase()
      .replace(/\s+/g, "-")}-${report.referenceMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Banner do Grupo Selecionado */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/60 border border-slate-800 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              Transparência Total do Grupo
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Grupo Asaas: &quot;{report.group.asaas_group_name}&quot;
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              Período:{" "}
              {report.referenceMonth === "ALL"
                ? "Todo o Histórico"
                : report.referenceMonth}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white">
            {report.group.display_name}
          </h2>
          <p className="text-sm text-slate-300 max-w-3xl">
            {report.group.description ||
              "Demonstrativo aberto de faturamento, descontos, alíquotas operacionais, despesas extras e rateio líquido entre parceiros."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyWhatsAppReport}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-500/30 transition"
          >
            <MessageSquareShare className="w-4 h-4 text-emerald-400" />
            {copiedSummary
              ? "Copiado p/ WhatsApp!"
              : "Copiar Resumo WhatsApp"}
          </button>

          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Download className="w-4 h-4 text-sky-400" />
            Exportar CSV
          </button>

          {isSuperAdminView && (
            <>
              <button
                onClick={onEditGroupRules}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition"
              >
                <Settings2 className="w-4 h-4 text-sky-400" />
                Configurar Impostos & Split
              </button>
              <button
                onClick={onOpenNewExpenseModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-500/30 transition"
              >
                <Plus className="w-4 h-4 text-rose-400" />
                Lançar Custo
              </button>
              <button
                onClick={onOpenNewPaymentModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 border border-sky-500/30 transition"
              >
                <Plus className="w-4 h-4 text-sky-400" />
                Lançar Venda
              </button>
            </>
          )}
        </div>
      </div>

      {/* 4 Cards KPI de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Valor Líquido Asaas (Já com desconto do Asaas) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Recebido Líquido (Já c/ Desc. Asaas)</span>
            <span className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {formatBRL(report.asaasNetTotal)}
          </div>
          <div className="text-xs text-slate-400 flex flex-col gap-0.5 pt-1 border-t border-slate-800/80">
            <div className="flex justify-between">
              <span>Valor bruto pago:</span>
              <span className="font-mono text-slate-300">
                {formatBRL(report.receivedGross)}
              </span>
            </div>
            <div className="flex justify-between text-amber-300/90">
              <span>(-) Desconto / Taxas Asaas:</span>
              <span className="font-mono">
                -{" "}
                {formatBRL(
                  report.asaasFeesTotal + report.totalDiscountsGranted
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Deduções do Grupo (Ex: 32% Impostos + 15% Infraestrutura) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Impostos & Infraestrutura ({report.totalPercentageRate}%)
            </span>
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Percent className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300">
            - {formatBRL(report.totalRuleDeductions)}
          </div>
          <div className="text-xs text-slate-400 flex flex-col gap-0.5 pt-1 border-t border-slate-800/80">
            {report.deductionItems.map((d) => (
              <div key={d.id} className="flex justify-between">
                <span className="truncate pr-2">
                  {d.name} (
                  {d.type === "PERCENTAGE" ? `${d.rateOrFixed}%` : "Fixo"}):
                </span>
                <span className="font-mono text-amber-200/90">
                  - {formatBRL(d.calculatedAmount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Outras Despesas Operacionais Lançadas */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Outras Despesas da Operação</span>
            <span className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-300">
            - {formatBRL(report.totalExtraExpenses)}
          </div>
          <div className="text-xs text-slate-400 flex flex-col gap-0.5 pt-1 border-t border-slate-800/80">
            <div className="flex justify-between">
              <span>Despesas avulsas lançadas:</span>
              <span className="font-mono text-slate-300">
                {report.expenses.length} lançamento(s)
              </span>
            </div>
            <div className="flex justify-between">
              <span>A receber / Pendentes Asaas:</span>
              <span className="font-mono text-sky-300">
                {formatBRL(report.pendingTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Valor Líquido & Cota do Parceiro */}
        <div className="bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-emerald-300">
            <span className="font-semibold">
              {mySplit && !isSuperAdminView
                ? `Seu Valor a Receber (${mySplit.percentage}%)`
                : "Valor Líquido p/ Divisão (Split)"}
            </span>
            <span className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-300">
            {mySplit && !isSuperAdminView
              ? formatBRL(mySplit.amountToReceive)
              : formatBRL(report.distributableNet)}
          </div>
          <div className="text-xs text-slate-300 flex flex-col gap-0.5 pt-1 border-t border-emerald-500/20">
            <div className="flex justify-between">
              <span>Total Líquido do Grupo:</span>
              <span className="font-mono font-semibold text-white">
                {formatBRL(report.distributableNet)}
              </span>
            </div>
            <div className="flex justify-between text-emerald-300">
              <span>Partes no Split:</span>
              <span className="font-mono">
                {report.splits.map((s) => `${s.percentage}%`).join(" / ")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cascata de Transparência Total + Divisão (Split Payment) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna 1: Demonstrativo Passo a Passo (DRE do Grupo) */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                Demonstrativo de Apuração Líquida (Passo a Passo)
              </h3>
              <p className="text-xs text-slate-400">
                Auditoria aberta de como o valor recebido chega ao valor líquido
                dividido.
              </p>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-mono">
              Base:{" "}
              {report.group.calculation_base === "RECEIVED_GROSS"
                ? "Valor Recebido"
                : "Líquido Asaas"}
            </span>
          </div>

          <div className="space-y-2.5 text-sm">
            {/* Linha 1: Vendas Brutas, Taxas Asaas e Valor Líquido Asaas */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>
                  Valor Bruto Pago pelos Clientes ({report.receivedCount} vendas)
                </span>
                <span className="font-mono text-slate-200">
                  {formatBRL(report.receivedGross)}
                </span>
              </div>
              {report.totalDiscountsGranted > 0 && (
                <div className="flex justify-between text-xs text-amber-300/80">
                  <span>(-) Descontos Concedidos nas Faturas</span>
                  <span className="font-mono">
                    - {formatBRL(report.totalDiscountsGranted)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xs text-rose-300/90">
                <span>(-) Taxas / Descontos do Asaas (Pix / Boleto / Cartão)</span>
                <span className="font-mono">
                  - {formatBRL(report.asaasFeesTotal)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-slate-800 font-semibold text-white">
                <span>
                  (=) Valor Líquido Asaas (Já c/ Desconto do Asaas)
                </span>
                <span className="font-mono text-base text-sky-300">
                  {formatBRL(report.asaasNetTotal)}
                </span>
              </div>
            </div>

            {/* Linhas de Alíquotas do Grupo (Ex: 32% Impostos, 15% Operação/Infra) */}
            {report.deductionItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-200"
              >
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="font-medium text-xs sm:text-sm">
                      (-) {item.name}
                    </div>
                    <div className="text-[11px] text-amber-300/70">
                      Regra do grupo:{" "}
                      {item.type === "PERCENTAGE"
                        ? `${item.rateOrFixed}% sobre ${formatBRL(
                            report.baseUsedForCalculation
                          )}`
                        : `Valor fixo de ${formatBRL(item.rateOrFixed)}`}
                    </div>
                  </div>
                </div>
                <span className="font-mono font-semibold text-amber-300">
                  - {formatBRL(item.calculatedAmount)}
                </span>
              </div>
            ))}

            {report.deductedAsaasFeeInWaterfall > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-300">
                <div className="text-xs">
                  (-) Taxas de Boleto/Pix/Cartão Retidas pelo Asaas
                </div>
                <span className="font-mono font-semibold text-rose-300">
                  - {formatBRL(report.deductedAsaasFeeInWaterfall)}
                </span>
              </div>
            )}

            {/* Linha de Outras Despesas Operacionais */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 text-rose-200">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <div className="font-medium text-xs sm:text-sm">
                    (-) Outras Despesas / Custos da Operação Lançados
                  </div>
                  <div className="text-[11px] text-rose-300/70">
                    {report.expenses.length} despesa(s) lançada(s) neste grupo
                  </div>
                </div>
              </div>
              <span className="font-mono font-semibold text-rose-300">
                - {formatBRL(report.totalExtraExpenses)}
              </span>
            </div>

            {/* Resultado Líquido Final */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-500/15 to-sky-500/15 border border-emerald-500/40">
              <div>
                <div className="text-xs uppercase tracking-wider font-semibold text-emerald-300">
                  Base Líquida Final para Split
                </div>
                <div className="text-base font-bold text-white">
                  (=) Valor Líquido Distribuível
                </div>
              </div>
              <div className="text-xl font-bold font-mono text-emerald-300">
                {formatBRL(report.distributableNet)}
              </div>
            </div>
          </div>
        </div>

        {/* Coluna 2: Divisão do Valor Líquido (Split entre Parceiros) */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Divisão do Valor Líquido (Split Payment do Grupo)
                </h3>
                <p className="text-xs text-slate-400">
                  Valores a receber calculados automaticamente sobre o líquido
                  de{" "}
                  <strong className="text-white font-mono">
                    {formatBRL(report.distributableNet)}
                  </strong>
                  .
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {report.splits.length} Parte(s)
              </span>
            </div>

            <div className="space-y-3">
              {report.splits.map((split) => {
                const isCurrentUsersShare = split.partnerId === currentUser.id;
                return (
                  <div
                    key={split.splitId}
                    className={`p-4 rounded-xl border transition ${
                      isCurrentUsersShare
                        ? "bg-emerald-950/30 border-emerald-500/50"
                        : "bg-slate-950/70 border-slate-800"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            {split.partnerLabel}
                          </span>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                            {split.percentage}% do Líquido
                          </span>
                          {isCurrentUsersShare && (
                            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                              Sua Cota
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          Parceiro: {split.partnerName} ({split.partnerEmail})
                        </div>
                        {split.partnerPixKey && (
                          <div className="flex items-center gap-2 text-xs text-slate-300 pt-0.5">
                            <span className="text-slate-400">Chave Pix:</span>
                            <code className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-sky-300">
                              {split.partnerPixKey}
                            </code>
                            <button
                              type="button"
                              onClick={() => copyPix(split.partnerPixKey)}
                              className="text-slate-400 hover:text-white inline-flex items-center gap-1 text-[11px]"
                            >
                              <Copy className="w-3 h-3" />
                              {copiedPix === split.partnerPixKey
                                ? "Copiado!"
                                : "Copiar"}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex sm:flex-col items-end justify-between gap-2">
                        <div className="text-right">
                          <div className="text-[11px] text-slate-400">
                            Valor Líquido a Receber
                          </div>
                          <div className="text-xl font-bold font-mono text-emerald-400">
                            {formatBRL(split.amountToReceive)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {split.payoutStatus === "PAID" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Repasse Pago
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              <Clock className="w-3.5 h-3.5" />
                              Aguardando Repasse
                            </span>
                          )}

                          {isSuperAdminView && (
                            <button
                              type="button"
                              onClick={() =>
                                onTogglePayout({
                                  groupId: report.group.id,
                                  partnerId: split.partnerId,
                                  referenceMonth: report.referenceMonth,
                                  calculatedAmount: split.amountToReceive,
                                  status:
                                    split.payoutStatus === "PAID"
                                      ? "PENDING"
                                      : "PAID",
                                })
                              }
                              className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                            >
                              {split.payoutStatus === "PAID"
                                ? "Reabrir"
                                : "Confirmar Repasse"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-sky-500/5 border border-sky-500/20 flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
              Fórmula ativa no {report.group.display_name}: Receita Recebida (
              {formatBRL(report.baseUsedForCalculation)}) -{" "}
              {report.deductionItems
                .map((d) =>
                  d.type === "PERCENTAGE"
                    ? `${d.rateOrFixed}% ${d.name}`
                    : formatBRL(d.rateOrFixed)
                )
                .join(" - ")}{" "}
              - Despesas ({formatBRL(report.totalExtraExpenses)}) ={" "}
              <strong className="text-white">
                {formatBRL(report.distributableNet)}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Tabelas de Transparência: 1. Outras Despesas Operacionais & 2. Vendas / Cobranças Asaas */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Outras Despesas Lançadas */}
        <div className="xl:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-rose-400" />
                Outras Despesas / Custos da Operação
              </h3>
              <p className="text-xs text-slate-400">
                Despesas lançadas neste grupo que deduzem antes do Split.
              </p>
            </div>
            {isSuperAdminView && (
              <button
                onClick={onOpenNewExpenseModal}
                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-500/30"
              >
                <Plus className="w-3.5 h-3.5" />
                Lançar
              </button>
            )}
          </div>

          {report.expenses.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
              Nenhuma despesa extra lançada para este grupo no período.
            </div>
          ) : (
            <div className="space-y-2.5">
              {report.expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">
                        {exp.description}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {exp.category}
                      </span>
                    </div>
                    {exp.notes && (
                      <p className="text-xs text-slate-400">{exp.notes}</p>
                    )}
                    <div className="text-[11px] text-slate-500">
                      Data: {exp.expense_date} • Lançado por: {exp.created_by}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold text-sm text-rose-300">
                      - {formatBRL(exp.amount)}
                    </span>
                    {isSuperAdminView && (
                      <button
                        type="button"
                        onClick={() => onDeleteExpense(exp.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Excluir despesa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cobranças / Vendas do Grupo no Asaas */}
        <div className="xl:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-sky-400" />
                Vendas, Descontos & Recebimentos do Grupo (Asaas)
              </h3>
              <p className="text-xs text-slate-400">
                Listagem transparente de todas as cobranças dos clientes deste
                grupo.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none w-40"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as "ALL" | "RECEIVED" | "PENDING" | "OVERDUE"
                  )
                }
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="ALL">Todos ({report.payments.length})</option>
                <option value="RECEIVED">
                  Recebidos ({report.receivedCount})
                </option>
                <option value="PENDING">
                  A Vencer ({report.pendingCount})
                </option>
                <option value="OVERDUE">
                  Vencidos ({report.overdueCount})
                </option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 pr-3 font-medium">
                    Cliente / Descrição
                  </th>
                  <th className="py-2.5 px-2 font-medium">Meio</th>
                  <th className="py-2.5 px-2 font-medium text-right">
                    Valor Bruto
                  </th>
                  <th className="py-2.5 px-2 font-medium text-right">
                    Desc. / Taxa Asaas
                  </th>
                  <th className="py-2.5 px-2 font-medium text-right">
                    Valor Líquido (Asaas)
                  </th>
                  <th className="py-2.5 pl-2 font-medium text-right">Status</th>
                  {isSuperAdminView && <th className="py-2.5 pl-2"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredPayments.map((pay) => {
                  const totalAsaasDiscountAndFee =
                    Number(pay.asaas_fee || 0) +
                    Number(pay.discount_value || 0);
                  return (
                    <tr key={pay.id} className="hover:bg-slate-800/30">
                      <td className="py-3 pr-3">
                        <div className="font-semibold text-white">
                          {pay.customer_name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {pay.description} • Venc: {pay.due_date}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                          {pay.billing_type}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-slate-300">
                        {formatBRL(pay.gross_value)}
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-amber-300">
                        {totalAsaasDiscountAndFee > 0
                          ? `- ${formatBRL(totalAsaasDiscountAndFee)}`
                          : "R$ 0,00"}
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-bold text-emerald-300">
                        {formatBRL(pay.net_value)}
                      </td>
                      <td className="py-3 pl-2 text-right">
                        {pay.status === "RECEIVED" ||
                        pay.status === "CONFIRMED" ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Recebido
                          </span>
                        ) : pay.status === "PENDING" ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                            A Vencer
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            Vencido
                          </span>
                        )}
                      </td>
                      {isSuperAdminView && (
                        <td className="py-3 pl-2 text-right">
                          <button
                            type="button"
                            onClick={() => onDeletePayment(pay.id)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                            title="Remover cobrança"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
