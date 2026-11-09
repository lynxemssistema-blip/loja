import { NextRequest, NextResponse } from "next/server";
import {
  loadStateWithSupabase,
  syncStateToSupabaseIfConfigured,
  writeLocalDb,
} from "@/lib/db";
import { normalizePhoneNumber } from "@/lib/ddd";

/**
 * Termos que acionam descadastramento automático imediato (Opt-out / PARAR)
 */
const OPT_OUT_REGEX = /\b(parar|para|sair|cancelar|stop|descadastrar|bloquear|não quero|nao quero|remover)\b/i;

export async function GET() {
  return NextResponse.json({
    status: "active",
    service: "Lynx Evolution Webhook",
    supported_events: ["messages.upsert", "MESSAGES_UPSERT"],
    description:
      "Webhook para escuta de mensagens do WhatsApp e processamento automático de opt-out (PARAR).",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // Identifica o evento
    const event = (payload?.event || payload?.type || "").toLowerCase();
    const data = payload?.data || payload;

    // Se for mensagem recebida (messages.upsert / MESSAGES_UPSERT)
    // Evolution API envia { event: "messages.upsert", instance: "Vendas Lynx", data: { ... } }
    const key = data?.key || data?.message?.key;
    const isFromMe = Boolean(key?.fromMe);

    // Se a mensagem foi enviada por nós mesmos, ignorar
    if (isFromMe) {
      return NextResponse.json({ received: true, ignored: "message_from_me" });
    }

    // Extrai o identificador do remetente
    const remoteJid = key?.remoteJid || data?.remoteJid || data?.from || "";
    // Ignora mensagens de status do WhatsApp (@broadcast) ou se vazio
    if (!remoteJid || remoteJid.includes("@broadcast")) {
      return NextResponse.json({ received: true, ignored: "broadcast_or_empty" });
    }

    // Extrai o conteúdo do texto da mensagem
    const messageObj = data?.message || data;
    const messageText: string =
      messageObj?.conversation ||
      messageObj?.extendedTextMessage?.text ||
      messageObj?.text ||
      data?.body ||
      "";

    const cleanText = (messageText || "").trim();
    if (!cleanText) {
      return NextResponse.json({ received: true, ignored: "no_text_body" });
    }

    // Verifica se a mensagem contém comando de PARAR (Opt-out)
    if (OPT_OUT_REGEX.test(cleanText)) {
      const rawDigits = remoteJid.replace(/@.*$/, "").replace(/\D/g, "");
      if (!rawDigits) {
        return NextResponse.json({ received: true, ignored: "invalid_sender_number" });
      }

      const { state } = await loadStateWithSupabase();
      state.evolution_contacts = state.evolution_contacts || [];

      // Normaliza o número para localizar o contato
      const normalized = normalizePhoneNumber(rawDigits);
      const targetPhone = normalized.phone;

      // Localiza o contato pelo ID ou telefone
      let matchedContact = state.evolution_contacts.find(
        (c) => c.id === targetPhone || c.phone === targetPhone || c.phone === rawDigits
      );

      const timestampIso = new Date().toISOString();
      const dateFormatted = new Date().toLocaleString("pt-BR");

      if (matchedContact) {
        matchedContact.consent_status = "OPTED_OUT";
        matchedContact.opt_out_reason = `Respondeu "${cleanText}" via WhatsApp em ${dateFormatted}`;
        matchedContact.consent_updated_at = timestampIso;
        matchedContact.updated_at = timestampIso;
      } else {
        // Se o contato ainda não existia na lista, cria registro de bloqueio prévio (Blacklist)
        // para que quando a lista for sincronizada, este número permaneça rigorosamente bloqueado
        matchedContact = {
          id: targetPhone,
          phone: targetPhone,
          formatted_phone: normalized.formatted_phone,
          name: data?.pushName || `Lead ${targetPhone}`,
          push_name: data?.pushName,
          ddd: normalized.ddd,
          state_uf: normalized.state_uf,
          country_code: normalized.country_code,
          country_name: normalized.country_name,
          is_national: normalized.is_national,
          source_type: "DIRECT_CONTACT",
          instances: [payload?.instance || "WhatsApp"],
          instances_count: 1,
          is_repeated: false,
          has_valid_name: Boolean(data?.pushName),
          consent_status: "OPTED_OUT",
          opt_out_reason: `Respondeu "${cleanText}" via WhatsApp em ${dateFormatted}`,
          consent_updated_at: timestampIso,
          created_at: timestampIso,
          updated_at: timestampIso,
        };
        state.evolution_contacts.push(matchedContact);
      }

      writeLocalDb(state);
      await syncStateToSupabaseIfConfigured(state);

      return NextResponse.json({
        received: true,
        opt_out_processed: true,
        phone: targetPhone,
        reason: matchedContact.opt_out_reason,
      });
    }

    return NextResponse.json({ received: true, opt_out_detected: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

