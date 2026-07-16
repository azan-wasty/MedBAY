'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { COLOR_PALETTE, AUTH_LABELS } from '../../lib/constants';

export default function RegisterPage() {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [license, setLicense] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password || !license) {
      setErrorMsg('Please fill out all fields.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          registration_number: license,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to submit registration.');
      }

      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during registration.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="container" style={{ maxWidth: '440px', padding: '4rem 1rem' }}>
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: COLOR_PALETTE.textDark, marginBottom: '0.5rem' }}>
            Registration Complete
          </h2>
          <p style={{ color: COLOR_PALETTE.textSecondary, fontSize: '0.875rem', lineHeight: '1.5', marginBottom: '2rem' }}>
            Your organization profile has been submitted. Once verified, you'll be able to request quotations through MedBAY.
          </p>
          <Link href="/login" className="btn btn-primary" style={{ width: '100%', padding: '0.6rem' }}>
            Proceed to Sign In
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '460px', padding: '3rem 1rem' }}>
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: COLOR_PALETTE.textDark, marginBottom: '0.25rem' }}>
            {AUTH_LABELS.registerTitle}
          </h2>
          <p style={{ color: COLOR_PALETTE.textSecondary, fontSize: '0.875rem' }}>
            {AUTH_LABELS.registerSubtitle}
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

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label">{AUTH_LABELS.nameLabel}</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              placeholder="e.g. Hope General Hospital"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{AUTH_LABELS.licenseLabel}</label>
            <input
              type="text"
              className="form-input"
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              disabled={submitting}
              placeholder="e.g. LIC-998877"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{AUTH_LABELS.emailLabel}</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              placeholder="you@organization.com"
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
            {submitting ? 'Submitting...' : AUTH_LABELS.submitRegister}
          </motion.button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '0.875rem', color: COLOR_PALETTE.textSecondary, marginTop: '1rem' }}>
          <span>{AUTH_LABELS.haveAccount} </span>
          <Link href="/login" style={{ color: COLOR_PALETTE.primary, fontWeight: 500 }}>
            Sign in here
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
