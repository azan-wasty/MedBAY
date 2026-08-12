const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  "Diagnostic Equipment": "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80",
  "Hospital Furniture": "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=600&q=80",
  "PPE & Consumables": "https://images.unsplash.com/photo-1584744982491-665216d95f8b?auto=format&fit=crop&w=600&q=80",
  "Surgical Instruments": "https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=600&q=80",
  "Imaging & Lab Equipment": "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=600&q=80",
  "Home Care Equipment": "https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?auto=format&fit=crop&w=600&q=80",
};

const DEFAULT_FALLBACK_IMAGE = "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80";

/**
 * Resolves an Odoo image field (base64 string, Python bytes-repr, URL, or empty)
 * into a usable <img> src with medical equipment fallbacks.
 */
export function getProductImageSrc(
  imgField: string | boolean | undefined,
  categoryName?: string
): string {
  if (typeof imgField === "string" && imgField.trim().length > 0) {
    let cleanImg = imgField.trim();
    if (cleanImg.startsWith("b'") && cleanImg.endsWith("'")) {
      cleanImg = cleanImg.slice(2, -1);
    }
    if (cleanImg.startsWith("http") || cleanImg.startsWith("data:")) {
      return cleanImg;
    }
    if (cleanImg.length > 50) {
      return `data:image/png;base64,${cleanImg}`;
    }
  }

  if (categoryName && CATEGORY_FALLBACK_IMAGES[categoryName]) {
    return CATEGORY_FALLBACK_IMAGES[categoryName];
  }

  return DEFAULT_FALLBACK_IMAGE;
}
