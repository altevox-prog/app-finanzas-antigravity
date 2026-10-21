# ANTIGRAVITY ENGINE — REGLAS ARQUITECTÓNICAS Y CONSTITUCIÓN DE CÓDIGO
# Este archivo rige de forma obligatoria todas las intervenciones, refactorizaciones y correcciones de bugs en este repositorio.

---

### 1. UMBRAL ESTRICTO DE LÍNEAS
- **Límite máximo por archivo:** 160-170 líneas (la cota estricta global es < 180 líneas).
- **Prohibición de inflado:** Ninguna corrección de bug o adición de funcionalidad puede superar este umbral. Si una función o vista requiere más líneas, debe extraerse en un sub-hook puro o sub-componente modular en su propia carpeta.
- **Prohibido código muerto:** No dejes funciones comentadas, imports no utilizados, consolas de depuración (`console.log`) ni bloques `TODO`.

---

### 2. DIRECTIVA DE PODA LIMPIA Y MODIFICACIÓN DIRECTA (ZERO ACCUMULATION)

1. Eliminación Definitiva vs. Ocultamiento Defensivo:
   - Cuando se solicite eliminar una propiedad, campo, sección visual o variable, ELIMINA físicamente el bloque de código, su estado asociado (`useState`), sus manejadores de eventos y sus `props`.
   - PROHIBIDO envolver código deprecado en condicionales defensivos innecesarios (ej. `{hasProperty && <Component />}`, flags booleanas obsoletas o ternarios vacíos `? null : ...`).

2. Prohibición de Código Fantasma y Huérfanos:
   - Al remover un elemento de la interfaz o de la lógica, es OBLIGATORIO limpiar de inmediato cualquier `import` no utilizado, tipo/interfaz huérfana, helper o constante asociada.
   - No dejes comentarios tipo `// Deprecated`, `// Removed`, ni bloques de código comentados.

3. Refactorización Directa:
   - Modifica el flujo principal de forma directa. No crees capas intermedias de abstracción ni adaptadores temporales solo para eludir el borrado de una línea o función.
   - Si un objeto o payload de estado ya no necesita un campo, retira el campo del esquema inicial y de sus funciones mutadoras.

---

### 3. REACTIVIDAD Y MANEJO DE ESTADO (CERO BUCLES INFINITOS)
- **Prohibido sincronizar estado con `useEffect` innecesario:** No uses `useEffect` para copiar `props` a un estado local (`setFormData(initialData)`). Usa inicialización perezosa (`useState(() => initialData)`) o deriva el valor directamente durante el render.
- **Dependencias primitivas y estables:** Nunca coloques objetos literales (`{}`) ni arrays nuevos como dependencias de un `useEffect` o `useCallback`. Depende exclusivamente de primitivos (`initialData?.id`, `isOpen`, `selectedId`).
- **Prohibido disparar `setState` en la fase de render:** Ningún manejador de eventos o callback puede ejecutarse inmediatamente en el JSX (ejemplo prohibido: `onChange={handleChange()}`; forma obligatoria: `onChange={handleChange}`).

---

### 4. INTEGRIDAD DE BASE DE DATOS Y CONTRATOS (SUPABASE)
- **Nombres de columnas sagrados:** Respeta estrictamente los esquemas existentes (`snake_case` para Supabase: `account_id`, `destination_account_id`, `created_at`, `user_id`, etc.). 
- **Prohibido renombrar payloads:** No transformes propiedades arbitrariamente a `camelCase` si la API o base de datos espera las columnas originales.
- **Validaciones tempranas:** Si un campo obligatorio falta, la guardia debe ser temprana y explícita, sin swallowings silenciosos de errores en bloques `catch` vacíos.

---

### 5. REUTILIZACIÓN RADICAL (CERO DUPLICACIÓN)
- **Prohibido reescribir utilidades:** Si una función de formato de moneda, cálculo de fecha, normalización de payload o icono ya existe en `src/utils/` o en hooks compartidos, **IMPÓRTALA**. No crees copias locales dentro de los componentes.
- **No inventes abstracciones innecesarias:** No agregues patrones de fábrica complejos ni wrappers sobre wrappers si una función pura de JavaScript resuelve el problema en 2 líneas.

---

### 6. CALIDAD DEL JSX Y TAILWIND
- **Aplanamiento estructural:** Prohibido anidar `<div>` dentro de `<div>` sin justificación de layout (Flexbox/Grid). 
- **Listas y Catálogos:** Todo renderizado de opciones repetitivas (botones de filtro, teclados numéricos, selectores de color/icono) debe realizarse mapeando sobre arrays constantes o declarativos (`.map()`), nunca escribiendo bloques JSX repetidos a mano.
- **Clases Tailwind concisas:** Agrupa estilos compartidos y evita clases conflictivas o redundantes.

---

### 7. CHECKLIST DE ENTREGA PARA CADA FIX O LOTE
Cada intervención de Antigravity debe cumplir rigurosamente:
1. `npm run build` compila con código de salida 0.
2. Cero advertencias de dependencias faltantes o bucles en consola.
3. El conteo de líneas del archivo modificado se mantiene dentro de la norma (< 170 líneas).
4. El contrato de datos con Supabase y LocalStorage permanece 100% compatible.
