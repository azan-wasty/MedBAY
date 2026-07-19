/**
 * Resolves an Odoo image field (which may be a raw base64 string, an Odoo
 * Python bytes-repr string like "b'...'", a full URL, or `false`) into a
 * usable <img> src. Preserved exactly from the original implementation —
 * every call site across the catalog, product detail, and cards depends on
 * this exact precedence.
 */
export function getProductImageSrc(imgField: string | boolean | undefined): string | null {
  if (!imgField) return null;
  if (typeof imgField === "string") {
    let cleanImg = imgField.trim();
    if (cleanImg.startsWith("b'") && cleanImg.endsWith("'")) {
      cleanImg = cleanImg.slice(2, -1);
    }
    if (cleanImg.startsWith("http") || cleanImg.startsWith("data:")) {
      return cleanImg;
    }
    return `data:image/png;base64,${cleanImg}`;
  }
  return null;
}
