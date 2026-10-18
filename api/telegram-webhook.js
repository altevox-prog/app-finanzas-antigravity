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
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('[telegram-webhook] Error de API Telegram:', res.status, errText);
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

// Extractor de monto numérico
function extractAmount(text) {
  // Coincide con números con posibles puntos/comas de miles o decimales precedidos o no por $
  // Ejemplos: $25.000, 25000, 150,000, 50.50, $150000
  const matches = text.match(/(?:\$\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+)/g);
  if (!matches) return { amount: 0, matchedStr: '' };

  for (const match of matches) {
    const rawNum = match.replace(/[^\d.,]/g, '');
    if (!rawNum) continue;

    let cleanNum = 0;
    // Si tiene comas y puntos (ej. 1.250,50 o 1,250.50)
    if (rawNum.includes('.') && rawNum.includes(',')) {
      if (rawNum.lastIndexOf(',') > rawNum.lastIndexOf('.')) {
        // Formato europeo/latino: 1.250,50
        cleanNum = parseFloat(rawNum.replace(/\./g, '').replace(',', '.'));
      } else {
        // Formato estándar: 1,250.50
        cleanNum = parseFloat(rawNum.replace(/,/g, ''));
      }
    } else if (rawNum.includes('.')) {
      // Si tiene solo puntos: puede ser 25.000 (miles) o 25.50 (decimales)
      const parts = rawNum.split('.');
      if (parts[parts.length - 1].length === 3) {
        cleanNum = parseFloat(rawNum.replace(/\./g, ''));
      } else {
        cleanNum = parseFloat(rawNum);
      }
    } else if (rawNum.includes(',')) {
      // Si tiene solo comas: puede ser 25,000 (miles) o 25,50 (decimales)
      const parts = rawNum.split(',');
      if (parts[parts.length - 1].length === 3) {
        cleanNum = parseFloat(rawNum.replace(/,/g, ''));
      } else {
        cleanNum = parseFloat(rawNum.replace(',', '.'));
      }
    } else {
      cleanNum = parseFloat(rawNum);
    }

    if (!isNaN(cleanNum) && cleanNum > 0) {
      return { amount: cleanNum, matchedStr: match };
    }
  }

  return { amount: 0, matchedStr: '' };
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

// Limpiador para generar un concepto/descripción limpio
function cleanDescription(text, matchedAmountStr) {
  let cleaned = text;
  if (matchedAmountStr) {
    cleaned = cleaned.replace(matchedAmountStr, '');
  }
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned || 'Movimiento vía Telegram';
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

  try {
    const body = req.body || {};
    const message = body.message || body.channel_post || body.edited_message;

    // Si no hay payload de mensaje válido, responder 200 OK para evitar reintentos de Telegram
    if (!message || !message.chat) {
      return res.status(200).json({ ok: true, reason: 'no_message_payload' });
    }

    const chatId = message.chat.id;
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
      return res.status(200).json({ ok: true, reason: 'empty_text' });
    }

    // Extraer monto
    const { amount, matchedStr } = extractAmount(rawText);
    if (!amount || amount <= 0) {
      const helpMsg = `⚠️ No pude identificar el monto en tu mensaje: "${rawText}".\n\nPor favor incluye el valor numérico, por ejemplo:\n*Almuerzo 25000 efectivo*`;
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
    const description = cleanDescription(rawText, matchedStr);
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

    if (insertError) {
      console.error('[telegram-webhook] Error al insertar en transactions:', insertError);
      await sendTelegramMessage(chatId, `❌ No se pudo guardar la transacción en tu base de datos: ${insertError.message}`);
      return res.status(200).json({ ok: true, error: insertError.message });
    }

    // Notificación de confirmación a Telegram
    const formattedAmount = Number(amount).toLocaleString('es-CO');
    const tipoLabel = movementType === 'income' ? 'Ingreso' : 'Gasto';
    const confirmMessage = `✅ *${tipoLabel} registrado exitosamente*\n\n💰 *Monto:* $${formattedAmount}\n🏷️ *Categoría:* ${category}\n🏦 *Cuenta:* ${accountName}\n📝 *Concepto:* ${description}`;

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
