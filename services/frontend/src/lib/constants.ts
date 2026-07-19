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
  { label: "Returns", path: "/returns" },
  { label: "Admin", path: "/admin" },
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
  outOfStockLabel: "Out of Stock",
  outOfStockTooltip: "This item is currently out of stock and cannot be added to an RFQ.",
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

export const STOCK_STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  in_stock: { label: "In Stock", bg: "#d1fae5", text: "#065f46" },
  low_stock: { label: "Low Stock", bg: "#fef3c7", text: "#92400e" },
  out_of_stock: { label: "Out of Stock", bg: "#fee2e2", text: "#991b1b" },
  not_tracked: { label: "Not Tracked", bg: "#f1f5f9", text: "#64748b" },
};

export const RETURN_STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: "Draft", bg: "#f1f5f9", text: "#475569" },
  requested: { label: "Under Review", bg: "#fef3c7", text: "#92400e" },
  approved: { label: "Approved", bg: "#dbeafe", text: "#1d4ed8" },
  rejected: { label: "Rejected", bg: "#fee2e2", text: "#991b1b" },
  refunded: { label: "Refunded", bg: "#d1fae5", text: "#065f46" },
  replaced: { label: "Replacement Sent", bg: "#d1fae5", text: "#065f46" },
  done: { label: "Completed", bg: "#e0f2fe", text: "#075985" },
  cancelled: { label: "Cancelled", bg: "#f1f5f9", text: "#64748b" },
};

export const COMPANY_STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: "Pending Review", bg: "#fef3c7", text: "#92400e" },
  verified: { label: "Verified", bg: "#d1fae5", text: "#065f46" },
  rejected: { label: "Rejected", bg: "#fee2e2", text: "#991b1b" },
};

export const RETURNS_LABELS = {
  title: "Product Returns",
  subtitle: "Request a refund or replacement for equipment from a completed order.",
  formTitle: "Submit a Return Request",
  orderLabel: "Select Order",
  orderPlaceholder: "Choose an ordered item...",
  productLabel: "Product",
  quantityLabel: "Quantity to Return",
  typeLabel: "Requested Resolution",
  refundOption: "Refund",
  replacementOption: "Replacement",
  reasonLabel: "Reason for Return",
  reasonPlaceholder: "Select a reason...",
  loadingReasons: "Loading return reasons...",
  reasonsError: "Unable to load return reasons. Please try again.",
  reasonDetailLabel: "Additional Details (Optional)",
  reasonDetailPlaceholder: "Describe the issue (defect, damage, wrong item, etc.)",
  submitButton: "Submit Return Request",
  submitting: "Submitting...",
  noEligibleOrders: "You don't have any confirmed orders eligible for a return yet.",
  historyTitle: "Your Return Requests",
  noReturns: "No return requests yet.",
  tableName: "Reference",
  tableProduct: "Product",
  tableQty: "Qty",
  tableReason: "Reason",
  tableType: "Resolution",
  tableStatus: "Status",
  tableDate: "Requested",
};

export const ADMIN_RETURNS_LABELS = {
  filterAll: "All",
  filterUnderReview: "Under Review",
  filterApproved: "Approved",
  filterRejected: "Rejected",
  noReturns: "No return requests match this filter.",
  tableRef: "Reference",
  tableOrder: "Order",
  tableCompany: "Company",
  tableProduct: "Product",
  tableReason: "Reason",
  tableType: "Resolution",
  tableStatus: "Status",
  tableDate: "Requested",
  approveButton: "Approve",
  rejectButton: "Reject",
};

export const REVIEW_LABELS = {
  sectionTitle: "Rate This Order",
  alreadyReviewed: "You've already submitted a review for this order.",
  ratingLabel: "Your Rating",
  reviewTextLabel: "Your Review (Optional)",
  reviewTextPlaceholder: "Share your experience with this equipment and supplier...",
  submitButton: "Submit Review",
  submitting: "Submitting...",
  successMsg: "Thank you — your review has been submitted.",
};

// Buyer-facing order journey. Mirrors medical_marketplace.order_stages in the
// Odoo addon (services/odoo/addons/medical_marketplace/data/config_params.xml)
// exactly — these are the "key" values the backend's _compute_buyer_stage()
// can return. The five below are the linear happy-path steps rendered as a
// stepper; return_requested/cancelled are branch states shown as a banner.
export const ORDER_STAGE_KEYS = ["ordered", "processing", "out_for_delivery", "delivered", "completed"];

