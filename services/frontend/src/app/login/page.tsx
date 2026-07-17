'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { COLOR_PALETTE, AUTH_LABELS } from '../../lib/constants';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: email, password }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Authentication failed. Please verify credentials.');
      }

      // Success - save user details in localStorage
      localStorage.setItem('med_user', JSON.stringify(data.user));
      localStorage.setItem('med_session', data.session_id);

      // Dispatch custom auth-updated event to update the navigation bar dynamically
      window.dispatchEvent(new Event('auth-updated'));

      // Redirect to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '440px', padding: '4rem 1rem' }}>
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: COLOR_PALETTE.textDark, marginBottom: '0.25rem' }}>
            {AUTH_LABELS.loginTitle}
          </h2>
          <p style={{ color: COLOR_PALETTE.textSecondary, fontSize: '0.875rem' }}>
            {AUTH_LABELS.loginSubtitle}
          </p>
        </div>

        <AnimatePresence>
          {errorMsg && (
            <motion.div
              className="alert alert-error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <span>{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">{AUTH_LABELS.emailLabel}</label>
            <input
              type="text"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              placeholder="you@organization.com or admin"
              autoCapitalize="none"
              autoCorrect="off"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label">{AUTH_LABELS.passwordLabel}</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <motion.button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.6rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            whileTap={!submitting ? { scale: 0.97 } : {}}
          >
            {submitting && <span className="spinner" />}
            {submitting ? 'Authenticating...' : AUTH_LABELS.submitLogin}
          </motion.button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '0.875rem', color: COLOR_PALETTE.textSecondary, marginTop: '1rem' }}>
          <span>{AUTH_LABELS.needAccount} </span>
          <Link href="/register" style={{ color: COLOR_PALETTE.primary, fontWeight: 500 }}>
            Register here
          </Link>
        </div>
      </motion.div>
    </div>
  );
}