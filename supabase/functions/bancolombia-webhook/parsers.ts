import { ExtractedTransaction } from "./types.ts";

export function parseAmount(raw: string): number {
  let cleaned = raw;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(".")) {
    cleaned = cleaned.replace(/\./g, "");
  } else if (cleaned.includes(",")) {
    cleaned = cleaned.replace(",", ".");
  }
  return parseFloat(cleaned);
}

export function parseWithRegex(text: string): ExtractedTransaction | null {
  const clean = text.replace(/\r\n/g, "\n");
  const today = new Date().toISOString().split("T")[0];

  // 1. RappiCard (compras en comercio)
  if (/rappicard|rappi/i.test(clean)) {
    const amountMatch = clean.match(/(?:valor de|por)\s*\$?\s*([\d\.,]+)/i);
    const merchantMatch = clean.match(/(?:en|comercio:?)\s+([A-Za-z0-9\s\.\-_]{2,30}?)(?:\s+por|\s+el|\s+con|\n|\.|$)/i);
    const amount = amountMatch ? parseAmount(amountMatch[1]) : NaN;
    if (!isNaN(amount) && amount > 0) {
      return {
        amount,
        description: merchantMatch ? merchantMatch[1].trim().toUpperCase() : "RAPPI",
        date: today,
        account_type: "RAPPICARD",
        type: "expense",
      };
    }
  }

  // 2. PSE ACH Colombia
  if (/pse|ach colombia/i.test(clean)) {
    const amountMatch = clean.match(/(?:valor|pagaste|transacci[oó]n por:?)\s*\$?\s*([\d\.,]+)/i);
    const merchantMatch = clean.match(/(?:empresa|comercio|a:?)\s+([A-Za-z0-9\s\.\-_]{2,30}?)(?:\s+con|\s+el|\n|\.|$)/i);
    const amount = amountMatch ? parseAmount(amountMatch[1]) : NaN;
    if (!isNaN(amount) && amount > 0) {
      return {
        amount,
        description: merchantMatch ? merchantMatch[1].trim().toUpperCase() : "PAGO PSE",
        date: today,
        account_type: "BANCOLOMBIA",
        type: "expense",
      };
    }
  }

  // 3. Bancolombia Alertas y Notificaciones
  if (/bancolombia/i.test(clean)) {
    const amountMatch = clean.match(/(?:por|valor de)\s*\$?\s*([\d\.,]+)/i);
    const amount = amountMatch ? parseAmount(amountMatch[1]) : NaN;
    if (!isNaN(amount) && amount > 0) {
      const isMastercard = /tarjeta de cr[eé]dito|mastercard/i.test(clean);
      const isIncome = /(?:recibiste\s+una\s+consignaci[oó]n|recibiste\s+una\s+transferencia|te\s+han\s+transferido|te\s+transfirieron|abono\s+a\s+tu\s+cuenta)/i.test(clean);

      if (isIncome) {
        const merchantMatch = clean.match(/(?:desde\s+el\s+corresponsal|desde\s+la\s+cuenta|desde|de)\s+([A-Za-z0-9\s\.\-_]{2,40}?)(?:\s+en|\s+el|\s+con|\n|\.|$)/i) ||
                              clean.match(/(?:en|hacia)\s+([A-Za-z0-9\s\.\-_]{2,30}?)(?:\s+el|\s+desde|\s+con|\n|\.|$)/i);
        return {
          amount,
          description: merchantMatch ? merchantMatch[1].trim().toUpperCase() : "CONSIGNACIÓN BANCOLOMBIA",
          date: today,
          account_type: isMastercard ? "MASTERCARD" : "BANCOLOMBIA",
          type: "income",
        };
      }

      const merchantMatch = clean.match(/(?:en|hacia|comercio:?)\s+([A-Za-z0-9\s\.\-_]{2,30}?)(?:\s+el|\s+desde|\s+con|\n|\.|$)/i);
      return {
        amount,
        description: merchantMatch ? merchantMatch[1].trim().toUpperCase() : "BANCOLOMBIA",
        date: today,
        account_type: isMastercard ? "MASTERCARD" : "BANCOLOMBIA",
        type: "expense",
      };
    }
  }

  // 4. ARQ / DolarApp
  if (/arq|dolarapp|arqfinance|usd/i.test(clean)) {
    const esTransferenciaPropia = /has realizado un pago a alexander/i.test(clean) ||
                                 (/debitado/i.test(clean) && /alexander/i.test(clean));
    if (esTransferenciaPropia) {
      const transferMatch = clean.match(/debitado\s*\$?\s*([\d\.,]+)/i) ||
                            clean.match(/\$?\s*([\d\.,]+)\s*de tu saldo/i) ||
                            clean.match(/(?:por|valor de|pago a)\s*\$?\s*([\d\.,]+)/i);
      const amount = transferMatch ? parseAmount(transferMatch[1]) : NaN;
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

    const incomeMatch = clean.match(/recibiste\s+([\d\.,]+)\s*USD(?:\s+de\s+([^\n\r\.\,]+))?/i) ||
                        clean.match(/([\d\.,]+)\s*USD(?:\s+de\s+([^\n\r\.\,]+))?/i);
    if (incomeMatch && /recibiste|de\s+/i.test(clean) && !/alexander/i.test(clean)) {
      const amount = parseFloat(incomeMatch[1].replace(/,/g, ""));
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

    const amountMatch = clean.match(/(?:pagaste|compraste|debitado|por|valor de)\s*\$?\s*([\d\.,]+)/i);
    const merchantMatch = clean.match(/(?:en|comercio:?|a:?)\s+([A-Za-z0-9\s\.\-_]{2,30}?)(?:\s+por|\s+el|\s+con|\n|\.|$)/i);
    const amount = amountMatch ? parseAmount(amountMatch[1]) : NaN;
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

  return null;
}
