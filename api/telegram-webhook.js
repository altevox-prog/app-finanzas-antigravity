import { createClient } from '@supabase/supabase-js';

// Inicializar cliente administrativo de Supabase con Service Role Key
function getSupabaseClient() {
  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    'https://lhgzfheamjrkvavpdgns.supabase.co'
  ).replace(/[\[\]\(\)"';\s]/g, '').trim();

  const supabaseKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoZ3pmaGVhbWpya3ZhdnBkZ25zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0NDA0OTMsImV4cCI6MjEwNjAxNjQ5M30.BrtrKMQ_mUkKSU1mDj8ZDWGlX_Qp1wLUMxQJuX871h4'
  ).replace(/[\[\]\(\)"';\s]/g, '').trim();

  if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
    throw new Error(`supabaseUrl mal formada: ${supabaseUrl}`);
  }

  console.log('[telegram-webhook] Usando supabaseUrl:', supabaseUrl);

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Función auxiliar para enviar mensajes a Telegram
async function sendTelegramMessage(chatId, text) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn('[telegram-webhook] TELEGRAM_BOT_TOKEN no configurado.');
    return;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown'
      })
    });
    const resData = await res.json().catch(() => null);
    console.log('[DEBUG-6] Respuesta API Telegram status:', res.status, 'body:', JSON.stringify(resData));
    if (!res.ok) {
      console.error('[telegram-webhook] Error de API Telegram:', res.status, JSON.stringify(resData));
    }
  } catch (err) {
    console.error('[telegram-webhook] Fallo al invocar Telegram API:', err);
  }
}

// Mapa de palabras clave para categorización inteligente
const CATEGORY_KEYWORDS = [
  {
    category: 'Alimentación',
    keywords: ['almuerzo', 'desayuno', 'cena', 'comida', 'restaurante', 'mercado', 'supermercado', 'cafe', 'café', 'panaderia', 'panadería', 'hamburguesa', 'pizza', 'domicilio', 'rappi', 'd1', 'exito', 'éxito', 'carulla', 'jumbo', 'snack', 'snacks']
  },
  {
    category: 'Transporte',
    keywords: ['uber', 'didi', 'taxi', 'gasolina', 'combustible', 'peaje', 'pasaje', 'metro', 'bus', 'transmilenio', 'parqueadero', 'estacionamiento', 'taller', 'lavado']
  },
  {
    category: 'Vivienda y Servicios',
    keywords: ['arriendo', 'alquiler', 'luz', 'agua', 'gas', 'internet', 'claro', 'movistar', 'tigo', 'administracion', 'administración', 'energia', 'energía']
  },
  {
    category: 'Salud y Bienestar',
    keywords: ['farmacia', 'drogueria', 'droguería', 'medico', 'médico', 'medicina', 'pastillas', 'cita', 'eps', 'odontologo', 'odontólogo', 'gimnasio', 'gym']
  },
  {
    category: 'Entretenimiento y Ocio',
    keywords: ['cine', 'netflix', 'spotify', 'disney', 'hbo', 'juego', 'videojuego', 'bar', 'cerveza', 'trago', 'fiesta', 'concierto', 'suscripcion', 'suscripción']
  },
  {
    category: 'Educación',
    keywords: ['curso', 'libro', 'universidad', 'colegio', 'matricula', 'matrícula', 'udemy', 'platzi', 'taller']
  },
  {
    category: 'Compras y Ropa',
    keywords: ['ropa', 'zapatos', 'camisa', 'pantalon', 'pantalón', 'tienda', 'amazon', 'mercado libre', 'falabella', 'zara']
  },
  {
    category: 'Salario e Ingresos',
    keywords: ['sueldo', 'nomina', 'nómina', 'salario', 'quincena', 'honorarios', 'freelance', 'pago recibido', 'venta', 'ingreso', 'cobro']
  }
];

