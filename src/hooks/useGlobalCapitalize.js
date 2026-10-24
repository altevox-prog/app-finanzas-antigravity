import { useEffect } from 'react';

/**
 * Hook global para auto-capitalizar la primera letra en todos los inputs de texto y textareas.
 * Excluye inputs de contraseña, correo electrónico, URLs, números y teléfonos.
 */
export function useGlobalCapitalize() {
  useEffect(() => {
    const EXCLUDED_TYPES = new Set([
      'password', 'email', 'url', 'number', 'tel', 'date', 'time',
      'datetime-local', 'file', 'checkbox', 'radio', 'hidden'
    ]);

    const isEligibleElement = (el) => {
      if (!el || el.readOnly || el.disabled) return false;
      const tag = el.tagName?.toLowerCase();
      if (tag === 'textarea') return true;
      if (tag === 'input') {
        const type = (el.getAttribute('type') || 'text').toLowerCase();
        return !EXCLUDED_TYPES.has(type);
      }
      return false;
    };

    // 1. Asegurar autocapitalize="sentences" al enfocar cualquier input/textarea elegible (para móviles)
    const handleFocusIn = (e) => {
      const target = e.target;
      if (isEligibleElement(target) && !target.hasAttribute('autocapitalize')) {
        target.setAttribute('autocapitalize', 'sentences');
      }
    };

    // 2. Capitalizar la primera letra en tiempo real respetando la posición del cursor
    const handleInput = (e) => {
      const target = e.target;
      if (!isEligibleElement(target)) return;

      const val = target.value;
      if (!val || typeof val !== 'string') return;

      // Si el primer carácter visible no es mayúscula y es una letra
      const firstChar = val.charAt(0);
      const upperFirst = firstChar.toUpperCase();

      if (firstChar !== upperFirst) {
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const newVal = upperFirst + val.slice(1);

        // Usar nativeInputValueSetter según el tipo de elemento para notificar a React sin errores
        const proto = target instanceof HTMLTextAreaElement
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;

        if (nativeSetter) {
          nativeSetter.call(target, newVal);
        } else {
          target.value = newVal;
        }

        if (start !== null && end !== null) {
          target.setSelectionRange(start, end);
        }

        // Despachar evento para sincronizar onChange handlers de React
        target.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('input', handleInput, true);

    return () => {
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('input', handleInput, true);
    };
  }, []);
}

export default useGlobalCapitalize;
