// MedBAY — B2B Medical Equipment Marketplace Constants
// All static labels, navigational objects, copy, and fallback data.

export const BRAND_CONFIG = {
  name: "MedBAY",
  slogan: "Your Trusted B2B Medical Equipment Marketplace",
  contactEmail: "procurement@medbay.com",
  phone: "+1 (800) 555-MBAY",
  address: "Medical Hub District, Suite 400, Boston, MA",
};

export const COLOR_PALETTE = {
  primary: "#0d9488",       // Deep teal — trust, health, professionalism
  primaryHover: "#0f766e",  // Darker teal hover
  primaryLight: "#f0fdfa",  // Teal tint background
  accent: "#f59e0b",        // Warm amber — CTAs & highlights
  accentHover: "#d97706",   // Darker amber
  backgroundLight: "#f8fafc",
  backgroundWhite: "#ffffff",
  borderLight: "#e2e8f0",
  textDark: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#64748b",
  success: "#10b981",
  warning: "#f59e0b",
  navbarBg: "#0f172a",      // Dark slate for navbar
};

export const NAV_LINKS = [
  { label: "Catalog", path: "/" },
  { label: "RFQ Cart", path: "/cart" },
  { label: "Dashboard", path: "/dashboard" },
];

export const AUTH_LABELS = {
  loginTitle: "Sign In to MedBAY",
  loginSubtitle: "Access your B2B procurement dashboard securely",
  registerTitle: "Create Your MedBAY Account",
  registerSubtitle: "Register your organization for verified procurement access",
  emailLabel: "Work Email Address",
  passwordLabel: "Password",
  nameLabel: "Organization Name",
  licenseLabel: "Medical Registration / License Number",
  submitLogin: "Sign In Securely",
  submitRegister: "Submit Registration",
  needAccount: "Don't have an account yet?",
  haveAccount: "Already registered?",
  loginPrompt: "Please sign in to continue.",
  unauthorizedMsg: "You must be signed in as a verified organization to submit RFQs.",
};

export const CATALOG_LABELS = {
  searchPlaceholder: "Search devices, equipment, model numbers...",
  filterAll: "All Categories",
  noProducts: "No products found matching your criteria.",
  moqLabel: "Min. Order Qty",
  warrantyLabel: "Warranty",
  certificationLabel: "Certifications",
  uomLabel: "UoM",
  priceOnRequest: "List Price",
  addToCart: "Add to RFQ",
  addedToCart: "added to your RFQ cart",
  viewDetails: "View Details",
};

export const PRODUCT_DETAILS_LABELS = {
  specTitle: "Technical Specifications & Compliance",
  orderTitle: "Configure Your Quote",
  moqWarning: "Minimum order quantity is required for supply verification.",
  certificationBadge: "Regulatory Compliant",
  addToCartButton: "Add to RFQ Cart",
  backToCatalog: "Back to Catalog",
};

export const CART_LABELS = {
  title: "RFQ Cart",
  subtitle: "Review your selected equipment and submit a Request for Quote.",
  emptyCart: "Your RFQ cart is empty. Browse our catalog to add medical equipment.",
  submitButton: "Submit Request for Quote",
  submitting: "Submitting your RFQ...",
  successTitle: "RFQ Submitted Successfully!",
  successSubtitle: "Our team is reviewing your request. A formal quotation will be generated shortly.",
  clearCart: "Clear All",
  itemTableHeadProduct: "Product",
  itemTableHeadQty: "Quantity",
  itemTableHeadActions: "Actions",
};

export const DASHBOARD_LABELS = {
  title: "Procurement Dashboard",
  subtitle: "Track your RFQs, verify licensing status, and manage quotations.",
  companyInfo: "Organization Profile",
  statusVerified: "Verified",
  statusUnverified: "Pending Verification",
  rfqListTitle: "Your Requests for Quote",
  noRfqs: "No RFQs submitted yet. Browse the catalog to create your first quote request.",
  tableId: "Reference",
  tableDate: "Date",
  tableTotal: "Est. Total",
  tableStatus: "Status",
};

export const ODOO_STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: "Draft", bg: "#f1f5f9", text: "#475569" },
  sent: { label: "Approved", bg: "#dbeafe", text: "#1d4ed8" },
  sale: { label: "Ordered", bg: "#d1fae5", text: "#065f46" },
  done: { label: "Completed", bg: "#e0f2fe", text: "#075985" },
  cancel: { label: "Cancelled", bg: "#fee2e2", text: "#991b1b" },
};

// High-quality mock catalog data used as a fallback if Odoo has no records
export const MOCK_PRODUCTS = [
  {
    id: 1,
    name: "AuraScan MRI Machine - 3T",
    list_price: 1250000.0,
    description_sale: "State-of-the-art 3 Tesla MRI scanner offering high-resolution clinical imaging with advanced noise-canceling technology.",
    categ_id: [10, "Diagnostic Imaging"],
    certification_info: "FDA Approved, CE Certified, ISO 13485",
    unit_of_measure: "Unit",
    min_order_qty: 1,
    warranty_period: "3 Years",
    image_256: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80",
    image_1920: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 2,
    name: "Medisurge ICU Ventilator - V2",
    list_price: 45000.0,
    description_sale: "Critical care ventilator suitable for pediatric and adult patients. Supports invasive and non-invasive ventilation modes.",
    categ_id: [11, "Life Support"],
    certification_info: "FDA Approved, CE Certified",
    unit_of_measure: "Unit",
    min_order_qty: 2,
    warranty_period: "2 Years",
    image_256: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80",
    image_1920: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 3,
    name: "SurgiPath Surgical Lighting System",
    list_price: 12500.0,
    description_sale: "High-intensity LED surgical light head with customizable light diameter and color temperature adjustments.",
    categ_id: [12, "Operating Room"],
    certification_info: "CE Certified, UL 60601-1",
    unit_of_measure: "Set",
    min_order_qty: 1,
    warranty_period: "1 Year",
    image_256: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80",
    image_1920: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 4,
    name: "HeartSync Defibrillator - Pro",
    list_price: 7800.0,
    description_sale: "Biphasic automated external defibrillator (AED) and manual monitor with pacing, SpO2, and ECG display.",
    categ_id: [11, "Life Support"],
    certification_info: "FDA Approved, AHA Compliant",
    unit_of_measure: "Unit",
    min_order_qty: 5,
    warranty_period: "2 Years",
    image_256: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=600&q=80",
    image_1920: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 5,
    name: "SterilMax Autoclave Sterilizer",
    list_price: 18500.0,
    description_sale: "Class B steam sterilizer with vacuum pump and built-in micro-printer for sterilization cycles logging.",
    categ_id: [13, "Sterilization"],
    certification_info: "EN 13060 Standard, CE Certified",
    unit_of_measure: "Unit",
    min_order_qty: 1,
    warranty_period: "1 Year",
    image_256: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80",
    image_1920: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80",
  },
];
