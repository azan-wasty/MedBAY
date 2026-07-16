import "./globals.css";
import Navbar from "../components/Navbar";
import { BRAND_CONFIG } from "../lib/constants";

export const metadata = {
  title: BRAND_CONFIG.name,
  description: BRAND_CONFIG.slogan,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="main-wrapper">
          <Navbar />
          <main style={{ flex: 1 }}>{children}</main>
          <footer className="footer">
            <div className="container footer-layout">
              <div>
                <h4 className="footer-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  {BRAND_CONFIG.name}
                </h4>
                <p style={{ maxWidth: "350px", lineHeight: "1.5" }}>{BRAND_CONFIG.slogan}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <h5 style={{ color: "#fff", marginBottom: "0.25rem", fontWeight: 500, fontSize: "0.875rem" }}>Contact Procurement</h5>
                <p>Email: {BRAND_CONFIG.contactEmail}</p>
                <p>Phone: {BRAND_CONFIG.phone}</p>
                <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>{BRAND_CONFIG.address}</p>
              </div>
              <div className="footer-copy">
                <p>&copy; {new Date().getFullYear()} {BRAND_CONFIG.name}. All Rights Reserved.</p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
