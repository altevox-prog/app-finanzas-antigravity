import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "8970631826:AAFuVVmZgqMoPvCgi76SdnZFIBEAtNrm6yY";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const DEFAULT_USER_ID = "42dbcd8c-7825-4807-b192-40cb641dc425";

async function sendTelegramMessage(chatId: number | string, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" })
    });
  } catch (err) {
    console.error("Error enviando mensaje a Telegram:", err);
  }
}

function parseAmountAndConcept(rawText: string) {
  const text = (rawText || "").trim();
  const amountRegex = /(?:\$?\s*)(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?|\d+(?:[.,]\d{1,2})?|\d+\s*[kK])(?!\w)/;
  const match = text.match(amountRegex);

  let amount = 0;
  let matchedRaw = "";

  if (match) {
    matchedRaw = match[0];
    let cleanNum = match[1].toLowerCase().replace(/\s+/g, "");

    if (cleanNum.endsWith("k")) {
      cleanNum = cleanNum.replace("k", "");
      amount = parseFloat(cleanNum.replace(",", ".")) * 1000;
    } else if (cleanNum.includes(".") && cleanNum.includes(",")) {
      cleanNum = cleanNum.replace(/\./g, "").replace(",", ".");
      amount = parseFloat(cleanNum);
    } else if (cleanNum.includes(".")) {
      const parts = cleanNum.split(".");
      if (parts[parts.length - 1].length === 3) {
        cleanNum = cleanNum.replace(/\./g, "");
      }
      amount = parseFloat(cleanNum);
    } else if (cleanNum.includes(",")) {
      const parts = cleanNum.split(",");
      if (parts[parts.length - 1].length === 3) {
        cleanNum = cleanNum.replace(/,/g, "");
      } else {
        cleanNum = cleanNum.replace(",", ".");
      }
      amount = parseFloat(cleanNum);
    } else {
      amount = parseFloat(cleanNum);
    }
  }

  let concept = text;
  if (matchedRaw) {
    concept = concept.replace(matchedRaw, "");
  }

  const paymentWords = [
    "efectivo", "cash", "plata", "nequi", "daviplata", "davi",
    "bancolombia", "banco", "tarjeta", "debito", "débito", "credito", "crédito"
  ];

  for (const word of paymentWords) {
    const reg = new RegExp(`\\b(?:en|con|por|de|a|del)?\\s*${word}\\b`, "gi");
    concept = concept.replace(reg, "");
  }

  concept = concept.replace(/\s+/g, " ").trim();
  return {
    amount: isNaN(amount) ? 0 : amount,
    concept: concept ? concept.charAt(0).toUpperCase() + concept.slice(1) : "Gasto general"
  };
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const message = body.message || body.channel_post || body.edited_message;

    if (!message || !message.chat) {
      return new Response(JSON.stringify({ ok: true, reason: "no_message_payload" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const chatId = message.chat.id;
    const rawText = (message.text || message.caption || "").trim();

    if (rawText === "/start" || rawText === "/help") {
      const welcomeMessage = `👋 ¡Hola! Soy tu asistente de finanzas personales.\n\nPuedes registrar tus movimientos enviándome un mensaje rápido, por ejemplo:\n\n• *Almuerzo 25000 Bancolombia*\n• *Gasolina 50000 efectivo*\n• *Mercado 120000 Nequi*`;
      await sendTelegramMessage(chatId, welcomeMessage);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const { amount, concept } = parseAmountAndConcept(rawText);
    if (!amount || amount <= 0) {
      await sendTelegramMessage(chatId, `⚠️ No pude identificar el monto en tu mensaje: "${rawText}".\n\nEjemplo: *Almuerzo 25000 efectivo*`);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Obtener user_id
    let userId = DEFAULT_USER_ID;
    const { data: tgUser } = await supabase.from("telegram_users").select("user_id").eq("telegram_chat_id", chatId).maybeSingle();
    if (tgUser?.user_id) {
      userId = tgUser.user_id;
    }

    // Obtener cuentas
    const { data: accounts } = await supabase.from("accounts").select("id, name").eq("user_id", userId);
    let targetAccountId = accounts?.[0]?.id || null;
    let targetAccountName = accounts?.[0]?.name || "Efectivo";

    const lower = rawText.toLowerCase();
    if (accounts) {
      const found = accounts.find((a: any) => lower.includes((a.name || "").toLowerCase()));
      if (found) {
        targetAccountId = found.id;
        targetAccountName = found.name;
      }
    }

    const nowIso = new Date().toISOString();
    const isIncome = /ingreso|sueldo|salario|pago recibido|abono/i.test(lower);

    const { error: insertError } = await supabase.from("transactions").insert({
      id: crypto.randomUUID(),
      user_id: userId,
      account_id: targetAccountId,
      amount: amount,
      type: isIncome ? "income" : "expense",
      category: isIncome ? "Ingresos" : "General",
      description: concept,
      notes: rawText,
      date: nowIso
    });

    if (insertError) {
      await sendTelegramMessage(chatId, `❌ Error al guardar: ${insertError.message}`);
      return new Response(JSON.stringify({ ok: true, error: insertError.message }), { status: 200 });
    }

    const formattedAmount = Number(amount).toLocaleString("es-CO");
    const tipoLabel = isIncome ? "Ingreso" : "Gasto";
    await sendTelegramMessage(chatId, `✅ *${tipoLabel} registrado exitosamente*\n\n💰 *Monto:* $${formattedAmount}\n🏦 *Cuenta:* ${targetAccountName}\n📝 *Concepto:* ${concept}`);

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Error en webhook:", err);
    return new Response(JSON.stringify({ ok: true, error: String(err) }), { status: 200 });
  }
});