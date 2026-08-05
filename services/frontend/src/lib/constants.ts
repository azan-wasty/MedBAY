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
  draft: { label: "Under Review", bg: "#fef3c7", text: "#92400e" },
  sent: { label: "Quoted (Awaiting Buyer)", bg: "#dbeafe", text: "#1d4ed8" },
  sale: { label: "Confirmed", bg: "#d1fae5", text: "#065f46" },
  done: { label: "Completed", bg: "#e0f2fe", text: "#075985" },
  cancel: { label: "Rejected by Buyer", bg: "#fee2e2", text: "#991b1b" },
};
// Tailwind-class-based status styling for the admin dashboard's "Recent Activity"
// feed, which mixes rfq/company/return activity items under one status badge.
export const QUOTATION_STATE_STYLES: Record<string, string> = {
  draft: "bg-amber-50 text-amber-800",
  sent: "bg-blue-50 text-blue-700",
  sale: "bg-emerald-50 text-emerald-700",
  done: "bg-sky-50 text-sky-700",
  cancel: "bg-red-50 text-red-700",
  pending: "bg-amber-50 text-amber-800",
  verified: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
  requested: "bg-amber-50 text-amber-800",
  approved: "bg-blue-50 text-blue-700",
  refunded: "bg-emerald-50 text-emerald-700",
  replaced: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-ink-50 text-ink-600",
};

