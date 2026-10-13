/**
 * Servicio de procesamiento y compresión de imágenes de perfil
 */

/**
 * Comprime un archivo de imagen en el navegador usando Canvas y devuelve un base64 JPEG.
 * @param {File} file 
 * @param {number} [maxDim=400] 
 * @param {number} [quality=0.85] 
 * @returns {Promise<string>}
 */
export function compressImageFile(file, maxDim = 400, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file provided'));
    }
    if (!file.type || !file.type.startsWith('image/')) {
      return reject(new Error('Por favor selecciona un archivo de imagen válido.'));
    }

    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = (err) => reject(err);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Genera iniciales a partir de un nombre.
 * @param {string} name 
 * @returns {string}
 */
export function getInitialsFromName(name) {
  const cleanName = (name || '').trim();
  if (!cleanName) return 'U';
  const parts = cleanName.split(' ').filter(Boolean);
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : cleanName.slice(0, 2).toUpperCase();
}
