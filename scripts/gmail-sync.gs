/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT: SINCRONIZACIÓN AUTOMÁTICA DE GMAIL A SUPABASE
 * ==============================================================================
 * Este script procesa correos electrónicos de notificaciones bancarias y compras
 * (Bancolombia, EPM, Tiendas D1, etc.) y los registra en la tabla `transactions`
 * de Supabase con deduplicación blindada.
 *
 * CARACTERÍSTICAS:
 * 1. Etiquetado automático con 'Procesado_Finanzas' para omitir correos ya vistos.
 * 2. Deduplicación por `email_message_id` en Supabase (evita duplicados a nivel BD).
 * 3. Encabezado 'Prefer: resolution=ignore-duplicates' en PostgREST de Supabase.
 * 4. Extracción y normalización de montos en pesos colombianos (COP).
 * 5. Clasificación y categorización inteligente automática.
 * ==============================================================================
 */

// ==============================================================================
// 1. CONFIGURACIÓN DEL USUARIO (EDITAR CON TUS DATOS)
// ==============================================================================
var CONFIG = {
  // URL base de tu proyecto en Supabase (ej: https://xyzcompany.supabase.co)
  SUPABASE_URL: "https://TU_PROYECTO.supabase.co",

  // Clave pública/anon de Supabase
  SUPABASE_ANON_KEY: "TU_SUPABASE_ANON_KEY",

  // UUID del usuario propietario en auth.users (el mismo user_id de tus cuentas)
  USER_ID: "TU_USER_UUID",

  // Nombre de la etiqueta en Gmail para marcar correos procesados
  LABEL_NAME: "Procesado_Finanzas",

  // Zona horaria para formatear las fechas de las transacciones
  TIMEZONE: "America/Bogota",

  // Cantidad máxima de hilos a procesar por ejecución
  BATCH_SIZE: 25,

  // Consulta de búsqueda en Gmail
  SEARCH_QUERY: 'from:(notificacionesbancolombia.com OR bancolombia OR epm OR d1 OR koba) -label:Procesado_Finanzas'
};

// ==============================================================================
// 2. FUNCIÓN PRINCIPAL (ENTRY POINT)
// Configura un activador (trigger) por tiempo en Apps Script para correrla cada 15 min.
// ==============================================================================
function syncGmailTransactions() {
  Logger.log("=== INICIANDO SINCRONIZACIÓN GMAIL -> SUPABASE ===");

  if (!CONFIG.SUPABASE_URL || CONFIG.SUPABASE_URL.indexOf("TU_PROYECTO") !== -1) {
    throw new Error("Por favor configura SUPABASE_URL, SUPABASE_ANON_KEY y USER_ID al inicio del script.");
  }

  // 1. Obtener o crear la etiqueta 'Procesado_Finanzas'
  var label = getOrCreateLabel(CONFIG.LABEL_NAME);

  // 2. Buscar hilos no procesados
  var threads = GmailApp.search(CONFIG.SEARCH_QUERY, 0, CONFIG.BATCH_SIZE);
  Logger.log("Hilos encontrados para procesar: " + threads.length);

  var totalProcessed = 0;
  var totalErrors = 0;

  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    var messages = thread.getMessages();

    for (var j = 0; j < messages.length; j++) {
      var msg = messages[j];
      var msgId = msg.getId();

      try {
        var txData = parseTransactionEmail(msg);

        if (txData) {
          // Asignar el ID único del mensaje para deduplicación estricta
          txData.email_message_id = msgId;

          // Enviar transacción a Supabase
          var success = sendTransactionToSupabase(txData);
          if (success) {
            totalProcessed++;
          }
        }
      } catch (err) {
        Logger.log("Error procesando mensaje " + msgId + ": " + err.message);
        totalErrors++;
      }
    }

    // 3. Etiquetar hilo completo como procesado para no volver a leerlo
    thread.addLabel(label);
  }

  Logger.log("=== SINCRONIZACIÓN FINALIZADA ===");
  Logger.log("Transacciones procesadas: " + totalProcessed);
  Logger.log("Errores / Excepciones: " + totalErrors);
}