// Parser robusto de monto y concepto
function parseAmountAndConcept(rawText) {
  let text = (rawText || '').trim();

  // Detectar montos: $25.000, 25.000, 25000, 25,000, 25k, $25k
  const amountRegex = /(?:\$?\s*)(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?|\d+(?:[.,]\d{1,2})?|\d+\s*[kK])(?!\w)/;
  const match = text.match(amountRegex);

  let amount = 0;
  let matchedRaw = '';

  if (match) {
    matchedRaw = match[0];
    let cleanNum = match[1].toLowerCase().replace(/\s+/g, '');

    if (cleanNum.endsWith('k')) {
      cleanNum = cleanNum.replace('k', '');
      amount = parseFloat(cleanNum.replace(',', '.')) * 1000;
    } else if (cleanNum.includes('.') && cleanNum.includes(',')) {
      cleanNum = cleanNum.replace(/\./g, '').replace(',', '.');
      amount = parseFloat(cleanNum);
    } else if (cleanNum.includes('.')) {
      const parts = cleanNum.split('.');
      if (parts[parts.length - 1].length === 3) {
        cleanNum = cleanNum.replace(/\./g, '');
      }
      amount = parseFloat(cleanNum);
    } else if (cleanNum.includes(',')) {
      const parts = cleanNum.split(',');
      if (parts[parts.length - 1].length === 3) {
        cleanNum = cleanNum.replace(/,/g, '');
      } else {
        cleanNum = cleanNum.replace(',', '.');
      }
      amount = parseFloat(cleanNum);
    } else {
      amount = parseFloat(cleanNum);
    }
  }

  // 1. Quitar el monto del texto
  let concept = text;
  if (matchedRaw) {
    concept = concept.replace(matchedRaw, '');
  }

  // 2. Quitar métodos de pago y preposiciones ("en efectivo", "por nequi", "con tarjeta", "efectivo")
  const paymentWords = [
    'efectivo', 'cash', 'plata',
    'nequi', 'daviplata', 'davi',
    'bancolombia', 'banco',
    'tarjeta', 'debito', 'débito', 'credito', 'crédito'
  ];

  for (const word of paymentWords) {
    const reg = new RegExp(`\\b(?:en|con|por|de|a|del)?\\s*${word}\\b`, 'gi');
    concept = concept.replace(reg, '');
  }

  // 3. Limpiar espacios redundantes
  concept = concept.replace(/\s+/g, ' ').trim();

  if (!concept) {
    concept = 'Gasto general';
  } else {
    concept = concept.charAt(0).toUpperCase() + concept.slice(1);
  }

  return { amount: isNaN(amount) ? 0 : amount, concept, matchedRaw };
}

// Extractor de tipo (income vs expense)
function extractType(text) {
  const lower = text.toLowerCase();
  const incomeKeywords = ['ingreso', 'sueldo', 'nomina', 'nómina', 'pago recibido', 'cobro', 'honorarios', 'salario', 'abono'];
  for (const kw of incomeKeywords) {
    if (lower.includes(kw)) {
      return 'income';
    }
  }
  return 'expense';
}

// Extractor de categoría basado en el texto
function extractCategory(text, type) {
  const lower = text.toLowerCase();
  for (const item of CATEGORY_KEYWORDS) {
    for (const kw of item.keywords) {
      if (lower.includes(kw)) {
        return item.category;
      }
    }
  }
  return type === 'income' ? 'Ingresos' : 'General';
}

// Resolución de cuenta según cuentas activas del usuario
function resolveAccount(text, accounts = []) {
  if (!accounts || accounts.length === 0) {
    return { accountId: null, accountName: 'Efectivo' };
  }

  const lower = text.toLowerCase();

  for (const acc of accounts) {
    const accName = (acc.name || '').trim().toLowerCase();
    if (accName && lower.includes(accName)) {
      return { accountId: acc.id, accountName: acc.name };
    }
  }

  const commonAliases = [
    { alias: 'nequi', match: ['nequi'] },
    { alias: 'daviplata', match: ['daviplata', 'davi'] },
    { alias: 'bancolombia', match: ['bancolombia', 'banco'] },
    { alias: 'efectivo', match: ['efectivo', 'cash', 'plata'] },
    { alias: 'tarjeta', match: ['tarjeta', 'credito', 'debito'] }
  ];

  for (const item of commonAliases) {
    if (item.match.some(m => lower.includes(m))) {
      const found = accounts.find(a => (a.name || '').toLowerCase().includes(item.alias));
      if (found) {
        return { accountId: found.id, accountName: found.name };
      }
    }
  }

  const defaultAcc = accounts[0];
  if (defaultAcc) {
    return { accountId: defaultAcc.id, accountName: defaultAcc.name };
  }

  return { accountId: null, accountName: 'Efectivo' };
}