export const BUYER_STAGE_MAP: Record<string, { label: string; bg: string; text: string }> = {
  return_requested: { label: "Return Requested", bg: "#fef3c7", text: "#92400e" },
  cancelled: { label: "Cancelled", bg: "#fee2e2", text: "#991b1b" },
};

export const TRACKING_LABELS = {
  title: "Shipping & Invoice Status",
  showButton: "Track Order",
  hideButton: "Hide Tracking",
  pickingsTitle: "Shipments",
  invoicesTitle: "Invoices",
  noPickings: "No shipments have been created for this order yet.",
  noInvoices: "No invoices have been generated for this order yet.",
  scheduledLabel: "Scheduled",
  doneLabel: "Completed",
  carrierLabel: "Carrier",
  trackingRefLabel: "Tracking Ref.",
  trackingLinkLabel: "(Track Shipment)",
};

export const ADMIN_COMPANIES_LABELS = {
  title: "Company Verification",
  subtitle: "Review and approve B2B buyer organizations before they can submit RFQs.",
  filterAll: "All",
  filterPending: "Pending",
  filterVerified: "Verified",
  filterRejected: "Rejected",
  noCompanies: "No companies match this filter.",
  tableName: "Company",
  tableEmail: "Email",
  tableReg: "Registration No.",
  tableStatus: "Status",
  tableDate: "Registered",
  verifyButton: "Verify",
  rejectButton: "Reject",
  rejectModalTitle: "Reject Company Verification",
  rejectReasonLabel: "Reason (visible to internal notes)",
  confirmReject: "Confirm Rejection",
  forbiddenTitle: "Admin Access Required",
  forbiddenMsg: "You must be a marketplace admin to view this page.",
};

// ---------------------------------------------------------------------------
// Marketing / homepage content — new for the v2 redesign. Kept alongside the
// rest of the site copy so every string on the site still lives in one file.
// ---------------------------------------------------------------------------

export const HERO_CONTENT = {
  eyebrow: "Verified B2B Medical Equipment Marketplace",
  headline: "Procure medical equipment with total confidence.",
  subheadline:
    "MedBAY connects hospitals, clinics, and distributors with verified suppliers — transparent bulk pricing, compliant sourcing, and RFQ-based procurement in one enterprise marketplace.",
  primaryCta: "Browse Catalog",
  secondaryCta: "How Sourcing Works",
  trustChips: ["FDA & CE compliant catalog", "RFQ-based bulk pricing", "Verified supplier network"],
};

export const TRUST_STATS = [
  { value: "1,200+", label: "Verified Suppliers" },
  { value: "45K+", label: "SKUs Listed" },
  { value: "120+", label: "Countries Served" },
  { value: "98%", label: "On-Time Fulfillment" },
];

// Icon is a lucide-react component name, resolved via the ICON_MAP lookup in
// components/home/CategoriesGrid.tsx. Categories mirror the taxonomy already
// present in MOCK_PRODUCTS below.
export const CATEGORY_SHOWCASE = [
  { name: "Diagnostic Imaging", icon: "ScanLine", description: "MRI, CT, ultrasound & X-ray systems from certified manufacturers." },
  { name: "Life Support", icon: "HeartPulse", description: "Ventilators, defibrillators & critical care monitoring equipment." },
  { name: "Operating Room", icon: "Syringe", description: "Surgical lighting, instruments & OR-grade equipment." },
  { name: "Sterilization", icon: "FlaskConical", description: "Autoclaves and sterile processing systems for compliant facilities." },
  { name: "PPE & Consumables", icon: "Boxes", description: "Bulk gloves, masks, and single-use clinical consumables." },
];

export const BENEFITS_CONTENT = [
  {
    icon: "BadgeCheck",
    title: "Verified Supplier Network",
    description:
      "Every organization completes a registration and compliance review before they can transact — so you always know who you're buying from.",
  },
  {
    icon: "ClipboardList",
    title: "Transparent RFQ Workflow",
    description:
      "Request formal quotes on bulk orders, negotiate on your terms, and track every RFQ from draft to fulfillment.",
  },
  {
    icon: "Truck",
    title: "End-to-End Order Tracking",
    description:
      "Follow every shipment from confirmation to delivery, with carrier tracking and invoice status in one dashboard.",
  },
  {
    icon: "RotateCcw",
    title: "Hassle-Free Returns",
    description: "Request a refund or replacement directly from your order history — no phone calls, no runaround.",
  },
];

