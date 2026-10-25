export const BRAND_ASSET_VERSION = 'v=20261024';
export const BANCOLOMBIA_SVG_PATH = `/brands/bancolombia.svg?${BRAND_ASSET_VERSION}`;

export function isBancolombia(name = '', bank = '', type = '') {
  const text = `${name || ''} ${bank || ''} ${type || ''}`.toLowerCase();
  return (
    text.includes('bancolombia') ||
    text.includes('ahorros bancolombia') ||
    text.includes('bancolombia ahorros') ||
    text.includes('corriente bancolombia') ||
    text.includes('bancolombia corriente')
  );
}

export function getBankIcon(name = '', bank = '', type = '') {
  if (isBancolombia(name, bank, type)) {
    return BANCOLOMBIA_SVG_PATH;
  }
  return null;
}
