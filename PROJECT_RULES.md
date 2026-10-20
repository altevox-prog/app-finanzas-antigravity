# ANTIGRAVITY ENGINE — REGLAS ARQUITECTÓNICAS Y CONSTITUCIÓN DE CÓDIGO
# Este archivo rige de forma obligatoria todas las intervenciones, refactorizaciones y correcciones de bugs en este repositorio.

---

### 1. UMBRAL ESTRICTO DE LÍNEAS
- **Límite máximo por archivo:** 160-170 líneas (la cota estricta global es < 180 líneas).
- **Prohibición de inflado:** Ninguna corrección de bug o adición de funcionalidad puede superar este umbral. Si una función o vista requiere más líneas, debe extraerse en un sub-hook puro o sub-componente modular en su propia carpeta.
- **Prohibido código muerto:** No dejes funciones comentadas, imports no utilizados, consolas de depuración (`console.log`) ni bloques `TODO`.

---

### 2. REACTIVIDAD Y MANEJO DE ESTADO (CERO BUCLES INFINITOS)
- **Prohibido sincronizar estado con `useEffect` innecesario:** No uses `useEffect` para copiar `props` a un estado local (`setFormData(initialData)`). Usa inicialización perezosa (`useState(() => initialData)`) o deriva el valor directamente durante el render.
- **Dependencias primitivas y estables:** Nunca coloques objetos literales (`{}`) ni arrays nuevos como dependencias de un `useEffect` o `useCallback`. Depende exclusivamente de primitivos (`initialData?.id`, `isOpen`, `selectedId`).
- **Prohibido disparar `setState` en la fase de render:** Ningún manejador de eventos o callback puede ejecutarse inmediatamente en el JSX (ejemplo prohibido: `onChange={handleChange()}`; forma obligatoria: `onChange={handleChange}`).

---

### 3. INTEGRIDAD DE BASE DE DATOS Y CONTRATOS (SUPABASE)
- **Nombres de columnas sagrados:** Respeta estrictamente los esquemas existentes (`snake_case` para Supabase: `account_id`, `destination_account_id`, `created_at`, `user_id`, etc.). 
- **Prohibido renombrar payloads:** No transformes propiedades arbitrariamente a `camelCase` si la API o base de datos espera las columnas originales.
- **Validaciones tempranas:** Si un campo obligatorio falta, la guardia debe ser temprana y explícita, sin swallowings silenciosos de errores en bloques `catch` vacíos.

---

### 4. REUTILIZACIÓN RADICAL (CERO DUPLICACIÓN)
- **Prohibido reescribir utilidades:** Si una función de formato de moneda, cálculo de fecha, normalización de payload o icono ya existe en `src/utils/` o en hooks compartidos, **IMPÓRTALA**. No crees copias locales dentro de los componentes.
- **No inventes abstracciones innecesarias:** No agregues patrones de fábrica complejos ni wrappers sobre wrappers si una función pura de JavaScript resuelve el problema en 2 líneas.

---

### 5. CALIDAD DEL JSX Y TAILWIND
- **Aplanamiento estructural:** Prohibido anidar `<div>` dentro de `<div>` sin justificación de layout (Flexbox/Grid). 
- **Listas y Catálogos:** Todo renderizado de opciones repetitivas (botones de filtro, teclados numéricos, selectores de color/icono) debe realizarse mapeando sobre arrays constantes o declarativos (`.map()`), nunca escribiendo bloques JSX repetidos a mano.
- **Clases Tailwind concisas:** Agrupa estilos compartidos y evita clases conflictivas o redundantes.

---

### 6. CHECKLIST DE ENTREGA PARA CADA FIX O LOTE
Cada intervención de Antigravity debe cumplir rigurosamente:
1. `npm run build` compila con código de salida 0.
2. Cero advertencias de dependencias faltantes o bucles en consola.
3. El conteo de líneas del archivo modificado se mantiene dentro de la norma (< 170 líneas).
4. El contrato de datos con Supabase y LocalStorage permanece 100% compatible.