export const TESTIMONIALS = [
  {
    quote:
      "MedBAY cut our capital equipment sourcing cycle from weeks to days. The RFQ workflow alone justified the switch.",
    name: "Sarah Whitfield",
    role: "Director of Procurement",
    org: "Regional Hospital Network",
  },
  {
    quote:
      "Every supplier we've transacted with has been pre-verified. For a distributor handling seven-figure equipment orders, that trust is everything.",
    name: "Marcus Chen",
    role: "VP of Supply Chain",
    org: "National Diagnostics Group",
  },
  {
    quote:
      "Order tracking and returns used to mean phone tag with three different vendors. Now it's a single dashboard.",
    name: "Priya Nair",
    role: "Procurement Lead",
    org: "MedSupply Distributors",
  },
];

export const FAQ_ITEMS = [
  {
    q: "How do I request a quote for bulk equipment?",
    a: "Add any item to your RFQ cart from the catalog, adjust quantities, and submit — our team reviews it and returns a formal quotation, viewable from your dashboard.",
  },
  {
    q: "How are suppliers verified on MedBAY?",
    a: "Every supplier organization submits registration and licensing details, which our marketplace admin team reviews before the account is approved to list or fulfill orders.",
  },
  {
    q: "What happens after my order ships?",
    a: "Track shipping and invoice status in real time from your dashboard, including carrier and tracking reference numbers once a shipment is dispatched.",
  },
  {
    q: "Can I return or replace equipment after delivery?",
    a: "Yes — submit a return request directly from an eligible completed order, choose refund or replacement, and our team will review it.",
  },
  {
    q: "Is there a minimum order requirement?",
    a: "Minimum order quantities vary by product and are listed on every product page and catalog card, reflecting each supplier's fulfillment requirements.",
  },
  {
    q: "Do you support international procurement?",
    a: "MedBAY works with suppliers and buyers across multiple regions; compliance certifications (FDA, CE, ISO) are listed on each product to support cross-border sourcing decisions.",
  },
];

