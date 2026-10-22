import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface ExtractedTransaction {
  amount: number;
  description: string;
  date: string;
  account_type: string;
  destination_account_type?: string;
  type?: "income" | "expense" | "transfer";
}

function parseWithRegex(text: string): ExtractedTransaction | null {
  const clean = text.replace(/\r\n/g, "\n");
  const today = new Date().toISOString().split("T")[0];

  // 1. RappiCard (compras en comercio)
  if (/rappicard|rappi/i.test(clean)) {
    const amountMatch = clean.match(/(?:valor de|por)\s*\$?\s*([\d\.,]+)/i);
    const merchantMatch = clean.match(/(?:en|comercio:?)\s+([A-Za-z0-9\s\.\-_]{2,30}?)(?:\s+por|\s+el|\s+con|\n|\.|$)/i);
    
    if (amountMatch) {
      const rawAmount = amountMatch[1].replace(/\./g, "").replace(",", ".");
      const amount = parseFloat(rawAmount);
      if (!isNaN(amount) && amount > 0) {
        return {
          amount,
          description: merchantMatch ? merchantMatch[1].trim().toUpperCase() : "RAPPI",
          date: today,
          account_type: "RAPPICARD",
          type: "expense"
        };
      }
    }
  }

  // 2. PSE ACH Colombia
  if (/pse|ach colombia/i.test(clean)) {
    const amountMatch = clean.match(/(?:valor|pagaste|transacci[oó]n por:?)\s*\$?\s*([\d\.,]+)/i);
    const merchantMatch = clean.match(/(?:empresa|comercio|a:?)\s+([A-Za-z0-9\s\.\-_]{2,30}?)(?:\s+con|\s+el|\n|\.|$)/i);

    if (amountMatch) {
      let rawAmount = amountMatch[1];
      if (rawAmount.includes(",") && rawAmount.includes(".")) {
        rawAmount = rawAmount.replace(/\./g, "").replace(",", ".");
      } else if (rawAmount.includes(".")) {
        rawAmount = rawAmount.replace(/\./g, "");
      } else if (rawAmount.includes(",")) {
        rawAmount = rawAmount.replace(",", ".");
      }

      const amount = parseFloat(rawAmount);
      if (!isNaN(amount) && amount > 0) {
        return {
          amount,
          description: merchantMatch ? merchantMatch[1].trim().toUpperCase() : "PAGO PSE",
          date: today,
          account_type: "BANCOLOMBIA",
          type: "expense"
        };
      }
    }
  }

  // 3. Bancolombia Alertas y Notificaciones
  if (/bancolombia/i.test(clean)) {
    const amountMatch = clean.match(/(?:por|valor de)\s*\$?\s*([\d\.,]+)/i);
    const merchantMatch = clean.match(/(?:en|hacia)\s+([A-Za-z0-9\s\.\-_]{2,30}?)(?:\s+el|\s+desde|\s+con|\n|\.|$)/i);

    if (amountMatch) {
      const rawAmount = amountMatch[1].replace(/\./g, "").replace(",", ".");
      const amount = parseFloat(rawAmount);
      if (!isNaN(amount) && amount > 0) {
        const isMastercard = /tarjeta de cr[eé]dito|mastercard/i.test(clean);
        return {
          amount,
          description: merchantMatch ? merchantMatch[1].trim().toUpperCase() : "BANCOLOMBIA",
          date: today,
          account_type: isMastercard ? "MASTERCARD" : "BANCOLOMBIA",
          type: "expense"
        };
      }
    }
  }

  // 4. ARQ / DolarApp
  if (/arq|dolarapp|arqfinance|usd/i.test(clean)) {
    // Caso 1: Retiro propio hacia Bancolombia -> TRANSFERENCIA INTERNA
    const esTransferenciaPropia = /has realizado un pago a alexander/i.test(clean) ||
                                 (/debitado/i.test(clean) && /alexander/i.test(clean));

    if (esTransferenciaPropia) {
      const transferMatch = clean.match(/debitado\s*\$?\s*([\d\.,]+)/i) ||
                            clean.match(/\$?\s*([\d\.,]+)\s*de tu saldo/i) ||
                            clean.match(/(?:por|valor de|pago a)\s*\$?\s*([\d\.,]+)/i);
      if (transferMatch) {
        let rawAmount = transferMatch[1].replace(/,/g, "");
        const amount = parseFloat(rawAmount);
        if (!isNaN(amount) && amount > 0) {
          return {
            amount,
            description: "TRANSFERENCIA ARQ → BANCOLOMBIA",
            date: today,
            account_type: "ARQ",
            destination_account_type: "BANCOLOMBIA",
            type: "transfer",
          };
        }
      }
    }

    // Caso 2: Ingreso real desde terceros (ej: Sensei Empire)
    const incomeMatch = clean.match(/recibiste\s+([\d\.,]+)\s*USD(?:\s+de\s+([^\n\r\.\,]+))?/i) ||
                        clean.match(/([\d\.,]+)\s*USD(?:\s+de\s+([^\n\r\.\,]+))?/i);

    if (incomeMatch && /recibiste|de\s+/i.test(clean) && !/alexander/i.test(clean)) {
      let rawAmount = incomeMatch[1].replace(/,/g, "");
      const amount = parseFloat(rawAmount);
      if (!isNaN(amount) && amount > 0) {
        return {
          amount,
          description: incomeMatch[2] ? incomeMatch[2].trim().toUpperCase() : "INGRESO ARQ",
          date: today,
          account_type: "ARQ",
          type: "income",
        };
      }
    }

    // Caso 3: Gasto / Compra con tarjeta o pago ARQ a terceros
    const amountMatch = clean.match(/(?:pagaste|compraste|debitado|por|valor de)\s*\$?\s*([\d\.,]+)/i);
    const merchantMatch = clean.match(/(?:en|comercio:?|a:?)\s+([A-Za-z0-9\s\.\-_]{2,30}?)(?:\s+por|\s+el|\s+con|\n|\.|$)/i);

    if (amountMatch) {
      let rawAmount = amountMatch[1];
      if (rawAmount.includes(",") && rawAmount.includes(".")) {
        rawAmount = rawAmount.replace(/\./g, "").replace(",", ".");
      } else if (rawAmount.includes(".")) {
        rawAmount = rawAmount.replace(/\./g, "");
      } else if (rawAmount.includes(",")) {
        rawAmount = rawAmount.replace(",", ".");
      }

      const amount = parseFloat(rawAmount);
      if (!isNaN(amount) && amount > 0) {
        return {
          amount,
          description: merchantMatch ? merchantMatch[1].trim().toUpperCase() : "PAGO ARQ",
          date: today,
          account_type: "ARQ",
          type: "expense",
        };
      }
    }
  }

  return null;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const requestData = await req.json();
    const effectiveUserId = requestData.userId || requestData.user_id;
    if (!effectiveUserId) {
      return new Response(JSON.stringify({ error: "Missing userId in request" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const email_body = requestData.email_body || requestData.emailText || requestData.body;
    const email_message_id = requestData.email_message_id || requestData.messageId || null;

    if (!email_body) {
      return new Response(JSON.stringify({ error: "Missing email_body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let parsedData = parseWithRegex(email_body);

    if (!parsedData) {    
      const prompt = `
Analiza la siguiente notificación de transacción bancaria en Colombia (Bancolombia, PSE ACH Colombia, RappiCard o ARQ/DolarApp) y extrae los datos en formato JSON estricto.

Texto del correo:
"""
${email_body}
"""

Reglas de extracción:
1. "amount": número decimal positivo sin signos ni separadores de miles.
2. "date": fecha en formato YYYY-MM-DD.
3. "description": nombre limpio del comercio o tercero.
4. "account_type": "RAPPICARD", "MASTERCARD", "ARQ" o "BANCOLOMBIA".
5. "type": "income" (ingreso recibido), "expense" (pago/compra) o "transfer" (si es transferencia propia entre cuentas).

Responde ÚNICAMENTE con un JSON válido:
{"amount": 412855.88, "date": "2026-10-15", "description": "ADDI", "account_type": "BANCOLOMBIA", "type": "expense"}
`;
      const MODELS = ["gemini-3.8-flash"];
      let geminiData = null;
      let lastError = null;

      for (const model of MODELS) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        });

        if (res.ok) {
          geminiData = await res.json();
          break;
        } else {
          lastError = await res.text();
        }
      }

      if (geminiData) {
        const rawJson = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        parsedData = JSON.parse(rawJson);
      }
    }

    if (!parsedData || !parsedData.amount || parsedData.amount <= 0) {
      return new Response(
        JSON.stringify({ message: "Not a financial transaction email, skipped", data: parsedData }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    if (email_message_id) {
      const { data: existingTx } = await supabase
        .from("transactions")
        .select("id")
        .eq("email_message_id", email_message_id)
        .maybeSingle();

      if (existingTx) {
        return new Response(
          JSON.stringify({ message: "Transaction already processed", id: existingTx.id, email_message_id }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    const { data: userAccounts, error: accountsError } = await supabase
      .from("accounts")
      .select("id, name, type")
      .eq("user_id", effectiveUserId);

    if (accountsError || !userAccounts || userAccounts.length === 0) {
      return new Response(JSON.stringify({ error: "No accounts found for user", details: accountsError }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Identificar cuenta de origen
    let targetAccountId = requestData.account_id || requestData.accountId || null;
    const accType = (parsedData.account_type || "").toUpperCase();

    if (!targetAccountId) {
      let matched = null;
      if (accType === "RAPPICARD") {
        matched = userAccounts.find((a: any) => /rappi/i.test(a.name));
      } else if (accType === "MASTERCARD") {
        matched = userAccounts.find((a: any) => /mastercard|tc\s*bancolombia/i.test(a.name)) ||
                  userAccounts.find((a: any) => a.type === "card" || a.type === "credit");
      } else if (accType === "ARQ") {
        matched = userAccounts.find((a: any) => /arq/i.test(a.name));
      } else if (accType === "BANCOLOMBIA") {
        matched = userAccounts.find((a: any) => /bancolombia/i.test(a.name)) ||
                  userAccounts.find((a: any) => a.type === "savings" || a.type === "bank" || a.type === "checking");
      }

      if (!matched) {
        matched = userAccounts[0];
      }
      targetAccountId = matched.id;
    }

    // Identificar cuenta de destino si es una transferencia interna
    let destinationAccountId = null;
    if (parsedData.type === "transfer") {
      const destType = (parsedData.destination_account_type || "BANCOLOMBIA").toUpperCase();
      let destMatched = null;
      if (destType === "BANCOLOMBIA") {
        destMatched = userAccounts.find((a: any) => /bancolombia/i.test(a.name)) ||
                      userAccounts.find((a: any) => a.type === "savings" || a.type === "bank");
      }
      destinationAccountId = destMatched?.id || null;
    }

    // Insertar la transacción
    const insertPayload: Record<string, any> = {
      id: crypto.randomUUID(),
      amount: parsedData.amount,
      date: parsedData.date,
      description: parsedData.description,
      account_id: targetAccountId,
      user_id: effectiveUserId,
      type: parsedData.type || "expense",
      email_message_id: email_message_id,
    };

    if (destinationAccountId) {
      insertPayload.destination_account_id = destinationAccountId;
    }

    const { data: txData, error: txError } = await supabase
      .from("transactions")
      .insert(insertPayload)
      .select()
      .single();

    if (txError) {
      if (txError.code === "23505" || txError.message?.includes("duplicate")) {
        return new Response(
          JSON.stringify({ message: "Duplicate email_message_id ignored", email_message_id }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ error: "DB Insert error", details: txError }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, transaction: txData }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});