// ==============================================================================
// 3. PARSERS ESPECÍFICOS POR EMISOR
// ==============================================================================

/**
 * Analiza el correo e identifica si contiene una transacción válida.
 */
function parseTransactionEmail(msg) {
  var from = msg.getFrom().toLowerCase();
  var subject = msg.getSubject();
  var body = msg.getPlainBody();
  var dateObj = msg.getDate();
  var formattedDate = Utilities.formatDate(dateObj, CONFIG.TIMEZONE, "yyyy-MM-dd");

  // 1. BANCOLOMBIA
  if (from.indexOf("bancolombia") !== -1 || subject.toLowerCase().indexOf("bancolombia") !== -1) {
    return parseBancolombia(subject, body, formattedDate, from);
  }

  // 2. TIENDAS D1 / KOBA COLOMBIA
  if (from.indexOf("d1") !== -1 || from.indexOf("koba") !== -1 || subject.toLowerCase().indexOf("d1") !== -1) {
    return parseTiendasD1(subject, body, formattedDate, from);
  }

  // 3. EPM (Empresas Públicas de Medellín)
  if (from.indexOf("epm") !== -1 || subject.toLowerCase().indexOf("epm") !== -1) {
    return parseEPM(subject, body, formattedDate, from);
  }

  // 4. Parser genérico fallback si contiene montos y términos bancarios
  return parseGenericReceipt(subject, body, formattedDate, from);
}

/**
 * Parser para notificaciones de Bancolombia
 */
function parseBancolombia(subject, body, formattedDate, from) {
  var cleanText = body.replace(/\r?\n/g, " ");

  // Patrón 1: Compra con tarjeta / débito
  // Ej: "Bancolombia le informa compra por $45.200,00 en EXITO POBLADO con su t.deb *1234 el 18/10/2026..."
  var compraMatch = cleanText.match(/compra por \$?\s*([0-9.,]+)\s+en\s+([^.]+?)(?:\s+con|\s+el|\.|$)/i);
  if (compraMatch) {
    var amount = cleanAmount(compraMatch[1]);
    var merchant = compraMatch[2].trim();
    return buildTransactionPayload({
      amount: amount,
      type: "expense",
      description: "Compra " + merchant,
      notes: "Bancolombia - " + merchant,
      category: categorizeMerchant(merchant),
      date: formattedDate,
      subject: subject,
      from: from
    });
  }

  // Patrón 2: Transferencia enviada o recibida
  // Ej: "Bancolombia le informa transferencia por $150.000,00 desde su cuenta *5678 a la cuenta..."
  // Ej: "Bancolombia: Le informamos que ha recibido una transferencia por $200.000..."
  var isIncome = /recibido|recepci[oó]n|te transfiri[oó]|abono/i.test(cleanText);
  var transMatch = cleanText.match(/transferencia por \$?\s*([0-9.,]+)(?:\s+desde|\s+a|\s+el|\.|$)/i);
  if (transMatch) {
    var amount = cleanAmount(transMatch[1]);
    return buildTransactionPayload({
      amount: amount,
      type: isIncome ? "income" : "expense",
      description: isIncome ? "Transferencia recibida" : "Transferencia enviada",
      notes: subject,
      category: isIncome ? "Ingresos Varios" : "Transferencias",
      date: formattedDate,
      subject: subject,
      from: from
    });
  }

  // Patrón 3: Pago de facturas o servicios
  // Ej: "Bancolombia le informa pago por $85.000,00 a EPM..."
  var pagoMatch = cleanText.match(/pago por \$?\s*([0-9.,]+)\s+a\s+([^.]+?)(?:\s+desde|\s+el|\.|$)/i);
  if (pagoMatch) {
    var amount = cleanAmount(pagoMatch[1]);
    var recipient = pagoMatch[2].trim();
    return buildTransactionPayload({
      amount: amount,
      type: "expense",
      description: "Pago " + recipient,
      notes: "Pago de servicio / convenio: " + recipient,
      category: categorizeMerchant(recipient),
      date: formattedDate,
      subject: subject,
      from: from
    });
  }

  // Patrón 4: Retiro de dinero
  var retiroMatch = cleanText.match(/retiro por \$?\s*([0-9.,]+)/i);
  if (retiroMatch) {
    var amount = cleanAmount(retiroMatch[1]);
    return buildTransactionPayload({
      amount: amount,
      type: "expense",
      description: "Retiro de efectivo",
      notes: subject,
      category: "Efectivo / Retiros",
      date: formattedDate,
      subject: subject,
      from: from
    });
  }

  return null;
}