// High-quality mock catalog data used as a fallback if Odoo has no records.
// Shaped to match the current Product/AttributeLine/ProductVariant types in
// odooClient.ts. Mock attribute/value ids use a 9000+ range so they can
// never collide with real Odoo-assigned ids.
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
    vendor_id: [9101, "Aura Medical Systems"] as [number, string],
    stock_status: "in_stock" as const,
    low_stock_threshold: 2,
    qty_available: 4,
    attribute_line_ids: [] as number[],
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
    vendor_id: [9102, "Medisurge Corp."] as [number, string],
    stock_status: "low_stock" as const,
    low_stock_threshold: 5,
    qty_available: 3,
    attribute_line_ids: [] as number[],
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
    vendor_id: [9103, "SurgiPath Instruments"] as [number, string],
    stock_status: "out_of_stock" as const,
    low_stock_threshold: 3,
    qty_available: 0,
    attribute_line_ids: [] as number[],
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
    vendor_id: [9104, "HeartSync Medical"] as [number, string],
    stock_status: "in_stock" as const,
    low_stock_threshold: 10,
    qty_available: 28,
    attribute_line_ids: [] as number[],
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
    vendor_id: [9105, "SterilMax Inc."] as [number, string],
    stock_status: "in_stock" as const,
    low_stock_threshold: 3,
    qty_available: 9,
    attribute_line_ids: [] as number[],
  },
  // The two products below have real attribute_lines/variants, unlike the
  // capital-equipment items above — included specifically so the mock
  // fallback path can exercise the variant-selection UI too, not just the
  // live Odoo path.
  {
    id: 6,
    name: "MedGuard Nitrile Examination Gloves",
    list_price: 18.5,
    description_sale: "Powder-free nitrile examination gloves with textured fingertips for superior grip. Latex-free, suitable for sensitive-skin use.",
    categ_id: [14, "PPE & Consumables"],
    certification_info: "FDA 510(k) Cleared, ASTM D6319",
    unit_of_measure: "Box",
    min_order_qty: 10,
    warranty_period: "N/A",
    image_256: "https://images.unsplash.com/photo-1584744982491-665216d95f8b?auto=format&fit=crop&w=600&q=80",
    image_1920: "https://images.unsplash.com/photo-1584744982491-665216d95f8b?auto=format&fit=crop&w=1200&q=80",
    vendor_id: [9106, "MedGuard Supplies Ltd."] as [number, string],
    stock_status: "in_stock" as const,
    low_stock_threshold: 100,
    qty_available: 2280,
    attribute_line_ids: [9001, 9004],
    attribute_lines: [
      {
        attribute_id: 9001,
        attribute_name: "Size",
        display_type: "radio",
        values: [
          { id: 9011, name: "Small", html_color: false as const },
          { id: 9012, name: "Medium", html_color: false as const },
          { id: 9013, name: "Large", html_color: false as const },
          { id: 9014, name: "X-Large", html_color: false as const },
        ],
      },
      {
        attribute_id: 9004,
        attribute_name: "Sterility",
        display_type: "radio",
        values: [
          { id: 9041, name: "Sterile", html_color: false as const },
          { id: 9042, name: "Non-Sterile", html_color: false as const },
        ],
      },
    ],
    variants: [
      { id: 96001, price: 18.5, qty_available: 500, active: true, combination: [{ attribute_id: 9001, attribute_name: "Size", value_id: 9011, value_name: "Small" }, { attribute_id: 9004, attribute_name: "Sterility", value_id: 9041, value_name: "Sterile" }] },
      { id: 96002, price: 21.0, qty_available: 300, active: true, combination: [{ attribute_id: 9001, attribute_name: "Size", value_id: 9011, value_name: "Small" }, { attribute_id: 9004, attribute_name: "Sterility", value_id: 9042, value_name: "Non-Sterile" }] },
      { id: 96003, price: 18.5, qty_available: 620, active: true, combination: [{ attribute_id: 9001, attribute_name: "Size", value_id: 9012, value_name: "Medium" }, { attribute_id: 9004, attribute_name: "Sterility", value_id: 9041, value_name: "Sterile" }] },
      { id: 96004, price: 21.0, qty_available: 90, active: true, combination: [{ attribute_id: 9001, attribute_name: "Size", value_id: 9012, value_name: "Medium" }, { attribute_id: 9004, attribute_name: "Sterility", value_id: 9042, value_name: "Non-Sterile" }] },
      { id: 96005, price: 18.5, qty_available: 400, active: true, combination: [{ attribute_id: 9001, attribute_name: "Size", value_id: 9013, value_name: "Large" }, { attribute_id: 9004, attribute_name: "Sterility", value_id: 9041, value_name: "Sterile" }] },
      { id: 96006, price: 21.0, qty_available: 0, active: true, combination: [{ attribute_id: 9001, attribute_name: "Size", value_id: 9013, value_name: "Large" }, { attribute_id: 9004, attribute_name: "Sterility", value_id: 9042, value_name: "Non-Sterile" }] },
      { id: 96007, price: 19.75, qty_available: 220, active: true, combination: [{ attribute_id: 9001, attribute_name: "Size", value_id: 9014, value_name: "X-Large" }, { attribute_id: 9004, attribute_name: "Sterility", value_id: 9041, value_name: "Sterile" }] },
      { id: 96008, price: 22.25, qty_available: 60, active: true, combination: [{ attribute_id: 9001, attribute_name: "Size", value_id: 9014, value_name: "X-Large" }, { attribute_id: 9004, attribute_name: "Sterility", value_id: 9042, value_name: "Non-Sterile" }] },
    ],
  },
  {
    id: 7,
    name: "ProCare Surgical Face Masks",
    list_price: 15.99,
    description_sale: "ASTM Level 3 surgical face masks with adjustable nose bridge and triple-layer filtration for high fluid-resistance environments.",
    categ_id: [14, "PPE & Consumables"],
    certification_info: "ASTM F2100 Level 3, FDA Cleared",
    unit_of_measure: "Pack",
    min_order_qty: 5,
    warranty_period: "N/A",
    image_256: "https://images.unsplash.com/photo-1584634731339-252c581abfc5?auto=format&fit=crop&w=600&q=80",
    image_1920: "https://images.unsplash.com/photo-1584634731339-252c581abfc5?auto=format&fit=crop&w=1200&q=80",
    vendor_id: [9107, "ProCare Health Products"] as [number, string],
    stock_status: "in_stock" as const,
    low_stock_threshold: 50,
    qty_available: 1840,
    attribute_line_ids: [9003, 9002],
    attribute_lines: [
      {
        attribute_id: 9003,
        attribute_name: "Color",
        display_type: "color",
        values: [
          { id: 9031, name: "White", html_color: "#FFFFFF" },
          { id: 9032, name: "Blue", html_color: "#2E86DE" },
          { id: 9033, name: "Black", html_color: "#000000" },
        ],
      },
      {
        attribute_id: 9002,
        attribute_name: "Pack Size",
        display_type: "radio",
        values: [
          { id: 9021, name: "Single Unit", html_color: false as const },
          { id: 9022, name: "Pack of 10", html_color: false as const },
          { id: 9023, name: "Pack of 50", html_color: false as const },
          { id: 9024, name: "Pack of 100", html_color: false as const },
        ],
      },
    ],
    variants: [
      { id: 97001, price: 1.99, qty_available: 400, active: true, combination: [{ attribute_id: 9003, attribute_name: "Color", value_id: 9031, value_name: "White" }, { attribute_id: 9002, attribute_name: "Pack Size", value_id: 9021, value_name: "Single Unit" }] },
      { id: 97002, price: 15.99, qty_available: 300, active: true, combination: [{ attribute_id: 9003, attribute_name: "Color", value_id: 9031, value_name: "White" }, { attribute_id: 9002, attribute_name: "Pack Size", value_id: 9022, value_name: "Pack of 10" }] },
      { id: 97003, price: 69.99, qty_available: 120, active: true, combination: [{ attribute_id: 9003, attribute_name: "Color", value_id: 9031, value_name: "White" }, { attribute_id: 9002, attribute_name: "Pack Size", value_id: 9023, value_name: "Pack of 50" }] },
      { id: 97004, price: 119.99, qty_available: 40, active: true, combination: [{ attribute_id: 9003, attribute_name: "Color", value_id: 9031, value_name: "White" }, { attribute_id: 9002, attribute_name: "Pack Size", value_id: 9024, value_name: "Pack of 100" }] },
      { id: 97005, price: 1.99, qty_available: 380, active: true, combination: [{ attribute_id: 9003, attribute_name: "Color", value_id: 9032, value_name: "Blue" }, { attribute_id: 9002, attribute_name: "Pack Size", value_id: 9021, value_name: "Single Unit" }] },
      { id: 97006, price: 15.99, qty_available: 260, active: true, combination: [{ attribute_id: 9003, attribute_name: "Color", value_id: 9032, value_name: "Blue" }, { attribute_id: 9002, attribute_name: "Pack Size", value_id: 9022, value_name: "Pack of 10" }] },
      { id: 97007, price: 69.99, qty_available: 35, active: true, combination: [{ attribute_id: 9003, attribute_name: "Color", value_id: 9032, value_name: "Blue" }, { attribute_id: 9002, attribute_name: "Pack Size", value_id: 9023, value_name: "Pack of 50" }] },
      { id: 97008, price: 119.99, qty_available: 0, active: true, combination: [{ attribute_id: 9003, attribute_name: "Color", value_id: 9032, value_name: "Blue" }, { attribute_id: 9002, attribute_name: "Pack Size", value_id: 9024, value_name: "Pack of 100" }] },
      { id: 97009, price: 2.49, qty_available: 300, active: true, combination: [{ attribute_id: 9003, attribute_name: "Color", value_id: 9033, value_name: "Black" }, { attribute_id: 9002, attribute_name: "Pack Size", value_id: 9021, value_name: "Single Unit" }] },
      { id: 97010, price: 17.99, qty_available: 190, active: true, combination: [{ attribute_id: 9003, attribute_name: "Color", value_id: 9033, value_name: "Black" }, { attribute_id: 9002, attribute_name: "Pack Size", value_id: 9022, value_name: "Pack of 10" }] },
      { id: 97011, price: 74.99, qty_available: 55, active: true, combination: [{ attribute_id: 9003, attribute_name: "Color", value_id: 9033, value_name: "Black" }, { attribute_id: 9002, attribute_name: "Pack Size", value_id: 9023, value_name: "Pack of 50" }] },
      { id: 97012, price: 129.99, qty_available: 15, active: true, combination: [{ attribute_id: 9003, attribute_name: "Color", value_id: 9033, value_name: "Black" }, { attribute_id: 9002, attribute_name: "Pack Size", value_id: 9024, value_name: "Pack of 100" }] },
    ],
  },
];
// Supplier showcase for the homepage "Trusted Suppliers" section — derived
// directly from the vendors already present in MOCK_PRODUCTS rather than
// invented separately, so it never drifts from the real catalog data.
export const SUPPLIER_SHOWCASE = Array.from(
  new Map(
    MOCK_PRODUCTS.map((p) => [
      p.vendor_id[1],
      { name: p.vendor_id[1], category: p.categ_id[1], certification: p.certification_info },
    ])
  ).values()
);
