import { ExtractedTransaction } from "./types.ts";

export async function parseWithGemini(
  emailBody: string,
  apiKey?: string
): Promise<ExtractedTransaction | null> {
  if (!apiKey) return null;

  const prompt = `Analiza la siguiente notificación de transacción bancaria en Colombia (Bancolombia, PSE ACH Colombia, RappiCard o ARQ/DolarApp) y extrae los datos en formato JSON estricto.

Texto del correo:
"""
${emailBody}
"""

Reglas de extracción:
1. "amount": número decimal positivo sin signos ni separadores de miles.
2. "date": fecha en formato YYYY-MM-DD.
3. "description": nombre limpio del comercio o tercero.
4. "account_type": "RAPPICARD", "MASTERCARD", "ARQ" o "BANCOLOMBIA".
5. "type": "income" si el texto dice "recibiste una consignacion", "recibiste una transferencia" o "te transfirieron". "expense" si es pago, compra o débito. "transfer" si es movimiento entre cuentas propias.

Responde ÚNICAMENTE con un JSON válido:
{"amount": 412855.88, "date": "2026-10-15", "description": "ADDI", "account_type": "BANCOLOMBIA", "type": "expense"}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });
    if (!res.ok) return null;
    const geminiData = await res.json();
    const rawJson = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    return rawJson ? JSON.parse(rawJson) : null;
  } catch {
    return null;
  }
}