/**
 * Parser para Tiendas D1 (Facturación electrónica y notificaciones)
 */
function parseTiendasD1(subject, body, formattedDate, from) {
  var cleanText = body.replace(/\r?\n/g, " ");

  // Buscar el total de la factura
  var totalMatch = cleanText.match(/(?:total|valor total|total a pagar|total pagado)[:\s]*\$?\s*([0-9.,]+)/i);
  if (totalMatch) {
    var amount = cleanAmount(totalMatch[1]);
    if (amount > 0) {
      return buildTransactionPayload({
        amount: amount,
        type: "expense",
        description: "Compra Tiendas D1",
        notes: "Factura electrónica D1 - " + subject,
        category: "Mercado y Supermercado",
        date: formattedDate,
        subject: subject,
        from: from
      });
    }
  }

  return null;
}

/**
 * Parser para EPM (Servicios Públicos)
 */
function parseEPM(subject, body, formattedDate, from) {
  var cleanText = body.replace(/\r?\n/g, " ");

  // Buscar total pagado o a pagar
  var epmMatch = cleanText.match(/(?:total|valor pagado|valor factura|total pagado)[:\s]*\$?\s*([0-9.,]+)/i);
  if (epmMatch) {
    var amount = cleanAmount(epmMatch[1]);
    if (amount > 0) {
      return buildTransactionPayload({
        amount: amount,
        type: "expense",
        description: "Pago EPM - Servicios Públicos",
        notes: "Factura EPM: " + subject,
        category: "Servicios Públicos",
        date: formattedDate,
        subject: subject,
        from: from
      });
    }
  }

  return null;
}

/**
 * Parser de respaldo para otros correos transaccionales con formato estándar
 */
function parseGenericReceipt(subject, body, formattedDate, from) {
  var cleanText = body.replace(/\r?\n/g, " ");

  if (!/(?:compra|pago|factura|recibo|debito|débito)/i.test(subject + " " + cleanText)) {
    return null;
  }

  var amountMatch = cleanText.match(/(?:total|valor|monto|por valor de)[:\s]*\$?\s*([0-9.,]+)/i);
  if (amountMatch) {
    var amount = cleanAmount(amountMatch[1]);
    if (amount && amount > 100) {
      return buildTransactionPayload({
        amount: amount,
        type: "expense",
        description: subject.length > 50 ? subject.substring(0, 50) + "..." : subject,
        notes: "Importado automáticamente desde Gmail",
        category: "General",
        date: formattedDate,
        subject: subject,
        from: from
      });
    }
  }

  return null;
}

// ==============================================================================
// 4. CONSTRUCCIÓN DE PAYLOAD Y ENVÍO A SUPABASE
// ==============================================================================

/**
 * Construye el objeto normalizado para insertar en public.transactions
 */
function buildTransactionPayload(data) {
  return {
    id: Utilities.getUuid(),
    user_id: CONFIG.USER_ID,
    type: data.type || "expense",
    amount: data.amount,
    original_amount: data.amount,
    original_currency: "COP",
    exchange_rate: 1,
    date: data.date,
    description: data.description || "Movimiento",
    notes: data.notes || "",
    category: data.category || "General",
    raw_data: {
      source: "gmail_sync",
      subject: data.subject || "",
      from: data.from || "",
      imported_at: new Date().toISOString()
    }
  };
}

/**
 * Envía la transacción a la API REST de Supabase con resolución de duplicados
 */
