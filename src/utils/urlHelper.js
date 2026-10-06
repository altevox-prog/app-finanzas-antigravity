/**
 * Helper para obtener la URL base absoluta con protocolo (https:// o http://)
 * Garantiza que redirectTo y emailRedirectTo nunca se envíen como URLs relativas.
 */
export const getURL = () => {
  let url = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'https://presu-app-5s9f.vercel.app';

  // Asegurar obligatoriamente protocolo https:// o http://
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  // Asegurar que no termine en diagonal
  url = url.endsWith('/') ? url.slice(0, -1) : url;

  return url;
};

export default getURL;
