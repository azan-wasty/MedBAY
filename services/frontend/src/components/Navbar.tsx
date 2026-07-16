'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { BRAND_CONFIG, NAV_LINKS } from '../lib/constants';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const headerRef = useRef<HTMLElement>(null);

  // Sync state with localStorage
  useEffect(() => {
    const checkAuthAndCart = () => {
      // 1. Get User
      const storedUser = localStorage.getItem('med_user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }

      // 2. Get Cart
      const storedCart = localStorage.getItem('med_cart');
      if (storedCart) {
        try {
          const items = JSON.parse(storedCart);
          setCartCount(Array.isArray(items) ? items.reduce((acc: number, curr: any) => acc + (curr.quantity || 1), 0) : 0);
        } catch {
          setCartCount(0);
        }
      } else {
        setCartCount(0);
      }
    };

    checkAuthAndCart();

    // Set up listeners for storage/custom events to keep state in sync
    window.addEventListener('storage', checkAuthAndCart);
    window.addEventListener('cart-updated', checkAuthAndCart);
    window.addEventListener('auth-updated', checkAuthAndCart);

    return () => {
      window.removeEventListener('storage', checkAuthAndCart);
      window.removeEventListener('cart-updated', checkAuthAndCart);
      window.removeEventListener('auth-updated', checkAuthAndCart);
    };
  }, []);

  // Scroll shadow toggle — purely visual CSS class
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const onScroll = () => {
      header.classList.toggle('scrolled', window.scrollY > 4);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    // Call the logout route or just clear local storage
    localStorage.removeItem('med_user');
    localStorage.removeItem('med_session');
    
    // Trigger auth update
    window.dispatchEvent(new Event('auth-updated'));
    
    // Clear cookies via proxy route
    await fetch('/api/auth/login', { method: 'DELETE' }).catch(() => {});
    
    router.push('/');
    router.refresh();
  };

  return (
    <header className="navbar" ref={headerRef}>
      <div className="container">
        <Link href="/" className="brand">
          <span className="brand-icon" style={{ color: '#22c55e', display: 'flex', alignItems: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </span>
          <span className="brand-teal">{BRAND_CONFIG.name}</span>
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <ul className="nav-links">
            {NAV_LINKS.map((link) => {
              // Hide dashboard if not logged in
              if (link.path === '/dashboard' && !user) return null;
              
              const isActive = pathname === link.path;
              return (
                <li key={link.path}>
                  <Link
                    href={link.path}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    style={{ position: 'relative', paddingBottom: '0.25rem', display: 'inline-flex', alignItems: 'center' }}
                  >
                    {link.label}
                    {link.path === '/cart' && (
                      <AnimatePresence mode="wait">
                        {cartCount > 0 && (
                          <motion.span
                            key={cartCount}
                            className="cart-badge"
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                          >
                            {cartCount}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    )}
                    {isActive && (
                      <motion.span
                        layoutId="navActiveUnderline"
                        style={{
                          position: 'absolute',
                          bottom: '-2px',
                          left: 0,
                          right: 0,
                          height: '2px',
                          backgroundColor: 'var(--primary)',
                          borderRadius: 'var(--radius-full)'
                        }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <motion.div
            className="auth-nav-buttons"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="btn btn-outline"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                >
                  Log Out
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="nav-link" style={{ fontWeight: 500 }}>
                  Sign In
                </Link>
                <Link href="/register" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                  Register
                </Link>
              </>
            )}
          </motion.div>
        </nav>
      </div>
    </header>
  );
}