export const QUOTATION_STATE_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Quoted",
  sale: "Confirmed",
  done: "Completed",
  cancel: "Cancelled",
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
  requested: "Requested",
  approved: "Approved",
  refunded: "Refunded",
  replaced: "Replaced",
  cancelled: "Cancelled",
};
export const RFQ_NEGOTIATION_LABELS = {
  approveBtn: "Approve & Order",
  counterBtn: "Counter Offer",
  rejectBtn: "Reject Quote",
  rejectionModalTitle: "Reject Quotation",
  rejectionReasonPlaceholder: "Optional reason for rejection (e.g. price above budget, timeline too long)...",
  confirmRejectBtn: "Confirm Rejection",
  counterModalTitle: "Submit Counter Offer",
  counterInstructions: "Propose new target prices per unit for the supplier to review.",
  submitCounterBtn: "Submit Counter Offer",
  rejectionBannerTitle: "Quotation Rejected",
  counterBannerTitle: "Counter Offer Submitted",
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
export const ADMIN_OVERVIEW_LABELS = {
  title: "Marketplace Overview",
  subtitle: "A live snapshot across suppliers, returns, and fulfillment.",
  totalCompanies: "Total Companies",
  pendingReview: "pending review",
  verifiedSuppliers: "Verified Suppliers",
  ofTotal: "of total",
  activeReturns: "Active Returns",
  awaitingAction: "awaiting action",
  awaitingShipment: "Awaiting Shipment",
  ordersConfirmed: "confirmed orders",
  totalEarnings: "Total Earnings",
  allTimeRevenue: "All-time revenue",
  itemsSold: "Items Sold",
  unitsAcrossOrders: "Units across orders",
  avgOrderValue: "Avg Order Value",
  perConfirmedOrder: "Per confirmed order",
  pipelineValue: "Pipeline Value",
  quotesAwaitingConfirmation: "quotes awaiting confirmation",
  revenueChartTitle: "Revenue Over Time",
  noRevenueData: "No revenue data available.",
  latestQuotationsTitle: "Latest Quotations",
  topProductsTitle: "Top Products",
  noQuotationData: "No quotations yet.",
  noTopProductData: "No sales recorded yet.",
  viewAll: "View all",
  quotationCompanyHeader: "Company",
  quotationAmountHeader: "Actual Price",
  quotationRequestedHeader: "Requested Price",
  quotationStatusHeader: "Status",
  quotationDateHeader: "Date",
  topProductNameHeader: "Product",
  topProductQtyHeader: "Units sold",
  topProductRevenueHeader: "Revenue",
};
export const BUYER_OVERVIEW_LABELS = {
  title: "Procurement & RFQ Insights",
  subtitle: "A real-time overview of your requested quotations, active orders, and procurement volume.",
  totalRfqs: "Total RFQs Submitted",
  readyForApproval: "Action Required",
  quotesToApprove: "quotes awaiting your approval",
  confirmedOrders: "Confirmed Orders",
  activeProcurement: "in fulfillment pipeline",
  totalSpend: "Total Quoted Value",
  statusChartTitle: "RFQ Status Breakdown",
  spendChartTitle: "Order Value History ($)",
  quickActionsTitle: "Procurement Shortcuts",
  noRfqData: "No quotation history available.",
  noSpendData: "No spend history available.",
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
  { name: "Diagnostic Equipment", icon: "Activity", description: "Stethoscopes, BP monitors, thermometers & blood oximeters." },
  { name: "Hospital Furniture", icon: "BedDouble", description: "Hydraulic tables, electric beds, wheelchairs & IV stands." },
  { name: "PPE & Consumables", icon: "Boxes", description: "Bulk nitrile gloves, surgical masks, syringes & sanitizers." },
  { name: "Surgical Instruments", icon: "Syringe", description: "Scalpels, forceps, needle holders & surgical kits." },
  { name: "Imaging & Lab Equipment", icon: "ScanLine", description: "Ultrasound machines, centrifuges, microscopes & analyzers." },
  { name: "Home Care Equipment", icon: "HeartPulse", description: "Nebulizers, walkers, oxygen concentrators & rollators." },
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

export const FILTER_LABELS = {
  // Sidebar
  sidebarTitle: "Filters",
  clearAll: "Clear all",
  apply: "Apply Filters",
  showFilters: "Filters",
  hideFilters: "Hide Filters",
  resultCount: (shown: number, total: number) =>
    shown === total ? `${total} products` : `Showing ${shown} of ${total} products`,

  // Section headings
  categorySection: "Category",
  priceSection: "Price Range",
  vendorSection: "Brand / Supplier",
  availabilitySection: "Availability",
  sortSection: "Sort By",

  // Price
  minPrice: "Min",
  maxPrice: "Max",
  priceAny: "Any",

  // Availability options (must match stock_status values in Odoo)
  stockInStock: "In Stock",
  stockLowStock: "Low Stock",
  stockOutOfStock: "Out of Stock",

  // Active chips
  activeFiltersLabel: "Active filters:",
  removeFilter: "Remove filter",
};

export const SORT_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "name_asc", label: "Name: A → Z" },
  { value: "name_desc", label: "Name: Z → A" },
  { value: "newest", label: "Newest First" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

// High-quality mock catalog data used as a fallback if Odoo has no records.
// Shaped to match the current Product/AttributeLine/ProductVariant types in
// odooClient.ts. Mock attribute/value ids use a 9000+ range, and mock
// product ids use a 900000+ range, so neither can ever collide with
// real Odoo-assigned ids (which start at 1). This makes it safe to blend
// mock products alongside live Odoo results (e.g. the homepage featured
// rail) instead of only using one source or the other.
export const MOCK_PRODUCTS = [
  {
    id: 900001,
    name: "AuraScan MRI Machine - 3T",
    list_price: 1250000.0,
    description_sale: "State-of-the-art 3 Tesla MRI scanner offering high-resolution clinical imaging with advanced noise-canceling technology.",
    categ_id: [10, "Imaging & Lab Equipment"],
    certification_info: "FDA Approved, CE Certified, ISO 13485",
    unit_of_measure: "Unit",
    min_order_qty: 1,
    warranty_period: "3 Years",
    image_256: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80",
    image_1920: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80",
    vendor_id: [9101, "Aura Medical Systems"] as [number, string],
    stock_status: "in_stock" as const,
    low_stock_threshold: 2,
    marketplace_published: true,
    marketplace_featured: true,
    featured_sequence: 1,
    attribute_line_ids: [] as number[],
  },
  {
    id: 900002,
    name: "Medisurge ICU Ventilator - V2",
    list_price: 45000.0,
    description_sale: "Critical care ventilator suitable for pediatric and adult patients. Supports invasive and non-invasive ventilation modes.",
    categ_id: [11, "Home Care Equipment"],
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
    marketplace_published: true,
    marketplace_featured: true,
    featured_sequence: 2,
    attribute_line_ids: [] as number[],
  },
  {
    id: 900003,
    name: "SurgiPath Surgical Lighting System",
    list_price: 12500.0,
    description_sale: "High-intensity LED surgical light head with customizable light diameter and color temperature adjustments.",
    categ_id: [12, "Surgical Instruments"],
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
    id: 900004,
    name: "HeartSync Defibrillator - Pro",
    list_price: 7800.0,
    description_sale: "Biphasic automated external defibrillator (AED) and manual monitor with pacing, SpO2, and ECG display.",
    categ_id: [11, "Home Care Equipment"],
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
    id: 900005,
    name: "SterilMax Autoclave Sterilizer",
    list_price: 18500.0,
    description_sale: "Class B steam sterilizer with vacuum pump and built-in micro-printer for sterilization cycles logging.",
    categ_id: [13, "Diagnostic Equipment"],
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
    id: 900006,
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
    id: 900007,
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

// Bulk-pricing tiers for mock products, keyed by mock product id (900000+
// range — see MOCK_PRODUCTS above). Mirrors the shape the live Odoo
// /api/products/<id>/pricing endpoint derives from product.pricelist.item
// records: a quantity threshold plus a discount percentage off list_price.
// Only the tier shape is stored here — the actual price at each tier is
// computed from the product's own list_price at request time (see
// app/api/products/[id]/pricing/route.ts), so there's a single source of
// truth and the two numbers can't drift out of sync.
export const MOCK_PRICING_TIERS: Record<
  number,
  { min_qty: number; discount_pct: number }[]
> = {
  900001: [
    { min_qty: 1, discount_pct: 0 },
    { min_qty: 3, discount_pct: 5 },
    { min_qty: 5, discount_pct: 10 },
  ],
  900002: [
    { min_qty: 2, discount_pct: 0 },
    { min_qty: 5, discount_pct: 6 },
    { min_qty: 10, discount_pct: 12 },
  ],
  900003: [
    { min_qty: 1, discount_pct: 0 },
    { min_qty: 5, discount_pct: 8 },
    { min_qty: 10, discount_pct: 15 },
  ],
  900004: [
    { min_qty: 5, discount_pct: 0 },
    { min_qty: 10, discount_pct: 7 },
    { min_qty: 25, discount_pct: 15 },
  ],
  900005: [
    { min_qty: 1, discount_pct: 0 },
    { min_qty: 3, discount_pct: 5 },
    { min_qty: 6, discount_pct: 10 },
  ],
  900006: [
    { min_qty: 10, discount_pct: 0 },
    { min_qty: 50, discount_pct: 10 },
    { min_qty: 200, discount_pct: 20 },
  ],
  900007: [
    { min_qty: 5, discount_pct: 0 },
    { min_qty: 25, discount_pct: 12 },
    { min_qty: 100, discount_pct: 22 },
  ],
};

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