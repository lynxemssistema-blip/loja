import { NextRequest, NextResponse } from "next/server";
import {
  INITIAL_SEED_DATA,
  loadStateWithSupabase,
  readLocalDb,
  syncStateToSupabaseIfConfigured,
  writeLocalDb,
} from "@/lib/db";
import {
  LynxExpense,
  LynxGroup,
  LynxGroupDeduction,
  LynxGroupSplit,
  LynxPayment,
  LynxPayout,
  LynxUser,
} from "@/lib/types";

export async function GET() {
  const { state, supabaseConnected, supabaseMessage } =
    await loadStateWithSupabase();
  return NextResponse.json({
    state,
    supabaseConnected,
    supabaseMessage,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;
    let state = readLocalDb();

    switch (action) {
      case "SAVE_PARTNER": {
        const user = payload as LynxUser;
        const existingIdx = state.users.findIndex((u) => u.id === user.id);
        if (existingIdx >= 0) {
          state.users[existingIdx] = {
            ...state.users[existingIdx],
            ...user,
            // SuperAdmin principal nunca perde permissão de SUPERADMIN
            role:
              user.email.toLowerCase() === "edsonmanoel2012@gmail.com"
                ? "SUPERADMIN"
                : user.role,
          };
        } else {
          state.users.push({
            ...user,
            id: user.id || `usr-${Date.now()}`,
            created_at: new Date().toISOString(),
          });
        }

        // Se vierem grupos autorizados no payload.authorizedGroupIds, garante vínculo visual
        if (Array.isArray( body.authorizedGroupIds )) {
          const authIds: string[] = body.authorizedGroupIds;
          const partnerId =
            existingIdx >= 0
              ? state.users[existingIdx].id
              : state.users[state.users.length - 1].id;
          const partnerName = user.name;

          // Atualiza splits existentes desse parceiro
          state.splits = state.splits.map((s) =>
            s.partner_id === partnerId
              ? { ...s, can_view_group: authIds.includes(s.group_id) }
              : s
          );

          // Para grupos marcados que ainda não possuem split para este parceiro, cria um registro
          for (const gid of authIds) {
            const exists = state.splits.some(
              (s) => s.group_id === gid && s.partner_id === partnerId
            );
            if (!exists) {
              state.splits.push({
                id: `spl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                group_id: gid,
                partner_id: partnerId,
                partner_label: `Cota ${partnerName}`,
                percentage: Number(body.defaultSplitPercentage ?? 50),
                can_view_group: true,
              });
            }
          }
        }
        break;
      }

      case "DELETE_PARTNER": {
        const { userId } = payload;
        const target = state.users.find((u) => u.id === userId);
        if (target?.email.toLowerCase() === "edsonmanoel2012@gmail.com") {
          return NextResponse.json(
            { error: "O SuperAdmin principal não pode ser removido." },
            { status: 400 }
          );
        }
        state.users = state.users.filter((u) => u.id !== userId);
        state.splits = state.splits.filter((s) => s.partner_id !== userId);
        break;
      }

      case "SAVE_GROUP_CONFIG": {
        const {
          group,
          deductions,
          splits,
        }: {
          group: LynxGroup;
          deductions: LynxGroupDeduction[];
          splits: LynxGroupSplit[];
        } = payload;

        const groupId = group.id || `grp-${Date.now()}`;
        const normalizedGroup: LynxGroup = {
          ...group,
          id: groupId,
          created_at: group.created_at || new Date().toISOString(),
        };

        const idx = state.groups.findIndex((g) => g.id === groupId);
        if (idx >= 0) {
          state.groups[idx] = normalizedGroup;
        } else {
          state.groups.push(normalizedGroup);
        }

        // Substitui deduções deste grupo
        state.deductions = [
          ...state.deductions.filter((d) => d.group_id !== groupId),
          ...deductions.map((d, index) => ({
            ...d,
            id: d.id || `ded-${groupId}-${index + 1}-${Date.now()}`,
            group_id: groupId,
            sort_order: index + 1,
            value: Number(d.value || 0),
          })),
        ];

        // Substitui splits deste grupo
        state.splits = [
          ...state.splits.filter((s) => s.group_id !== groupId),
          ...splits.map((s, index) => ({
            ...s,
            id: s.id || `spl-${groupId}-${index + 1}-${Date.now()}`,
            group_id: groupId,
            percentage: Number(s.percentage || 0),
          })),
        ];
        break;
      }

      case "DELETE_GROUP": {
        const { groupId } = payload;
        state.groups = state.groups.filter((g) => g.id !== groupId);
        state.deductions = state.deductions.filter((d) => d.group_id !== groupId);
        state.splits = state.splits.filter((s) => s.group_id !== groupId);
        state.expenses = state.expenses.filter((e) => e.group_id !== groupId);
        state.payments = state.payments.filter((p) => p.group_id !== groupId);
        break;
      }

      case "ADD_EXPENSE": {
        const expense = payload as LynxExpense;
        const newExp: LynxExpense = {
          ...expense,
          id: expense.id || `exp-${Date.now()}`,
          amount: Number(expense.amount || 0),
          reference_month:
            expense.reference_month || expense.expense_date.slice(0, 7),
          created_at: new Date().toISOString(),
        };
        state.expenses = [newExp, ...state.expenses];
        break;
      }

      case "DELETE_EXPENSE": {
        const { expenseId } = payload;
        state.expenses = state.expenses.filter((e) => e.id !== expenseId);
        break;
      }

      case "ADD_MANUAL_PAYMENT": {
        const payment = payload as LynxPayment;
        const newPay: LynxPayment = {
          ...payment,
          id: payment.id || `pay-${Date.now()}`,
          asaas_payment_id:
            payment.asaas_payment_id || `pay_manual_${Date.now()}`,
          gross_value: Number(payment.gross_value || 0),
          discount_value: Number(payment.discount_value || 0),
          asaas_fee: Number(payment.asaas_fee || 0),
          net_value:
            Number(payment.gross_value || 0) - Number(payment.asaas_fee || 0),
          reference_month:
            payment.reference_month ||
            (payment.payment_date || payment.due_date).slice(0, 7),
        };
        state.payments = [newPay, ...state.payments];
        break;
      }

      case "DELETE_PAYMENT": {
        const { paymentId } = payload;
        state.payments = state.payments.filter((p) => p.id !== paymentId);
        break;
      }

      case "TOGGLE_PAYOUT": {
        const {
          groupId,
          partnerId,
          referenceMonth,
          calculatedAmount,
          status,
          receiptNote,
        } = payload as {
          groupId: string;
          partnerId: string;
          referenceMonth: string;
          calculatedAmount: number;
          status: "PENDING" | "PAID";
          receiptNote?: string;
        };

        const existingIdx = state.payouts.findIndex(
          (p) =>
            p.group_id === groupId &&
            p.partner_id === partnerId &&
            p.reference_month === referenceMonth
        );

        const record: LynxPayout = {
          id:
            existingIdx >= 0
              ? state.payouts[existingIdx].id
              : `pout-${Date.now()}`,
          group_id: groupId,
          partner_id: partnerId,
          reference_month: referenceMonth,
          calculated_amount: calculatedAmount,
          paid_amount: status === "PAID" ? calculatedAmount : 0,
          status,
          paid_at: status === "PAID" ? new Date().toISOString() : undefined,
          receipt_note: receiptNote,
        };

        if (existingIdx >= 0) {
          state.payouts[existingIdx] = record;
        } else {
          state.payouts.push(record);
        }
        break;
      }

      case "SAVE_SETTINGS": {
        state.settings = {
          ...state.settings,
          ...payload,
        };
        break;
      }

      case "RESET_DEMO_DATA": {
        state = structuredClone(INITIAL_SEED_DATA);
        break;
      }

      default:
        return NextResponse.json(
          { error: `Ação desconhecida: ${action}` },
          { status: 400 }
        );
    }

    writeLocalDb(state);
    const syncResult = await syncStateToSupabaseIfConfigured(state);

    return NextResponse.json({
      ok: true,
      state,
      supabaseSync: syncResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

