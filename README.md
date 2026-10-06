# 💰 Presu App - Finanzas Personales

Aplicación web y móvil responsiva para la gestión integral de finanzas personales, desarrollada con **React**, **Vite**, **Tailwind CSS**, **Lucide Icons** y **Canvas Confetti**, con estética nativa de **Apple iOS**.

---

## 🎨 Temas Visuales Disponibles

Presu App incluye un selector de temas en la barra superior con persistencia automática en el navegador:
1. ☀️ **Claro (iOS)**: Fondo gris claro suave `#F2F2F7`, tarjetas blancas y contrastes nítidos.
2. 🌙 **Negro (OLED Midnight)**: Fondo negro puro `#000000`, tarjetas grafito `#1C1C1E`, ideal para pantallas OLED y descanso visual.
3. 🌲 **Esmeralda Nocturno (Luxury Jade)**: Fondo verde bosque oscuro `#071611` con tarjetas verde esmeralda y acentos menta luminosos.

---

## 🚀 Cómo Ejecutar la Aplicación

### Opción 1: Con un solo clic (Recomendada en Windows)
- Haz doble clic en el archivo **`iniciar.bat`**.
- Se abrirá automáticamente la consola de desarrollo y tu navegador en `http://localhost:5173`.

### Opción 2: Desde la terminal
```powershell
npm run dev
```

---

## 📱 Características Principales

### 1. 🗓️ Selector de Mes / Año y Calendario Diario
- Navegación mes a mes con botones `< Mes / Año >`.
- **Calendario desplegable interactivo:** Haz clic en la fecha para ver un calendario con indicadores de gastos (🔴) e ingresos (🟢) de cada día y toca cualquier fecha para filtrar exclusivamente los gastos de ese día.

### 2. ⚡ Registro y Edición Rápida con Combobox Inteligente
- **Sin botones innecesarios:** Haz clic en **Categoría Principal**, **Subcategoría** o **Cuenta**:
  - Se despliegan todas las opciones predefinidas.
  - El cursor se activa para que puedas escribir y filtrar.
  - Si escribes un nombre nuevo y pulsas <kbd>Enter</kbd> ↵, se crea, se guarda y queda seleccionada al instante.
- **Edición completa de transacciones:** Pulsa el botón de lápiz ✏️ en cualquier movimiento para editar monto, fecha, categoría, subcategoría, cuenta o nota con recálculo automático en vivo.

### 3. 💳 Cuentas y Categorías Personalizables
- Saldos de cuentas calculados dinámicamente según los movimientos registrados.
- Creación de categorías y subcategorías ilimitadas con colores e iconos.

### 4. 📊 Reportes y Gráficos Visuales
- Gráfico Donut SVG de gastos por categoría con desglose interactivo de subcategorías.
- Comparativa mensual de Ingresos vs Gastos y métricas de salud financiera.

### 5. 🤝 Módulo de Préstamos y Deudas ("Me deben" y "Debo")
- Gestión de cuentas por cobrar y pasivos financieros.
- Cálculo de Tasa de Interés (%) y Seguro adicional.
- Registro de abonos parciales, historial y marcado automático como **"PAGADO"** con confeti festivo.
