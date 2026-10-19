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
  type?: "income" | "expense";
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
    // Caso 1: Ingreso ("Recibiste 1,000 USD de ...")
    const incomeMatch = clean.match(/recibiste\s+([\d\.,]+)\s*USD(?:\s+de\s+([^\n\r\.\,]+))?/i) ||
                        clean.match(/([\d\.,]+)\s*USD(?:\s+de\s+([^\n\r\.\,]+))?/i);

    if (incomeMatch && /recibiste|transferencia|de\s+/i.test(clean)) {
      let rawAmount = incomeMatch[1].replace(/,/g, ""); // "1,000" -> "1000"
      const amount = parseFloat(rawAmount);
      if (!isNaN(amount) && amount > 0) {
        return {
          amount,
          description: incomeMatch[2] ? incomeMatch[2].trim().toUpperCase() : "TRANSFERENCIA ARQ",
          date: today,
          account_type: "ARQ",
          type: "income",
        };
      }
    }

    // Caso 2: Gasto / Compra / Retiro ARQ
    const amountMatch = clean.match(/(?:pagaste|compraste|por|valor de)\s*\$?\s*([\d\.,]+)/i);
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

    // Intentamos extraer datos localmente con Regex
    let parsedData = parseWithRegex(email_body);

    // Si Regex no reconoció el formato del correo, usamos Gemini como respaldo
    if (!parsedData) {    
      const prompt = `
Analiza la siguiente notificación de transacción bancaria en Colombia (Bancolombia, PSE ACH Colombia, RappiCard o ARQ/DolarApp) y extrae los datos en formato JSON estricto.

Texto del correo:
"""
${email_body}
"""

Reglas de extracción:
1. "amount": número decimal positivo sin signos ni separadores de miles (ej: si dice "$ 412.855,88" debe ser 412855.88, si dice "$56.300" debe ser 56300.00).
2. "date": fecha de la transacción en formato YYYY-MM-DD (ej: si dice 15/10/2026 debe ser "2026-10-15").
3. "description": nombre limpio del comercio, empresa o beneficiario (ej: si dice "Empresa: P.A. ADDI" o "Descripción: Pago ADDI", extrae "ADDI"; si dice "RAPPI", extrae "RAPPI").
4. "account_type": 
   - "RAPPICARD": si el texto menciona "RappiCard", "*7493" o viene de Rappi.
   - "MASTERCARD": si menciona "TC*", tarjeta de crédito Bancolombia o terminada en 6295.
   - "ARQ": si menciona "ARQ", "DolarApp" o cuenta en dólares.
   - "BANCOLOMBIA": si es débito, código QR, transferencia o pago aprobado por PSE / ACH Colombia.
5. "type": "income" si es una transferencia entrante o recibida, o "expense" si es una compra o pago.

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta, sin bloques markdown:
{"amount": 412855.88, "date": "2026-10-15", "description": "ADDI", "account_type": "BANCOLOMBIA", "type": "expense"}
`;
      const MODELS = [
        "gemini-3.8-flash"
      ];

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

      if (!geminiData) {
        return new Response(JSON.stringify({ error: "Gemini fallback failed", details: lastError }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      const rawJson = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      parsedData = JSON.parse(rawJson);
    }

    // Descartar correos informativos o sin monto para no romper la base de datos
    if (!parsedData || !parsedData.amount || parsedData.amount <= 0) {
      return new Response(
        JSON.stringify({ message: "Not a financial transaction email, skipped", data: parsedData }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Manejo preventivo de duplicados si viene email_message_id
    if (email_message_id) {
      const { data: existingTx } = await supabase
        .from("transactions")
        .select("id")
        .eq("email_message_id", email_message_id)
        .maybeSingle();

      if (existingTx) {
        return new Response(
          JSON.stringify({ message: "Transaction already processed (duplicate email_message_id)", id: existingTx.id, email_message_id }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Obtener las cuentas del usuario activo dinámicamente
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

    // Emparejar dinámicamente la cuenta destino
    let targetAccountId = requestData.account_id || requestData.accountId || null;

    if (!targetAccountId) {
      const accType = (parsedData.account_type || "").toUpperCase();
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

      // Fallback inteligente si no hubo coincidencia por palabras clave
      if (!matched) {
        if (accType.includes("CARD") || accType.includes("CREDIT")) {
          matched = userAccounts.find((a: any) => a.type === "card" || a.type === "credit") || userAccounts[0];
        } else {
          matched = userAccounts.find((a: any) => a.type !== "card" && a.type !== "credit") || userAccounts[0];
        }
      }

      targetAccountId = matched?.id || userAccounts[0].id;
    }

    // Insertar la transacción con el tipo dinámico (income o expense) y email_message_id
    const { data: txData, error: txError } = await supabase
      .from("transactions")
      .insert({
        id: crypto.randomUUID(),
        amount: parsedData.amount,
        date: parsedData.date,
        description: parsedData.description,
        account_id: targetAccountId,
        user_id: effectiveUserId,
        type: parsedData.type || "expense",
        email_message_id: email_message_id,
      })
      .select()
      .single();

    if (txError) {
      // Manejo de duplicado por índice UNIQUE (código 23505)
      if (txError.code === "23505" || txError.message?.includes("idx_transactions_email_message_id") || txError.message?.includes("duplicate")) {
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