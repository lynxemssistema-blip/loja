"use client";

import React, { useState } from "react";
import {
  CalculationBase,
  LynxExpense,
  LynxGroup,
  LynxGroupDeduction,
  LynxGroupSplit,
  LynxPayment,
  LynxUser,
} from "@/lib/types";
import { formatBRL } from "@/lib/calculator";
import {
  Plus,
  Trash2,
  Percent,
  Users,
  Calculator,
  CheckCircle2,
  Scale,
  AlertTriangle,
} from "lucide-react";

interface Props {
  initialGroup?: LynxGroup;
  initialDeductions: LynxGroupDeduction[];
  initialSplits: LynxGroupSplit[];
  groupPayments: LynxPayment[];
  groupExpenses: LynxExpense[];
  allUsers: LynxUser[];
  onSave: (data: {
    group: LynxGroup;
    deductions: LynxGroupDeduction[];
    splits: LynxGroupSplit[];
  }) => Promise<void>;
  onCancel: () => void;
}

export default function GroupRuleBuilderModal({
  initialGroup,
  initialDeductions,
  initialSplits,
  groupPayments,
  groupExpenses,
  allUsers,
  onSave,
  onCancel,
}: Props) {
  const [displayName, setDisplayName] = useState(
    initialGroup?.display_name || ""
  );
  const [asaasGroupName, setAsaasGroupName] = useState(
    initialGroup?.asaas_group_name || ""
  );
  const [description, setDescription] = useState(
    initialGroup?.description || ""
  );
  const [calculationBase, setCalculationBase] = useState<CalculationBase>(
    initialGroup?.calculation_base || "ASAAS_NET"
  );
  const [deductAsaasFees, setDeductAsaasFees] = useState<boolean>(
    initialGroup?.deduct_asaas_fees ?? true
  );

  const [deductions, setDeductions] = useState<LynxGroupDeduction[]>(
    initialDeductions.length > 0
      ? initialDeductions.map((d) => ({ ...d }))
      : [
          {
            id: `ded-tmp-1`,
            group_id: initialGroup?.id || "",
            name: "Impostos",
            type: "PERCENTAGE",
            value: 32,
            sort_order: 1,
            active: true,
          },
          {
            id: `ded-tmp-2`,
            group_id: initialGroup?.id || "",
            name: "Custo da Operação / Infraestrutura",
            type: "PERCENTAGE",
            value: 15,
            sort_order: 2,
            active: true,
          },
        ]
  );

  const [splits, setSplits] = useState<LynxGroupSplit[]>(
    initialSplits.length > 0
      ? initialSplits.map((s) => ({ ...s }))
      : allUsers.slice(0, 2).map((u, idx) => ({
          id: `spl-tmp-${idx}`,
          group_id: initialGroup?.id || "",
          partner_id: u.id,
          partner_label: `Cota ${u.name}`,
          percentage: 50,
          can_view_group: true,
        }))
  );

  const [saving, setSaving] = useState(false);

  const addDeductionRow = () => {
    setDeductions((prev) => [
      ...prev,
      {
        id: `ded-${Date.now()}`,
        group_id: initialGroup?.id || "",
        name: "Nova Taxa / Custo",
        type: "PERCENTAGE",
        value: 5,
        sort_order: prev.length + 1,
        active: true,
      },
    ]);
  };

  const removeDeductionRow = (id: string) => {
    setDeductions((prev) => prev.filter((d) => d.id !== id));
  };

  const addSplitRow = () => {
    const defaultUser = allUsers[0];
    if (!defaultUser) return;
    setSplits((prev) => [
      ...prev,
      {
        id: `spl-${Date.now()}`,
        group_id: initialGroup?.id || "",
        partner_id: defaultUser.id,
        partner_label: `Cota ${defaultUser.name}`,
        percentage: 0,
        can_view_group: true,
      },
    ]);
  };

  const removeSplitRow = (id: string) => {
    setSplits((prev) => prev.filter((s) => s.id !== id));
  };

  const distributeEqually = () => {
    if (splits.length === 0) return;
    const share = Number((100 / splits.length).toFixed(2));
    setSplits((prev) =>
      prev.map((s, idx) => ({
        ...s,
        percentage:
          idx === prev.length - 1
            ? Number((100 - share * (prev.length - 1)).toFixed(2))
            : share,
      }))
    );
  };

  // CÁLCULO COM DADOS REAIS DO GRUPO NO ASAAS
  const receivedPayments = groupPayments.filter(
    (p) => p.status === "RECEIVED" || p.status === "CONFIRMED"
  );
  const realReceivedGross = Number(
    receivedPayments
      .reduce((acc, p) => acc + Number(p.gross_value || 0), 0)
      .toFixed(2)
  );
  const realAsaasFees = Number(
    receivedPayments
      .reduce(
        (acc, p) =>
          acc + Number(p.asaas_fee || 0) + Number(p.discount_value || 0),
        0
      )
      .toFixed(2)
  );
  const realAsaasNet = Number(
    receivedPayments
      .reduce((acc, p) => acc + Number(p.net_value || 0), 0)
      .toFixed(2)
  );
  const realExtraExpenses = Number(
    groupExpenses
      .reduce((acc, e) => acc + Number(e.amount || 0), 0)
      .toFixed(2)
  );

  const realBaseValue =
    calculationBase === "ASAAS_NET" ? realAsaasNet : realReceivedGross;

  const calculatedDeductions = deductions
    .filter((d) => d.active)
    .map((d) => ({
      ...d,
      amount: Number(
        (d.type === "PERCENTAGE"
          ? (realBaseValue * Number(d.value || 0)) / 100
          : Number(d.value || 0)
        ).toFixed(2)
      ),
    }));

  const totalDeductionsAmount = Number(
    calculatedDeductions.reduce((acc, item) => acc + item.amount, 0).toFixed(2)
  );

  const extraAsaasFeeDeduction =
    calculationBase === "RECEIVED_GROSS" && deductAsaasFees ? realAsaasFees : 0;

  const realDistributableNet = Number(
    Math.max(
      0,
      realBaseValue -
        totalDeductionsAmount -
        extraAsaasFeeDeduction -
        realExtraExpenses
    ).toFixed(2)
  );

  const totalSplitPct = splits.reduce(
    (acc, s) => acc + Number(s.percentage || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      await onSave({
        group: {
          id: initialGroup?.id || `grp-${Date.now()}`,
          display_name: displayName.trim(),
          asaas_group_name: (asaasGroupName || displayName).trim(),
          description: description.trim(),
          calculation_base: calculationBase,
          deduct_asaas_fees: deductAsaasFees,
          active: true,
          created_at: initialGroup?.created_at || new Date().toISOString(),
        },
        deductions,
        splits,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden my-8">
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-sky-400" />
              {initialGroup
                ? `Configurar Regras e Split: ${initialGroup.display_name}`
                : "Novo Grupo Asaas & Regra de Split Individual"}
            </h2>
            <p className="text-xs text-slate-400">
              Monte individualmente os impostos, custos de infraestrutura e a
              divisão do valor líquido entre os parceiros deste grupo.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-white text-sm px-3 py-1 rounded-lg bg-slate-700/50"
          >
            Fechar
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-6 max-h-[82vh] overflow-y-auto"
        >
          {/* Dados básicos do grupo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nome de Exibição do Grupo *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Grupo Horeb"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  if (!asaasGroupName) setAsaasGroupName(e.target.value);
                }}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nome Exato do Grupo no Asaas
              </label>
              <input
                type="text"
                placeholder="Ex: horeb"
                value={asaasGroupName}
                onChange={(e) => setAsaasGroupName(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Base para Cálculo das Alíquotas (%)
              </label>
              <select
                value={calculationBase}
                onChange={(e) =>
                  setCalculationBase(e.target.value as CalculationBase)
                }
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              >
                <option value="ASAAS_NET">
                  Valor Líquido Asaas (Já c/ desconto das taxas do Asaas)
                </option>
                <option value="RECEIVED_GROSS">
                  Valor Bruto Pago pelo Cliente
                </option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Descrição / Observação da Regra de Negócio
              </label>
              <input
                type="text"
                placeholder="Ex: 32% Impostos + 15% Operação/Infra e divisão em 2 partes iguais"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              />
            </div>
            {calculationBase === "RECEIVED_GROSS" && (
              <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950/70 border border-slate-800 p-3 rounded-lg cursor-pointer mt-4 md:mt-5">
                <input
                  type="checkbox"
                  checked={deductAsaasFees}
                  onChange={(e) => setDeductAsaasFees(e.target.checked)}
                  className="rounded border-slate-600 text-sky-500 focus:ring-sky-500"
                />
                <span>
                  Descontar também a taxa de boleto/Pix do Asaas separadamente
                  antes de dividir o líquido
                </span>
              </label>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Coluna Esquerda: Regras de Dedução e Split */}
            <div className="lg:col-span-7 space-y-6">
              {/* 1. Deduções */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Percent className="w-4 h-4 text-amber-400" />
                      1. Impostos & Custos Fixos/Percentuais do Grupo
                    </h3>
                    <p className="text-xs text-slate-400">
                      Ex: 32% Impostos, 15% Custo da Operação / Infraestrutura
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addDeductionRow}
                    className="inline-flex items-center gap-1.5 text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1.5 rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Alíquota
                  </button>
                </div>

                <div className="space-y-2">
                  {deductions.map((ded, index) => (
                    <div
                      key={ded.id}
                      className="grid grid-cols-12 gap-2 items-center bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg"
                    >
                      <div className="col-span-6">
                        <input
                          type="text"
                          value={ded.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDeductions((prev) =>
                              prev.map((item, i) =>
                                i === index ? { ...item, name: val } : item
                              )
                            );
                          }}
                          placeholder="Nome (Ex: Impostos)"
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div className="col-span-3">
                        <select
                          value={ded.type}
                          onChange={(e) => {
                            const val = e.target.value as
                              | "PERCENTAGE"
                              | "FIXED";
                            setDeductions((prev) =>
                              prev.map((item, i) =>
                                i === index ? { ...item, type: val } : item
                              )
                            );
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
                        >
                          <option value="PERCENTAGE">% Percentual</option>
                          <option value="FIXED">R$ Valor Fixo</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          value={ded.value}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setDeductions((prev) =>
                              prev.map((item, i) =>
                                i === index ? { ...item, value: val } : item
                              )
                            );
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white text-right font-mono"
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeDeductionRow(ded.id)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                          title="Remover linha"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Divisão do Valor Líquido (Split) */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-400" />
                      2. Divisão do Valor Líquido (Split Payment entre Parceiros)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Defina quem participa do lucro líquido deste grupo e se
                      pode visualizá-lo no painel.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={distributeEqually}
                      className="inline-flex items-center gap-1 text-xs font-medium bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2.5 py-1.5 rounded-lg"
                      title="Divide 100% em partes iguais entre os participantes abaixo"
                    >
                      <Scale className="w-3.5 h-3.5" />
                      Dividir em Partes Iguais ({splits.length}x)
                    </button>
                    <button
                      type="button"
                      onClick={addSplitRow}
                      className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar Parte
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {splits.map((spl, index) => (
                    <div
                      key={spl.id}
                      className="grid grid-cols-12 gap-2 items-center bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg"
                    >
                      <div className="col-span-4">
                        <select
                          value={spl.partner_id}
                          onChange={(e) => {
                            const pid = e.target.value;
                            const u = allUsers.find((user) => user.id === pid);
                            setSplits((prev) =>
                              prev.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      partner_id: pid,
                                      partner_label: u
                                        ? `Cota ${u.name}`
                                        : item.partner_label,
                                    }
                                  : item
                              )
                            );
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
                        >
                          {allUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} (
                              {u.role === "SUPERADMIN"
                                ? "SuperAdmin"
                                : "Parceiro"}
                              )
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={spl.partner_label}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSplits((prev) =>
                              prev.map((item, i) =>
                                i === index
                                  ? { ...item, partner_label: val }
                                  : item
                              )
                            );
                          }}
                          placeholder="Descrição da Cota"
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div className="col-span-2 relative">
                        <input
                          type="number"
                          step="0.01"
                          value={spl.percentage}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setSplits((prev) =>
                              prev.map((item, i) =>
                                i === index
                                  ? { ...item, percentage: val }
                                  : item
                              )
                            );
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded pl-2 pr-5 py-1.5 text-xs text-emerald-300 text-right font-mono font-semibold"
                        />
                        <span className="absolute right-2 top-1.5 text-xs text-slate-400">
                          %
                        </span>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <input
                          type="checkbox"
                          checked={spl.can_view_group}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSplits((prev) =>
                              prev.map((item, i) =>
                                i === index
                                  ? { ...item, can_view_group: checked }
                                  : item
                              )
                            );
                          }}
                          title="Autorizar este parceiro a ver o grupo no painel"
                          className="rounded border-slate-600 text-sky-500"
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeSplitRow(spl.id)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-slate-400">
                    Soma das participações configuradas:
                  </span>
                  <span
                    className={`font-bold flex items-center gap-1 ${
                      Math.abs(totalSplitPct - 100) < 0.05
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }`}
                  >
                    {Math.abs(totalSplitPct - 100) < 0.05 ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                    {totalSplitPct.toFixed(2)}% de 100%
                  </span>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Apuração em Tempo Real com Dados Reais do Asaas */}
            <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 to-slate-950 border border-sky-500/30 rounded-xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-sky-400">
                      Dados Reais Sincronizados do Asaas
                    </span>
                    <h4 className="text-sm font-bold text-white">
                      Apuração Real ({displayName || "Novo Grupo"})
                    </h4>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-semibold">
                    {receivedPayments.length} vendas pagas
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 px-2.5 rounded bg-slate-900/90 text-slate-300">
                    <span>Valor Bruto Recebido (Asaas)</span>
                    <span className="font-mono">
                      {formatBRL(realReceivedGross)}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 px-2.5 rounded bg-rose-500/5 border border-rose-500/15 text-rose-300">
                    <span>(-) Taxas / Descontos Retidos pelo Asaas</span>
                    <span className="font-mono">
                      - {formatBRL(realAsaasFees)}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 px-2.5 rounded bg-slate-900 border border-slate-700">
                    <span className="text-white font-semibold">
                      (=) Valor Líquido Asaas (Base)
                    </span>
                    <span className="font-mono font-bold text-sky-300">
                      {formatBRL(realBaseValue)}
                    </span>
                  </div>

                  {calculatedDeductions.map((d) => (
                    <div
                      key={d.id}
                      className="flex justify-between py-1.5 px-2.5 rounded bg-amber-500/5 border border-amber-500/15 text-amber-200"
                    >
                      <span>
                        (-) {d.name}{" "}
                        {d.type === "PERCENTAGE" ? `(${d.value}%)` : "(Fixo)"}
                      </span>
                      <span className="font-mono">
                        - {formatBRL(d.amount)}
                      </span>
                    </div>
                  ))}

                  {realExtraExpenses > 0 && (
                    <div className="flex justify-between py-1.5 px-2.5 rounded bg-rose-500/5 border border-rose-500/15 text-rose-200">
                      <span>(-) Outras Despesas Lançadas</span>
                      <span className="font-mono">
                        - {formatBRL(realExtraExpenses)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between py-2 px-3 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-200 font-semibold mt-2">
                    <span>(=) Valor Líquido p/ Divisão</span>
                    <span className="font-mono text-sm text-sky-300">
                      {formatBRL(realDistributableNet)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <div className="text-xs font-semibold text-slate-300">
                    Resultado Real do Split por Parceiro:
                  </div>
                  {splits.map((s) => {
                    const partnerShare =
                      (realDistributableNet * Number(s.percentage || 0)) / 100;
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25"
                      >
                        <div>
                          <div className="text-xs font-semibold text-white">
                            {s.partner_label}
                          </div>
                          <div className="text-[11px] text-emerald-300">
                            Participação: {s.percentage}% do Líquido
                          </div>
                        </div>
                        <div className="text-right font-mono font-bold text-sm text-emerald-300">
                          {formatBRL(partnerShare)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-lg shadow-sky-500/20 disabled:opacity-50"
                >
                  {saving
                    ? "Salvando Regras..."
                    : "Salvar Regra do Grupo & Split"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
