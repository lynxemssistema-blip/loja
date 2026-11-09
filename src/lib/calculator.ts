import {
  CalculatedDeductionItem,
  CalculatedSplitItem,
  GroupFinancialReport,
  LynxCustomer,
  LynxExpense,
  LynxGroup,
  LynxGroupDeduction,
  LynxGroupSplit,
  LynxPayment,
  LynxPayout,
  LynxUser,
} from "./types";

export function calculateGroupFinancialReport(params: {
  group: LynxGroup;
  referenceMonth: string; // "ALL" ou "YYYY-MM"
  allPayments: LynxPayment[];
  allCustomers?: LynxCustomer[];
  allDeductions: LynxGroupDeduction[];
  allSplits: LynxGroupSplit[];
  allExpenses: LynxExpense[];
  allUsers: LynxUser[];
  allPayouts: LynxPayout[];
}): GroupFinancialReport {
  const {
    group,
    referenceMonth,
    allPayments,
    allCustomers = [],
    allDeductions,
    allSplits,
    allExpenses,
    allUsers,
    allPayouts,
  } = params;

  const customers = allCustomers.filter((c) => c.group_id === group.id);

  // 1. Filtra pagamentos do grupo e mês de referência
  const payments = allPayments.filter(
    (p) =>
      p.group_id === group.id &&
      (referenceMonth === "ALL" || p.reference_month === referenceMonth)
  );

  const receivedPayments = payments.filter(
    (p) => p.status === "RECEIVED" || p.status === "CONFIRMED"
  );
  const pendingPayments = payments.filter((p) => p.status === "PENDING");
  const overduePayments = payments.filter((p) => p.status === "OVERDUE");

  const receivedGross = round2(
    receivedPayments.reduce((acc, p) => acc + Number(p.gross_value || 0), 0)
  );
  const totalDiscountsGranted = round2(
    receivedPayments.reduce((acc, p) => acc + Number(p.discount_value || 0), 0)
  );
  const totalOriginalBilled = round2(receivedGross + totalDiscountsGranted);

  const asaasFeesTotal = round2(
    receivedPayments.reduce((acc, p) => acc + Number(p.asaas_fee || 0), 0)
  );
  const asaasNetTotal = round2(
    receivedPayments.reduce((acc, p) => acc + Number(p.net_value || 0), 0)
  );

  const pendingTotal = round2(
    pendingPayments.reduce((acc, p) => acc + Number(p.gross_value || 0), 0)
  );
  const overdueTotal = round2(
    overduePayments.reduce((acc, p) => acc + Number(p.gross_value || 0), 0)
  );

  // 2. Define a base de cálculo das alíquotas do grupo
  const baseUsedForCalculation =
    group.calculation_base === "ASAAS_NET" ? asaasNetTotal : receivedGross;

  // 3. Calcula cada regra de dedução ativa (Ex: 32% Impostos, 15% Custo Operação/Infra)
  const groupDeductions = allDeductions
    .filter((d) => d.group_id === group.id && d.active)
    .sort((a, b) => a.sort_order - b.sort_order);

  const deductionItems: CalculatedDeductionItem[] = groupDeductions.map((d) => {
    const calculatedAmount =
      d.type === "PERCENTAGE"
        ? round2(baseUsedForCalculation * (Number(d.value) / 100))
        : round2(Number(d.value));
    return {
      id: d.id,
      name: d.name,
      type: d.type,
      rateOrFixed: Number(d.value),
      calculatedAmount,
    };
  });

  const totalPercentageRate = round2(
    groupDeductions
      .filter((d) => d.type === "PERCENTAGE")
      .reduce((acc, d) => acc + Number(d.value), 0)
  );

  const totalRuleDeductions = round2(
    deductionItems.reduce((acc, d) => acc + d.calculatedAmount, 0)
  );

  // Se a base é RECEIVED_GROSS e o grupo também marca deduct_asaas_fees = true, desconta a taxa do Asaas separada
  const deductedAsaasFeeInWaterfall =
    group.calculation_base === "RECEIVED_GROSS" && group.deduct_asaas_fees
      ? asaasFeesTotal
      : 0;

  // 4. Despesas extras / custos operacionais lançados manualmente no grupo
  const expenses = allExpenses.filter(
    (e) =>
      e.group_id === group.id &&
      (referenceMonth === "ALL" || e.reference_month === referenceMonth)
  );

  const totalExtraExpenses = round2(
    expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0)
  );

  // 5. Valor Líquido Distribuível (Base do Split)
  const distributableNet = round2(
    baseUsedForCalculation -
      totalRuleDeductions -
      deductedAsaasFeeInWaterfall -
      totalExtraExpenses
  );

  // 6. Divisão entre Parceiros (Split Payment / Rateio)
  const groupSplits = allSplits.filter((s) => s.group_id === group.id);
  const totalSplitPercentage = round2(
    groupSplits.reduce((acc, s) => acc + Number(s.percentage || 0), 0)
  );

  const splits: CalculatedSplitItem[] = groupSplits.map((s) => {
    const partner = allUsers.find((u) => u.id === s.partner_id);
    const amountToReceive = round2(
      Math.max(0, distributableNet) * (Number(s.percentage) / 100)
    );

    const payout = allPayouts.find(
      (p) =>
        p.group_id === group.id &&
        p.partner_id === s.partner_id &&
        p.reference_month === referenceMonth
    );

    return {
      splitId: s.id,
      partnerId: s.partner_id,
      partnerName: partner?.name || s.partner_label,
      partnerEmail: partner?.email || "",
      partnerPixKey: partner?.pix_key || "",
      partnerLabel: s.partner_label,
      percentage: Number(s.percentage),
      amountToReceive,
      payoutStatus: payout?.status || "PENDING",
      paidAt: payout?.paid_at,
      receiptNote: payout?.receipt_note,
    };
  });

  return {
    group,
    referenceMonth,
    totalOriginalBilled,
    totalDiscountsGranted,
    receivedGross,
    asaasFeesTotal,
    asaasNetTotal,
    pendingTotal,
    overdueTotal,
    receivedCount: receivedPayments.length,
    pendingCount: pendingPayments.length,
    overdueCount: overduePayments.length,
    baseUsedForCalculation,
    deductionItems,
    totalPercentageRate,
    totalRuleDeductions,
    deductedAsaasFeeInWaterfall,
    expenses,
    totalExtraExpenses,
    distributableNet,
    splits,
    totalSplitPercentage,
    payments,
    customers,
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

