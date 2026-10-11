import React, { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { useBackHandler } from '../hooks/useBackHandler';

export const EMOJI_CATEGORIES = [
  {
    id: 'food',
    name: 'Comida & Bebida',
    icon: '🍔',
    emojis: [
      { emoji: '🍔', keywords: ['hamburguesa', 'comida', 'burger', 'restaurante', 'chatarra', 'cena', 'almuerzo'] },
      { emoji: '🍕', keywords: ['pizza', 'comida', 'domicilio', 'cena', 'restaurante'] },
      { emoji: '🍟', keywords: ['papas', 'fritas', 'snack', 'comida', 'rapida'] },
      { emoji: '🌭', keywords: ['perro', 'caliente', 'hotdog', 'comida'] },
      { emoji: '🥪', keywords: ['sandwich', 'emparedado', 'comida', 'desayuno'] },
      { emoji: '🌮', keywords: ['taco', 'mexicana', 'comida'] },
      { emoji: '🌯', keywords: ['burrito', 'comida', 'mexicana'] },
      { emoji: '🥙', keywords: ['kebab', 'pita', 'comida'] },
      { emoji: '🥗', keywords: ['ensalada', 'saludable', 'dieta', 'vegetariano', 'comida'] },
      { emoji: '🍝', keywords: ['pasta', 'espagueti', 'italiana', 'cena', 'almuerzo'] },
      { emoji: '🍜', keywords: ['ramen', 'sopa', 'fideos', 'asiatica', 'chinos'] },
      { emoji: '🍣', keywords: ['sushi', 'japonesa', 'pescado', 'cena', 'restaurante'] },
      { emoji: '🍱', keywords: ['bento', 'japonesa', 'comida'] },
      { emoji: '🥩', keywords: ['carne', 'asado', 'bistec', 'parrillada'] },
      { emoji: '🍗', keywords: ['pollo', 'asado', 'alitas', 'comida'] },
      { emoji: '🍖', keywords: ['carne', 'costilla', 'asado'] },
      { emoji: '🍞', keywords: ['pan', 'panaderia', 'desayuno'] },
      { emoji: '🥐', keywords: ['croissant', 'panaderia', 'desayuno'] },
      { emoji: '🥖', keywords: ['baguette', 'pan', 'panaderia'] },
      { emoji: '🥯', keywords: ['bagel', 'desayuno'] },
      { emoji: '🥞', keywords: ['pancakes', 'tortitas', 'desayuno', 'dulce'] },
      { emoji: '🧇', keywords: ['waffle', 'gofre', 'dulce', 'desayuno'] },
      { emoji: '🧀', keywords: ['queso', 'lacteos', 'mercado'] },
      { emoji: '🍳', keywords: ['huevo', 'desayuno', 'comida', 'cocinar'] },
      { emoji: '🥓', keywords: ['tocino', 'bacon', 'desayuno'] },
      { emoji: '☕', keywords: ['cafe', 'cafeteria', 'coffee', 'desayuno', 'starbucks'] },
      { emoji: '🍵', keywords: ['te', 'infusion', 'bebida', 'matcha'] },
      { emoji: '🧋', keywords: ['boba', 'bubble tea', 'te de burbujas', 'bebida'] },
      { emoji: '🥤', keywords: ['gaseosa', 'refresco', 'soda', 'bebida'] },
      { emoji: '🧃', keywords: ['jugo', 'cajita', 'bebida', 'zumo'] },
      { emoji: '🍺', keywords: ['cerveza', 'bar', 'alcohol', 'fiesta', 'salida'] },
      { emoji: '🍻', keywords: ['cervezas', 'brindis', 'bar', 'salidas', 'amigos'] },
      { emoji: '🍷', keywords: ['vino', 'copa', 'bar', 'cena', 'licor'] },
      { emoji: '🍸', keywords: ['coctel', 'trago', 'fiesta', 'bar'] },
      { emoji: '🍹', keywords: ['coctel tropical', 'bebida', 'playa'] },
      { emoji: '🍾', keywords: ['champagne', 'celebracion', 'licor', 'fiesta'] },
      { emoji: '🍦', keywords: ['helado', 'cono', 'postre', 'dulce'] },
      { emoji: '🍨', keywords: ['helado', 'copa', 'postre'] },
      { emoji: '🍩', keywords: ['dona', 'donut', 'postre', 'panaderia'] },
      { emoji: '🍪', keywords: ['galleta', 'cookie', 'dulce', 'snack'] },
      { emoji: '🎂', keywords: ['pastel', 'torta', 'cumpleanos', 'fiesta'] },
      { emoji: '🍰', keywords: ['tarta', 'pastel', 'postre'] },
      { emoji: '🍫', keywords: ['chocolate', 'dulce', 'golosina'] },
      { emoji: '🍬', keywords: ['dulce', 'caramelo', 'golosinas'] },
      { emoji: '🍭', keywords: ['paleta', 'dulce'] },
      { emoji: '🍎', keywords: ['manzana', 'fruta', 'mercado', 'saludable'] },
      { emoji: '🍓', keywords: ['fresa', 'fruta', 'mercado'] },
      { emoji: '🍌', keywords: ['platano', 'banana', 'fruta'] },
      { emoji: '🥑', keywords: ['aguacate', 'palta', 'mercado'] },
      { emoji: '🥦', keywords: ['brocoli', 'verduras', 'mercado', 'saludable'] },
      { emoji: '🥕', keywords: ['zanahoria', 'verduras', 'mercado'] },
      { emoji: '🛒', keywords: ['mercado', 'supermercado', 'compras', 'viveres'] }
    ]
  },
  {
    id: 'transport',
    name: 'Transporte & Viajes',
    icon: '🚗',
    emojis: [
      { emoji: '🚗', keywords: ['carro', 'auto', 'coche', 'transporte', 'vehiculo'] },
      { emoji: '🚕', keywords: ['taxi', 'uber', 'didi', 'cabify', 'transporte'] },
      { emoji: '🚙', keywords: ['camioneta', 'suv', 'carro', 'viaje'] },
      { emoji: '🚌', keywords: ['bus', 'autobus', 'pasajes', 'transporte', 'transmilenio', 'metrobus'] },
      { emoji: '🚎', keywords: ['trolebus', 'transporte', 'bus'] },
      { emoji: '🏎️', keywords: ['carreras', 'deportivo', 'carro'] },
      { emoji: '🚓', keywords: ['policia', 'multa', 'comparendo'] },
      { emoji: '🚑', keywords: ['ambulancia', 'emergencia'] },
      { emoji: '🚒', keywords: ['bomberos', 'emergencia'] },
      { emoji: '🚐', keywords: ['furgoneta', 'van', 'transporte'] },
      { emoji: '🛻', keywords: ['camioneta', 'pickup', 'carga'] },
      { emoji: '🚚', keywords: ['camion', 'envios', 'flete', 'mudanza'] },
      { emoji: '🛵', keywords: ['scooter', 'moto', 'motocicleta', 'reparto'] },
      { emoji: '🏍️', keywords: ['moto', 'motocicleta', 'transporte'] },
      { emoji: '🚲', keywords: ['bicicleta', 'bici', 'cicla', 'transporte'] },
      { emoji: '🛴', keywords: ['patineta', 'scooter electrico'] },
      { emoji: '⛽', keywords: ['gasolina', 'combustible', 'tanqueada', 'gasolinera', 'estacion'] },
      { emoji: '🚆', keywords: ['tren', 'ferrocarril', 'viaje'] },
      { emoji: '🚇', keywords: ['metro', 'subway', 'tren subterraneo'] },
      { emoji: '✈️', keywords: ['avion', 'vuelo', 'viaje', 'tiquetes', 'aeropuerto'] },
      { emoji: '🛫', keywords: ['despegue', 'vuelo', 'viaje'] },
      { emoji: '🛬', keywords: ['aterrizaje', 'llegada', 'viaje'] },
      { emoji: '🚁', keywords: ['helicoptero', 'vuelo'] },
      { emoji: '🚀', keywords: ['cohete', 'espacio', 'futuro'] },
      { emoji: '🚢', keywords: ['barco', 'crucero', 'viaje', 'mar'] },
      { emoji: '🛳️', keywords: ['crucero', 'barco', 'vacaciones'] },
      { emoji: '⛵', keywords: ['velero', 'bote'] },
      { emoji: '🧳', keywords: ['maleta', 'equipaje', 'viaje', 'vacaciones'] },
      { emoji: '🗺️', keywords: ['mapa', 'guia', 'turismo', 'viaje'] },
      { emoji: '🚦', keywords: ['semaforo', 'transito', 'vial'] },
      { emoji: '🛑', keywords: ['pare', 'stop', 'transito'] },
      { emoji: '🅿️', keywords: ['parqueadero', 'estacionamiento', 'parqueo'] },
      { emoji: '🎫', keywords: ['boleto', 'tiquete', 'pasaje', 'entrada'] },
      { emoji: '🔧', keywords: ['mantenimiento', 'mecanico', 'taller', 'repuestos', 'reparacion'] },
      { emoji: '🔩', keywords: ['tuerca', 'tornillo', 'taller'] },
      { emoji: '🏝️', keywords: ['isla', 'playa', 'vacaciones', 'viaje'] }
    ]
  },
  {
    id: 'home',
    name: 'Hogar & Servicios',
    icon: '🏠',
    emojis: [
      { emoji: '🏠', keywords: ['casa', 'hogar', 'vivienda', 'arriendo'] },
      { emoji: '🏡', keywords: ['casa con jardin', 'hogar', 'finca'] },
      { emoji: '🏢', keywords: ['edificio', 'oficina', 'departamento', 'apartamento'] },
      { emoji: '🏣', keywords: ['edificio', 'postal', 'oficina'] },
      { emoji: '💡', keywords: ['luz', 'energia', 'electricidad', 'bombillo', 'servicio'] },
      { emoji: '💧', keywords: ['agua', 'acueducto', 'factura', 'servicio'] },
      { emoji: '🚿', keywords: ['ducha', 'bano', 'agua'] },
      { emoji: '🛁', keywords: ['tina', 'banera', 'bano'] },
      { emoji: '🔌', keywords: ['electricidad', 'enchufe', 'cable'] },
      { emoji: '🔋', keywords: ['bateria', 'pila', 'energia'] },
      { emoji: '📶', keywords: ['senal', 'wifi', 'internet', 'datos'] },
      { emoji: '🌐', keywords: ['internet', 'red', 'web', 'servicio'] },
      { emoji: '🔑', keywords: ['llave', 'arriendo', 'alquiler', 'casa', 'cerradura'] },
      { emoji: '🗝️', keywords: ['llave antigua', 'seguridad'] },
      { emoji: '🚪', keywords: ['puerta', 'entrada', 'casa'] },
      { emoji: '🛏️', keywords: ['cama', 'dormitorio', 'muebles'] },
      { emoji: '🛋️', keywords: ['sofa', 'sala', 'muebles'] },
      { emoji: '🪑', keywords: ['silla', 'comedor', 'muebles'] },
      { emoji: '🧹', keywords: ['escoba', 'aseo', 'limpieza', 'hogar'] },
      { emoji: '🧺', keywords: ['canasta', 'lavanderia', 'ropa'] },
      { emoji: '🧼', keywords: ['jabon', 'limpieza', 'bano'] },
      { emoji: '🧽', keywords: ['esponja', 'lavar', 'limpieza'] },
      { emoji: '📦', keywords: ['paquete', 'caja', 'mudanza', 'envio'] },
      { emoji: '🪴', keywords: ['planta', 'jardin', 'decoracion', 'maceta'] },
      { emoji: '🌱', keywords: ['brote', 'plantas', 'jardineria'] },
      { emoji: '🛠️', keywords: ['herramientas', 'reparaciones', 'bricolaje'] },
      { emoji: '🔨', keywords: ['martillo', 'construccion', 'arreglos'] },
      { emoji: '🪛', keywords: ['destornillador', 'herramienta'] },
      { emoji: '🧯', keywords: ['extintor', 'seguridad', 'hogar'] },
      { emoji: '📡', keywords: ['antena', 'television', 'cable', 'satelital'] },
      { emoji: '📺', keywords: ['television', 'pantalla', 'electrodomestico'] },
      { emoji: '❄️', keywords: ['aire acondicionado', 'frio', 'clima'] },
      { emoji: '🔥', keywords: ['gas', 'calefaccion', 'fuego', 'servicio'] }
    ]
  },
  {
    id: 'shopping',
    name: 'Compras & Ropa',
    icon: '🛍️',
    emojis: [
      { emoji: '🛍️', keywords: ['bolsas', 'compras', 'shopping', 'tienda', 'mall'] },
      { emoji: '👕', keywords: ['camiseta', 'ropa', 'polera', 'playera', 'moda'] },
      { emoji: '👔', keywords: ['corbata', 'camisa', 'formal', 'trabajo'] },
      { emoji: '👗', keywords: ['vestido', 'ropa', 'mujer', 'moda'] },
      { emoji: '👚', keywords: ['blusa', 'ropa', 'mujer'] },
      { emoji: '🧥', keywords: ['chaqueta', 'abrigo', 'invierno'] },
      { emoji: '👖', keywords: ['jeans', 'pantalones', 'ropa'] },
      { emoji: '🩳', keywords: ['shorts', 'bermudas', 'ropa'] },
      { emoji: '👙', keywords: ['bikini', 'traje de bano', 'playa'] },
      { emoji: '👠', keywords: ['tacones', 'zapatos', 'calzado', 'moda'] },
      { emoji: '👡', keywords: ['sandalias', 'calzado', 'verano'] },
      { emoji: '👢', keywords: ['botas', 'calzado', 'invierno'] },
      { emoji: '👟', keywords: ['tenis', 'sneakers', 'calzado', 'zapatillas', 'deporte'] },
      { emoji: '👞', keywords: ['zapatos formales', 'calzado', 'hombre'] },
      { emoji: '👒', keywords: ['sombrero', 'accesorios', 'moda'] },
      { emoji: '🧢', keywords: ['gorra', 'accesorios', 'moda'] },
      { emoji: '🕶️', keywords: ['gafas de sol', 'lentes', 'accesorios'] },
      { emoji: '👓', keywords: ['gafas', 'lentes', 'optica'] },
      { emoji: '💍', keywords: ['anillo', 'joyeria', 'joyas', 'compromiso'] },
      { emoji: '💄', keywords: ['labial', 'maquillaje', 'cosmeticos', 'belleza'] },
      { emoji: '👛', keywords: ['monedero', 'cartera', 'accesorios'] },
      { emoji: '👜', keywords: ['bolso', 'cartera', 'moda'] },
      { emoji: '🎒', keywords: ['mochila', 'morral', 'maletin'] },
      { emoji: '📱', keywords: ['celular', 'telefono', 'smartphone', 'iphone', 'tecnologia'] },
      { emoji: '💻', keywords: ['computador', 'laptop', 'portatil', 'tecnologia'] },
      { emoji: '🖥️', keywords: ['pantalla', 'monitor', 'pc', 'tecnologia'] },
      { emoji: '⌨️', keywords: ['teclado', 'computador'] },
      { emoji: '🎧', keywords: ['audifonos', 'auriculares', 'musica', 'tecnologia'] },
      { emoji: '⌚', keywords: ['reloj', 'smartwatch', 'apple watch', 'accesorios'] },
      { emoji: '📷', keywords: ['camara', 'fotografia', 'fotos'] },
      { emoji: '🏷️', keywords: ['etiqueta', 'descuento', 'oferta', 'precio'] },
      { emoji: '🎁', keywords: ['regalo', 'obsequio', 'cumpleanos', 'navidad'] }
    ]
  },
  {
    id: 'entertainment',
    name: 'Ocio & Deportes',
    icon: '🍿',
    emojis: [
      { emoji: '🍿', keywords: ['palomitas', 'crispetas', 'cine', 'peliculas', 'ocio'] },
      { emoji: '🎬', keywords: ['claqueta', 'cine', 'peliculas', 'estrenos', 'series'] },
      { emoji: '🎟️', keywords: ['boletos', 'entradas', 'concierto', 'cine', 'evento'] },
      { emoji: '🎮', keywords: ['videojuegos', 'playstation', 'xbox', 'nintendo', 'gaming'] },
      { emoji: '🕹️', keywords: ['joystick', 'arcade', 'juegos'] },
      { emoji: '🎲', keywords: ['dados', 'juegos de mesa', 'casino'] },
      { emoji: '🎯', keywords: ['diana', 'tiro', 'juego'] },
      { emoji: '🎳', keywords: ['bolos', 'bowling', 'salida'] },
      { emoji: '⚽', keywords: ['futbol', 'balon', 'deporte', 'partido'] },
      { emoji: '🏀', keywords: ['baloncesto', 'basquet', 'deporte'] },
      { emoji: '🏈', keywords: ['futbol americano', 'deporte'] },
      { emoji: '🎾', keywords: ['tenis', 'raqueta', 'deporte'] },
      { emoji: '🏐', keywords: ['voleibol', 'voley', 'deporte'] },
      { emoji: '🎱', keywords: ['billar', 'pool', 'salida'] },
      { emoji: '🏓', keywords: ['ping pong', 'tenis de mesa'] },
      { emoji: '🥊', keywords: ['boxeo', 'pelea', 'entrenamiento'] },
      { emoji: '🏋️', keywords: ['gimnasio', 'pesas', 'gym', 'fitness', 'entrenamiento'] },
      { emoji: '🚴', keywords: ['ciclismo', 'bici', 'deporte', 'ruta'] },
      { emoji: '🏊', keywords: ['natacion', 'piscina', 'nadar'] },
      { emoji: '🎨', keywords: ['arte', 'pintura', 'museo', 'dibujo'] },
      { emoji: '🎭', keywords: ['teatro', 'cultura', 'obra'] },
      { emoji: '🎤', keywords: ['microfono', 'karaoke', 'canto'] },
      { emoji: '🎵', keywords: ['musica', 'cancion', 'spotify', 'suscripcion'] },
      { emoji: '🎶', keywords: ['notas musicales', 'musica'] },
      { emoji: '🎸', keywords: ['guitarra', 'musica', 'rock', 'instrumento'] },
      { emoji: '🎹', keywords: ['piano', 'musica', 'teclado'] },
      { emoji: '🏖️', keywords: ['playa', 'sombrilla', 'mar', 'vacaciones'] },
      { emoji: '⛺', keywords: ['camping', 'acampada', 'naturaleza'] },
      { emoji: '🎡', keywords: ['parque de diversiones', 'rueda'] },
      { emoji: '🎢', keywords: ['montana rusa', 'parque'] }
    ]
  },
  {
    id: 'health',
    name: 'Salud & Bienestar',
    icon: '💊',
    emojis: [
      { emoji: '💊', keywords: ['pastilla', 'medicamento', 'farmacia', 'droga', 'medicina', 'salud'] },
      { emoji: '💉', keywords: ['inyeccion', 'vacuna', 'laboratorio', 'examen'] },
      { emoji: '🩹', keywords: ['curita', 'venda', 'herida'] },
      { emoji: '🩺', keywords: ['estetoscopio', 'medico', 'doctor', 'cita medica'] },
      { emoji: '🏥', keywords: ['hospital', 'clinica', 'urgencias', 'salud'] },
      { emoji: '🚑', keywords: ['ambulancia', 'emergencia medica'] },
      { emoji: '🩸', keywords: ['sangre', 'analisis', 'laboratorio'] },
      { emoji: '🦷', keywords: ['diente', 'odontologia', 'dentista', 'brackets'] },
      { emoji: '👁️', keywords: ['ojo', 'optica', 'oftalmologo'] },
      { emoji: '🧴', keywords: ['locion', 'crema', 'bloqueador', 'skincare', 'aseo personal'] },
      { emoji: '🧼', keywords: ['jabon', 'aseo', 'higiene'] },
      { emoji: '🪥', keywords: ['cepillo de dientes', 'higiene dental'] },
      { emoji: '🌿', keywords: ['hierba', 'naturista', 'saludable'] },
      { emoji: '🧘', keywords: ['yoga', 'meditacion', 'zen', 'bienestar', 'paz'] },
      { emoji: '💆', keywords: ['masaje', 'spa', 'relajacion'] },
      { emoji: '🧖', keywords: ['sauna', 'spa', 'cuidado'] },
      { emoji: '🌡️', keywords: ['termometro', 'fiebre', 'enfermedad'] },
      { emoji: '🧬', keywords: ['adn', 'genetica', 'ciencia'] },
      { emoji: '🔬', keywords: ['microscopio', 'laboratorio'] },
      { emoji: '❤️', keywords: ['corazon', 'cardiologo', 'salud'] }
    ]
  },
  {
    id: 'finance',
    name: 'Finanzas & Oficina',
    icon: '💰',
    emojis: [
      { emoji: '💰', keywords: ['dinero', 'bolsa', 'plata', 'ingresos', 'riqueza'] },
      { emoji: '💵', keywords: ['dolar', 'billete', 'efectivo', 'dinero'] },
      { emoji: '💶', keywords: ['euro', 'billetes', 'dinero'] },
      { emoji: '💷', keywords: ['libra', 'dinero'] },
      { emoji: '💳', keywords: ['tarjeta de credito', 'debito', 'visa', 'mastercard', 'pago'] },
      { emoji: '🧾', keywords: ['recibo', 'factura', 'ticket', 'comprobante'] },
      { emoji: '🪙', keywords: ['moneda', 'cripto', 'plata', 'ahorro'] },
      { emoji: '💎', keywords: ['diamante', 'joya', 'lujo', 'inversion'] },
      { emoji: '📈', keywords: ['grafica subiendo', 'inversiones', 'acciones', 'bolsa', 'ganancias'] },
      { emoji: '📉', keywords: ['grafica bajando', 'perdidas', 'caida'] },
      { emoji: '📊', keywords: ['grafico de barras', 'reporte', 'analisis', 'estadisticas'] },
      { emoji: '📑', keywords: ['documentos', 'contratos', 'papeles'] },
      { emoji: '💼', keywords: ['maletin', 'trabajo', 'empleo', 'salario', 'sueldo', 'oficina'] },
      { emoji: '🏦', keywords: ['banco', 'sucursal', 'cajero', 'cuenta'] },
      { emoji: '🏧', keywords: ['cajero automatico', 'retiro', 'banco'] },
      { emoji: '🔒', keywords: ['candado', 'seguridad', 'ahorros'] },
      { emoji: '💸', keywords: ['dinero volando', 'gastos', 'desembolso'] },
      { emoji: '🤑', keywords: ['cara dinero', 'ganancia', 'rico'] },
      { emoji: '📚', keywords: ['libros', 'educacion', 'universidad', 'colegio', 'estudios'] },
      { emoji: '🎓', keywords: ['birrete', 'graduacion', 'universidad', 'carrera'] },
      { emoji: '📖', keywords: ['libro abierto', 'lectura'] },
      { emoji: '💻', keywords: ['cursos', 'programacion', 'computador'] },
      { emoji: '📋', keywords: ['portapapeles', 'tareas', 'oficina'] },
      { emoji: '📌', keywords: ['chinche', 'nota', 'pendiente'] },
      { emoji: '📎', keywords: ['clip', 'archivos', 'oficina'] },
      { emoji: '🖊️', keywords: ['boligrafo', 'firma', 'contrato'] },
      { emoji: '📝', keywords: ['nota', 'apunte', 'registro'] }
    ]
  }
];

export default function EmojiPickerModal({
  isOpen,
  onClose,
  selectedEmoji = '🍔',
  onSelectEmoji
}) {
  const [activeTab, setActiveTab] = useState('food');
  const [searchQuery, setSearchQuery] = useState('');

  useBackHandler(Boolean(isOpen), onClose);

  // Filtrado de emojis según búsqueda o pestaña activa
  const displayedEmojis = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      const currentCategory = EMOJI_CATEGORIES.find(c => c.id === activeTab) || EMOJI_CATEGORIES[0];
      return currentCategory.emojis;
    }

    // Búsqueda en todo el catálogo
    const all = [];
    const seen = new Set();
    EMOJI_CATEGORIES.forEach(cat => {
      cat.emojis.forEach(item => {
        if (seen.has(item.emoji)) return;
        const matchesName = item.keywords.some(k => k.toLowerCase().includes(q));
        const matchesEmoji = item.emoji.includes(q);
        if (matchesName || matchesEmoji) {
          seen.add(item.emoji);
          all.push(item);
        }
      });
    });
    return all;
  }, [activeTab, searchQuery]);

  if (!isOpen) return null;

  const handleSelect = (emoji) => {
    if (onSelectEmoji) {
      onSelectEmoji(emoji);
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="rounded-t-[28px] sm:rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl border animate-slide-up pb-safe max-h-[85vh] flex flex-col"
        style={{ 
          backgroundColor: 'var(--modal-bg)', 
          borderColor: 'var(--border-color)', 
          color: 'var(--text-main)' 
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Manija móvil */}
        <div className="w-10 h-1 bg-slate-400/40 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Encabezado */}
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-xl shadow-sm">
              {selectedEmoji || '🏷️'}
            </div>
            <div>
              <h3 className="text-base font-bold">Seleccionar Icono</h3>
              <p className="text-[11px] opacity-60">Emojis nativos estilo WhatsApp a todo color</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold opacity-60 hover:opacity-100 cursor-pointer transition-colors"
            style={{ backgroundColor: 'var(--bg-card-sub)' }}
            aria-label="Cerrar selector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de búsqueda */}
        <div className="relative my-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar emoji (ej: café, pizza, taxi, casa, gym)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs font-semibold rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-[#34C759] transition-all"
            style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-100 p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Pestañas de categorías estilo WhatsApp (cuando no hay búsqueda) */}
        {!searchQuery && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none select-none">
            {EMOJI_CATEGORIES.map((cat) => {
              const isActive = activeTab === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveTab(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500 text-white shadow-sm scale-102'
                      : 'hover:bg-slate-200/50 dark:hover:bg-white/10 opacity-70'
                  }`}
                  style={!isActive ? { backgroundColor: 'var(--bg-card-sub)' } : {}}
                >
                  <span className="text-sm">{cat.icon}</span>
                  <span className="truncate max-w-[110px]">{cat.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Cuadrícula de Emojis */}
        <div className="flex-1 overflow-y-auto pr-1 mt-2 min-h-[200px] max-h-[300px]">
          {displayedEmojis.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-60 text-center">
              <span className="text-3xl mb-2">🔍</span>
              <p className="text-xs font-semibold">No se encontraron emojis</p>
              <p className="text-[11px] opacity-75">Intenta con otra palabra clave</p>
            </div>
          ) : (
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 place-items-center">
              {displayedEmojis.map((item, idx) => {
                const isSelected = selectedEmoji === item.emoji;
                return (
                  <button
                    key={`${item.emoji}-${idx}`}
                    type="button"
                    onClick={() => handleSelect(item.emoji)}
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-2xl transition-all cursor-pointer select-none active:scale-90 ${
                      isSelected
                        ? 'ring-2 ring-emerald-500 bg-emerald-500/15 shadow-sm scale-110'
                        : 'hover:bg-slate-100 dark:hover:bg-white/10 hover:scale-115'
                    }`}
                    title={item.keywords.join(', ')}
                  >
                    <span role="img" aria-label={item.keywords[0]} className="leading-none pointer-events-none">
                      {item.emoji}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pie informativo */}
        <div className="pt-3 mt-2 border-t flex items-center justify-between text-[11px] opacity-60" style={{ borderColor: 'var(--border-color)' }}>
          <span>Toca cualquier emoji para seleccionarlo</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {displayedEmojis.length} emoji{displayedEmojis.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </div>
  );
}
