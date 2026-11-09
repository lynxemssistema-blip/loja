import { NextRequest, NextResponse } from "next/server";
import { readLocalDb, writeLocalDb, syncStateToSupabaseIfConfigured } from "../../../../lib/db";
import {
  createSessionToken,
  hashPassword,
  sanitizeUser,
  verifyPassword,
} from "../../../../lib/auth";
import { LynxUser } from "../../../../lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { ok: false, error: "E-mail e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const state = readLocalDb();
    const normalizedEmail = email.trim().toLowerCase();

    const userIndex = (state.users || []).findIndex(
      (u: LynxUser) => u.email.trim().toLowerCase() === normalizedEmail
    );

    if (userIndex === -1) {
      return NextResponse.json(
        { ok: false, error: "Credenciais inválidas. Verifique seu e-mail e senha." },
        { status: 401 }
      );
    }

    const user = state.users[userIndex];

    if (!user.active) {
      return NextResponse.json(
        { ok: false, error: "Este usuário foi desativado pelo administrador." },
        { status: 403 }
      );
    }

    const isValid = verifyPassword(password, user.password || "");
    if (!isValid) {
      return NextResponse.json(
        { ok: false, error: "Credenciais inválidas. Verifique seu e-mail e senha." },
        { status: 401 }
      );
    }

    // Auto-migração: se a senha ainda estava em texto puro legado, criptografa com scrypt
    if (!user.password?.startsWith("scrypt$")) {
      user.password = hashPassword(password);
      state.users[userIndex] = user;
      try {
        writeLocalDb(state);
        syncStateToSupabaseIfConfigured(state).catch(() => {});
      } catch (err) {
        console.warn("Aviso ao persistir hash da senha:", err);
      }
    }

    const token = createSessionToken(user);
    const safeUser = sanitizeUser(user);

    return NextResponse.json({
      ok: true,
      token,
      user: safeUser,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