/**
 * Handler principal para Vercel Serverless
 */
export default async function handler(req, res) {
  // Únicamente aceptar peticiones POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  console.log('[DEBUG-1] Webhook recibido:', JSON.stringify(req.body));

  try {
    const body = req.body || {};
    const message = body.message || body.channel_post || body.edited_message;

    // Si no hay payload de mensaje válido, responder 200 OK para evitar reintentos de Telegram
    if (!message || !message.chat) {
      console.log('[DEBUG-1.1] No hay payload de mensaje válido en el body recibido.');
      return res.status(200).json({ ok: true, reason: 'no_message_payload' });
    }

    const chatId = message.chat.id;
    console.log('[DEBUG-2] ChatId procesado:', chatId);

    const rawText = (message.text || message.caption || '').trim();

    // Filtro de Seguridad: validar ID de Chat autorizado si está configurado
    const allowedChatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
    if (allowedChatId && String(chatId) !== String(allowedChatId).trim()) {
      console.warn(`[telegram-webhook] Chat ID no autorizado: ${chatId}. Se descarta la petición.`);
      return res.status(200).json({ ok: true, reason: 'unauthorized_chat' });
    }

    // Comando /start: Mensaje de bienvenida y formato de uso
    if (rawText === '/start' || rawText === '/help') {
      const welcomeMessage = `👋 ¡Hola! Soy tu asistente de finanzas personales *Monety*.\n\nPuedes registrar tus movimientos enviándome un mensaje rápido, por ejemplo:\n\n• *Almuerzo 25000 Bancolombia*\n• *Ingreso 150000 freelance*\n• *Gasolina 50000 efectivo*\n• *Mercado 120000 Nequi*\n\n¡Envíame un movimiento para comenzar!`;
      await sendTelegramMessage(chatId, welcomeMessage);
      return res.status(200).json({ ok: true, command: 'start_sent' });
    }

    if (!rawText) {
      console.log('[DEBUG-2.1] Mensaje con texto vacío recibido.');
      return res.status(200).json({ ok: true, reason: 'empty_text' });
    }

    // Extraer monto y concepto de forma robusta
    const { amount, concept, matchedRaw } = parseAmountAndConcept(rawText);
    if (!amount || amount <= 0) {
      console.log('[DEBUG-2.2] No se pudo identificar el monto en el texto:', rawText);
      const helpMsg = `⚠️ No pude identificar el monto en tu mensaje: "${rawText}".\n\nPor favor incluye el valor numérico, por ejemplo:\n*Almuerzo 25.000 efectivo* o *Almuerzo 25k*`;
      await sendTelegramMessage(chatId, helpMsg);
      return res.status(200).json({ ok: true, reason: 'amount_not_found' });
    }

    // Inicializar cliente Supabase
    const supabase = getSupabaseClient();

    // Obtener user_id configurado
    const userId = process.env.VITE_USER_ID || process.env.USER_ID;
    if (!userId) {
      console.error('[telegram-webhook] Variable VITE_USER_ID o USER_ID no configurada en las variables de entorno.');
      await sendTelegramMessage(chatId, `❌ Error de configuración en el servidor: no se encontró el ID de usuario asociado.`);
      return res.status(200).json({ ok: true, error: 'missing_user_id' });
    }

    console.log('[DEBUG-3] Intentando consultar Supabase con userId:', userId);

    // Consultar cuentas disponibles del usuario en Supabase
    const { data: accounts, error: accError } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('user_id', userId);

    if (accError) {
      console.error('[telegram-webhook] Error consultando cuentas de usuario:', accError);
    }

    // Determinar cuenta, tipo y categoría
    const { accountId, accountName } = resolveAccount(rawText, accounts || []);
    const movementType = extractType(rawText);
    const category = extractCategory(rawText, movementType);

    // Limpieza determinista sin regex de acentos
    let cleanConcept = (baseText || concept || rawText || '').trim();

    // 1. Quitar el monto numérico si aún aparece
    if (typeof matchedRaw !== 'undefined' && matchedRaw) {
      cleanConcept = cleanConcept.replace(matchedRaw, ' ');
    }

    // 2. Lista de términos exactos a remover (en minúsculas)
    const forbiddenTerms = [
      'efectivo', 'cash', 'plata',
      'nequi', 'daviplata', 'davi',
      'bancolombia', 'banco',
      'tarjeta', 'debito', 'credito',
      'en', 'con', 'por', 'del', 'de'
    ];

    if (accountName && typeof accountName === 'string') {
      const accLower = accountName.toLowerCase().trim();
      if (accLower !== 'sin cuenta asignada') {
        accLower.split(/\s+/).forEach(t => {
          if (t.length > 1) forbiddenTerms.push(t);
        });
      }
    }

    // 3. Tokenizar dividiendo solo por espacios
    const rawWords = cleanConcept.split(/\s+/);
    const preservedWords = [];

    for (const rawWord of rawWords) {
      if (!rawWord) continue;
      // Normalizar quitando signos de puntuación comunes en los bordes
      const normalized = rawWord.toLowerCase().replace(/^[.,;:!?¿¡()]+|[.,;:!?¿¡()]+$/g, '');
      
      // Si la palabra normalizada está en la lista prohibida, la ignoramos
      if (forbiddenTerms.includes(normalized)) {
        continue;
      }
      preservedWords.push(rawWord);
    }

    const finalConcept = preservedWords.join(' ').trim();

    const description = finalConcept.length > 0
      ? finalConcept.charAt(0).toUpperCase() + finalConcept.slice(1)
      : 'Gasto general';

    const nowIso = new Date().toISOString();

    // Generar UUID de la transacción
    const transactionId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'tx-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);

    const transactionPayload = {
      id: transactionId,
      user_id: userId,
      account_id: accountId,
      amount: amount,
      type: movementType,
      category: category,
      description: description,
      notes: rawText,
      is_transfer: false,
      date: nowIso,
      created_at: nowIso,
      updated_at: nowIso
    };

    // Inserción en la tabla transactions
    const { error: insertError } = await supabase
      .from('transactions')
      .insert([transactionPayload]);

    console.log('[DEBUG-4] Resultado insert Supabase. Error:', insertError ? insertError.message : 'Ninguno');

    if (insertError) {
      console.error('[telegram-webhook] Error al insertar en transactions:', insertError);
      await sendTelegramMessage(chatId, `❌ No se pudo guardar la transacción en tu base de datos: ${insertError.message}`);
      return res.status(200).json({ ok: true, error: insertError.message });
    }

    // Notificación de confirmación a Telegram
    const formattedAmount = Number(amount).toLocaleString('es-CO');
    const tipoLabel = movementType === 'income' ? 'Ingreso' : 'Gasto';
    const confirmMessage = `✅ *${tipoLabel} registrado exitosamente*\n\n💰 *Monto:* $${formattedAmount}\n🏷️ *Categoría:* ${category}\n🏦 *Cuenta:* ${accountName}\n📝 *Concepto:* ${description}`;

    console.log('[DEBUG-5] Llamando a sendTelegramMessage con texto:', confirmMessage);

    await sendTelegramMessage(chatId, confirmMessage);

    return res.status(200).json({
      ok: true,
      transaction_id: transactionId,
      amount,
      type: movementType,
      category,
      account: accountName
    });
  } catch (error) {
    console.error('[telegram-webhook] Excepción no controlada:', error);
    return res.status(200).json({ ok: true, error: error.message });
  }
}