function sendTransactionToSupabase(payload) {
  var endpoint = CONFIG.SUPABASE_URL.replace(/\/+$/, "") + "/rest/v1/transactions";

  var options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "apikey": CONFIG.SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + CONFIG.SUPABASE_ANON_KEY,
      // RESOLUCIÓN BLINDADA: Si email_message_id ya existe en Supabase, ignora el insert sin fallar
      "Prefer": "resolution=ignore-duplicates"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(endpoint, options);
  var statusCode = response.getResponseCode();

  if (statusCode >= 200 && statusCode < 300) {
    Logger.log("Transacción guardada exitosamente: " + payload.description + " ($" + payload.amount + ")");
    return true;
  } else {
    Logger.log("Error al enviar a Supabase (" + statusCode + "): " + response.getContentText());
    return false;
  }
}

// ==============================================================================
// 5. UTILIDADES AUXILIARES
// ==============================================================================

/**
 * Obtiene la etiqueta de Gmail o la crea si no existe
 */
function getOrCreateLabel(labelName) {
  var label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    label = GmailApp.createLabel(labelName);
    Logger.log("Etiqueta '" + labelName + "' creada en Gmail.");
  }
  return label;
}

/**
 * Convierte cadenas monetarias colombianas (ej: "$120.500,00" o "45.000") a número float limpio
 */
function cleanAmount(rawStr) {
  if (!rawStr) return 0;
  var str = rawStr.toString().replace(/[$\s]/g, "");

  // Si tiene puntos y comas (ej: 120.500,00)
  if (str.indexOf(".") !== -1 && str.indexOf(",") !== -1) {
    str = str.replace(/\./g, "").replace(",", ".");
  } 
  // Si solo tiene puntos (ej: 120.000)
  else if (str.indexOf(".") !== -1 && str.indexOf(",") === -1) {
    var parts = str.split(".");
    // En Colombia 3 decimales después del punto suele ser miles (ej: 45.000)
    if (parts[parts.length - 1].length === 3) {
      str = str.replace(/\./g, "");
    }
  } 
  // Si solo tiene comas (ej: 120000,00)
  else if (str.indexOf(",") !== -1) {
    str = str.replace(",", ".");
  }

  var num = parseFloat(str);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

/**
 * Categorización inteligente automática basada en comercios frecuentes de Colombia
 */
function categorizeMerchant(merchantName) {
  if (!merchantName) return "General";
  var m = merchantName.toLowerCase();

  // Supermercados y alimentación
  if (/d1|exito|éxito|carulla|jumbo|olimpica|olímpica|ara|euro|makro|mercado/i.test(m)) {
    return "Mercado y Supermercado";
  }

  // Servicios Públicos y Hogar
  if (/epm|enel|afinia|aire|acueducto|gas|claro|tigo|movistar|etb|wom/i.test(m)) {
    return "Servicios Públicos";
  }

  // Restaurantes y domicilios
  if (/rappi|mcdonald|starbucks|crepes|dominos|burger|subway|restaurante|cafeteria|cafe|panaderia/i.test(m)) {
    return "Restaurantes";
  }

  // Transporte y combustible
  if (/uber|didi|cabify|taxi|terpel|primax|texaco|biomax|combustible|peaje/i.test(m)) {
    return "Transporte";
  }

  // Salud y Farmacia
  if (/farmatodo|cruz verde|drogueria|pasteur|salud|medico|odontologia/i.test(m)) {
    return "Salud y Farmacia";
  }

  // Entretenimiento y suscripciones
  if (/netflix|spotify|disney|hbo|prime|apple|google|cine|cinema/i.test(m)) {
    return "Entretenimiento";
  }

  return "Compras";
}

/**
 * Utilidad opcional para configurar un activador automático cada 15 minutos
 * Ejecuta esta función una sola vez desde el editor de Google Apps Script si deseas
 * activar la automatización sin hacerlo manualmente desde la UI.
 */
function setupAutoSyncTrigger() {
  // Eliminar activadores previos de syncGmailTransactions para evitar duplicidad
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "syncGmailTransactions") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Crear activador para correr cada 15 minutos
  ScriptApp.newTrigger("syncGmailTransactions")
    .timeBased()
    .everyMinutes(15)
    .create();

  Logger.log("Activador automático cada 15 minutos instalado con éxito.");
}
