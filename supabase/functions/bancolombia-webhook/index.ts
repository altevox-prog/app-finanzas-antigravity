import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { AccountRecord, ExtractedTransaction, WebhookRequest } from "./types.ts";
import { parseWithRegex } from "./parsers.ts";
import { parseWithGemini } from "./gemini.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function resolveTargetAccount(
  parsed: ExtractedTransaction,
  accounts: AccountRecord[],
  preferredId?: string
): string {
  if (preferredId) return preferredId;
  const accType = (parsed.account_type || "").toUpperCase();
  let matched: AccountRecord | undefined;
  if (accType === "RAPPICARD") {
    matched = accounts.find((a) => /rappi/i.test(a.name));
  } else if (accType === "MASTERCARD") {
    matched = accounts.find((a) => /mastercard|tc\s*bancolombia/i.test(a.name)) ||
              accounts.find((a) => a.type === "card" || a.type === "credit");
  } else if (accType === "ARQ") {
    matched = accounts.find((a) => /arq/i.test(a.name));
  } else if (accType === "BANCOLOMBIA") {
    matched = accounts.find((a) => /bancolombia/i.test(a.name)) ||
              accounts.find((a) => a.type === "savings" || a.type === "bank" || a.type === "checking");
  }
  return (matched || accounts[0])?.id;
}

serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const data: WebhookRequest = await req.json();
    const userId = data.userId || data.user_id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId in request" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const emailBody = data.email_body || data.emailText || data.body;
    const emailMessageId = data.email_message_id || data.messageId || null;
    if (!emailBody) {
      return new Response(JSON.stringify({ error: "Missing email_body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parsed = parseWithRegex(emailBody) || (await parseWithGemini(emailBody, GEMINI_API_KEY));
    if (!parsed || !parsed.amount || parsed.amount <= 0) {
      return new Response(
        JSON.stringify({ message: "Not a financial transaction email, skipped", data: parsed }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    if (emailMessageId) {
      const { data: existingTx } = await supabase
        .from("transactions")
        .select("id")
        .eq("email_message_id", emailMessageId)
        .maybeSingle();

      if (existingTx) {
        return new Response(
          JSON.stringify({ message: "Transaction already processed", id: existingTx.id, email_message_id: emailMessageId }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    const { data: accounts, error: accError } = await supabase
      .from("accounts")
      .select("id, name, type")
      .eq("user_id", userId);

    if (accError || !accounts || accounts.length === 0) {
      return new Response(JSON.stringify({ error: "No accounts found for user", details: accError }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const targetAccountId = resolveTargetAccount(parsed, accounts as AccountRecord[], data.account_id || data.accountId);
    let destinationAccountId: string | null = null;
    if (parsed.type === "transfer") {
      const destType = (parsed.destination_account_type || "BANCOLOMBIA").toUpperCase();
      if (destType === "BANCOLOMBIA") {
        const destMatched = (accounts as AccountRecord[]).find((a) => /bancolombia/i.test(a.name)) ||
                            (accounts as AccountRecord[]).find((a) => a.type === "savings" || a.type === "bank");
        destinationAccountId = destMatched?.id || null;
      }
    }

    const payload: Record<string, unknown> = {
      id: crypto.randomUUID(),
      amount: parsed.amount,
      date: parsed.date,
      description: parsed.description,
      account_id: targetAccountId,
      user_id: userId,
      type: parsed.type || "expense",
      email_message_id: emailMessageId,
    };
    if (destinationAccountId) payload.destination_account_id = destinationAccountId;

    const { data: txData, error: txError } = await supabase
      .from("transactions")
      .insert(payload)
      .select()
      .single();

    if (txError) {
      if (txError.code === "23505" || txError.message?.includes("duplicate")) {
        return new Response(
          JSON.stringify({ message: "Duplicate email_message_id ignored", email_message_id: emailMessageId }),
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
