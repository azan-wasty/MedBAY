// ---------------------------------------------------------------------------
// Legal content data file
// Edit text here — layout/modal code does not need to change.
// ---------------------------------------------------------------------------

export type LegalSection = {
  heading: string;
  body: string;
};

export type LegalDocId = "terms" | "privacy" | "compliance";

export interface LegalDoc {
  id: LegalDocId;
  title: string;
  effectiveDate: string;
  sections: LegalSection[];
}

export const LEGAL_CONTENT: Record<LegalDocId, LegalDoc> = {
  // ── Terms of Service ──────────────────────────────────────────────────────
  terms: {
    id: "terms",
    title: "Terms of Service",
    effectiveDate: "1 August 2026",
    sections: [
      {
        heading: "Who Can Use MedBAY",
        body: "MedBAY is a B2B platform for verified healthcare buyers and medical equipment suppliers. By creating an account you confirm that you are a registered business or healthcare institution operating in accordance with the regulations of your jurisdiction. We reserve the right to suspend access if account information is found to be inaccurate.",
      },
      {
        heading: "Buyer & Supplier Responsibilities",
        body: "Buyers are responsible for verifying that purchased equipment is appropriate and approved for their intended clinical setting. Suppliers are responsible for the accuracy of all product listings, including certifications, availability, and pricing. MedBAY acts as an intermediary marketplace and does not take ownership of goods at any point.",
      },
      {
        heading: "RFQ and Bulk Order Process",
        body: "Prices displayed are indicative list prices. Final pricing for bulk and enterprise orders is agreed between buyer and supplier during the RFQ (Request for Quotation) process. MedBAY does not guarantee availability or price until a formal purchase order is confirmed by both parties.",
      },
      {
        heading: "Listings and Intellectual Property",
        body: "Suppliers grant MedBAY a non-exclusive licence to display product information, images, and specifications for the purpose of operating the marketplace. All product data remains the property of the supplier. MedBAY's platform design, branding, and technology remain our intellectual property.",
      },
      {
        heading: "Limitation of Liability",
        body: "MedBAY is not liable for product defects, regulatory non-compliance of listed equipment, or losses arising from failed transactions between buyers and suppliers. Our liability is limited to the value of any platform fees paid in the 30 days preceding a dispute.",
      },
    ],
  },

  // ── Privacy Policy ────────────────────────────────────────────────────────
  privacy: {
    id: "privacy",
    title: "Privacy Policy",
    effectiveDate: "1 August 2026",
    sections: [
      {
        heading: "What Data We Collect",
        body: "We collect business registration details, contact information, and account credentials when you sign up. During platform use, we collect procurement activity — searches, RFQ submissions, order history — and standard web usage data such as browser type, page visits, and session duration.",
      },
      {
        heading: "How We Use Your Data",
        body: "Your data is used to operate and improve the MedBAY platform — including matching buyers with relevant suppliers, processing RFQ requests, running compliance checks on listed equipment, and generating anonymised analytics to improve the service.",
      },
      {
        heading: "Who We Share Data With",
        body: "We share relevant buyer details with suppliers only when you submit an RFQ or initiate a purchase. We do not sell or rent personal or business data to third parties. We may share aggregated, anonymised market data with partners for research purposes.",
      },
      {
        heading: "Data Retention & Your Rights",
        body: "Account data is retained for the duration of your account plus 7 years for financial record-keeping. You may request access to, correction of, or deletion of your data at any time. Requests will be processed within 30 days, subject to our legal retention obligations.",
      },
      {
        heading: "Contact for Data Requests",
        body: "For data access, correction, or deletion requests — or for any privacy-related questions — contact our data protection team at privacy@medbay.io. For urgent compliance queries, use the procurement contact listed in the footer.",
      },
    ],
  },

  // ── Compliance ────────────────────────────────────────────────────────────
  compliance: {
    id: "compliance",
    title: "Compliance",
    effectiveDate: "1 August 2026",
    sections: [
      {
        heading: "Equipment Certification Requirements",
        body: "All medical equipment listed on MedBAY must hold valid certifications applicable in the target market — such as CE marking for the European Economic Area, FDA clearance for the United States, or equivalent national regulatory approvals. Suppliers are required to upload proof of certification during onboarding and keep this documentation current.",
      },
      {
        heading: "Supplier Verification Process",
        body: "Every supplier undergoes an identity and documentation check before listings go live. This includes business registration verification, quality management system review (ISO 13485 where applicable), and confirmation of regulatory licences. MedBAY re-verifies supplier standing annually.",
      },
      {
        heading: "Regulatory Responsibility",
        body: "Buyers are responsible for ensuring that equipment they purchase meets the regulatory requirements of their country and clinical setting. Suppliers are responsible for the accuracy of certification claims and for notifying MedBAY immediately of any regulatory alerts, recalls, or changes in certification status.",
      },
      {
        heading: "Prohibited Listings",
        body: "Equipment that lacks required regulatory approvals, counterfeit or grey-market goods, recalled devices, and single-use items marketed for reuse are all prohibited on MedBAY. Listings in violation will be removed immediately and the supplier account placed under review.",
      },
      {
        heading: "Reporting Non-Compliant Listings",
        body: "If you identify a listing that appears to breach certification or safety requirements, use the 'Report listing' function on the product page or contact compliance@medbay.io. We investigate all reports within 48 business hours.",
      },
    ],
  },
};
