import { NextRequest, NextResponse } from "next/server";
import {
  loadStateWithSupabase,
  syncStateToSupabaseIfConfigured,
  writeLocalDb,
} from "../../../../lib/db";
import { BillingType, LynxPayment, PaymentStatus } from "../../../../lib/types";

/**
 * Endpoint de Webhook Oficial do Asaas (/api/asaas/webhook)
 * Recebe eventos PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_UPDATED, PAYMENT_OVERDUE, etc.
 * e atualiza automaticamente o faturamento e split do grupo no Supabase da VPS.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event: string = body.event || "";
    const payment = body.payment;

    if (!payment || !payment.id) {
      return NextResponse.json(
        { received: true, ignored: "Sem objeto payment no payload" },
        { status: 200 }
      );
    }

    const { state } = await loadStateWithSupabase();

    // Se for exclusão de cobrança no Asaas
    if (event === "PAYMENT_DELETED") {
      state.payments = state.payments.filter(
        (p) => p.asaas_payment_id !== payment.id
      );
      writeLocalDb(state);
      await syncStateToSupabaseIfConfigured(state);
      return NextResponse.json({ received: true, deleted: payment.id });
    }

    // Tenta descobrir o cliente e o grupo no Asaas caso tenha chave configurada
    let customerName = payment.customerName || `Cliente ${payment.customer}`;
    let groupName = payment.groupName || "";

    const apiKey =
      state.settings.asaas_api_key || process.env.ASAAS_API_KEY || "";
    const apiUrl = (
      state.settings.asaas_api_url ||
      process.env.ASAAS_API_URL ||
      "https://api.asaas.com/v3"
    ).replace(/\/$/, "");

    if (apiKey && payment.customer && !groupName) {
      try {
        const custRes = await fetch(
          `${apiUrl}/customers/${payment.customer}`,
          {
            headers: { access_token: apiKey },
          }
        );
        if (custRes.ok) {
          const custData = await custRes.json();
          customerName = custData.name || customerName;
          groupName =
            custData.groupName ||
            (Array.isArray(custData.groups) && custData.groups.length > 0
              ? custData.groups[0].name
              : "");
        }
      } catch {
        // Segue com fallback se a consulta extra falhar
      }
    }

    // Procura se já existe cobrança salva para manter o grupo, ou busca pelo nome do grupo
    const existingPayment = state.payments.find(
      (p) => p.asaas_payment_id === payment.id
    );

    let targetGroup = existingPayment
      ? state.groups.find((g) => g.id === existingPayment.group_id)
      : undefined;

    if (!targetGroup && groupName) {
      targetGroup = state.groups.find(
        (g) => g.asaas_group_name.toLowerCase() === groupName.toLowerCase()
      );
    }

    if (!targetGroup) {
      targetGroup = state.groups[0];
    }

    if (!targetGroup) {
      return NextResponse.json({
        received: true,
        warning: "Nenhum grupo cadastrado para vincular a cobrança.",
      });
    }

    const grossVal = Number(payment.value || 0);
    const netVal = Number(payment.netValue ?? payment.value ?? 0);
    const feeVal = Math.max(0, Number((grossVal - netVal).toFixed(2)));
    const discountVal = Number(payment.discount?.value || 0);

    let mappedStatus: PaymentStatus = "PENDING";
    if (
      payment.status === "RECEIVED" ||
      payment.status === "RECEIVED_IN_CASH" ||
      payment.status === "DUNNING_RECEIVED"
    ) {
      mappedStatus = "RECEIVED";
    } else if (payment.status === "CONFIRMED") {
      mappedStatus = "CONFIRMED";
    } else if (payment.status === "OVERDUE") {
      mappedStatus = "OVERDUE";
    }

    let mappedBilling: BillingType = "UNDEFINED";
    if (payment.billingType === "PIX") mappedBilling = "PIX";
    else if (payment.billingType === "BOLETO") mappedBilling = "BOLETO";
    else if (payment.billingType === "CREDIT_CARD")
      mappedBilling = "CREDIT_CARD";

    const effectiveDate =
      payment.paymentDate ||
      payment.clientPaymentDate ||
      payment.confirmedDate ||
      payment.dueDate ||
      new Date().toISOString().slice(0, 10);

    const record: LynxPayment = {
      id: existingPayment?.id || `pay-${payment.id}`,
      asaas_payment_id: payment.id,
      group_id: targetGroup.id,
      customer_id: payment.customer || "cus_webhook",
      customer_name: customerName,
      description: payment.description || "Cobrança via Webhook Asaas",
      billing_type: mappedBilling,
      status: mappedStatus,
      gross_value: grossVal,
      discount_value: discountVal,
      asaas_fee: feeVal,
      net_value: netVal,
      payment_date:
        payment.paymentDate ||
        payment.clientPaymentDate ||
        payment.confirmedDate,
      due_date: payment.dueDate || effectiveDate,
      reference_month: effectiveDate.slice(0, 7),
    };

    const idx = state.payments.findIndex(
      (p) => p.asaas_payment_id === payment.id
    );
    if (idx >= 0) {
      state.payments[idx] = record;
    } else {
      state.payments = [record, ...state.payments];
    }

    writeLocalDb(state);
    await syncStateToSupabaseIfConfigured(state);

    return NextResponse.json({
      received: true,
      event,
      paymentId: record.asaas_payment_id,
      groupId: targetGroup.id,
      status: record.status,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

