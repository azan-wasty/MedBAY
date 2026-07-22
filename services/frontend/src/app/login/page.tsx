'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

import { AUTH_LABELS, BRAND_CONFIG } from '@/lib/constants';
import { Logo } from '@/components/shared/Logo';
import { PulseLine } from '@/components/shared/PulseLine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';

const TRUST_POINTS = [
  'Verified supplier & buyer network',
  'RFQ-based transparent pricing',
  'End-to-end order & return tracking',
];

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

      // Success - save non-sensitive user display info for the UI.
      // The actual session lives only in the httpOnly `med_session` cookie
      // set by the server — it's never exposed to client-side JS.
      localStorage.setItem('med_user', JSON.stringify(data.user));

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
    <div className="flex min-h-[calc(100vh-4.5rem)] items-stretch bg-ink-50/40">
      <div className="container flex flex-1 items-center py-12 sm:py-16">
        <div className="mx-auto grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft-lg lg:grid-cols-2">
          {/* Brand panel */}
          <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-ink-900 via-ink-900 to-brand-900 p-10 text-white lg:flex">
            <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden="true" />
            <div className="relative">
              <Logo tone="dark" />
              <p className="mt-8 max-w-xs text-balance font-display text-2xl font-semibold leading-snug">
                Your procurement dashboard, secured.
              </p>
              <ul className="mt-8 flex flex-col gap-3.5">
                {TRUST_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-[13.5px] text-ink-200">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <PulseLine width={200} strokeWidth={1.75} strokeClassName="stroke-brand-400" />
              <p className="mt-4 text-[12px] text-ink-400">{BRAND_CONFIG.slogan}</p>
            </div>
          </div>

          {/* Form panel */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col justify-center p-8 sm:p-10"
          >
            <div className="mb-2 lg:hidden">
              <Logo />
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
              <ShieldCheck className="h-3 w-3" />
              Secure Sign In
            </span>
            <h1 className="mt-3 font-display text-2xl font-semibold text-ink-900">{AUTH_LABELS.loginTitle}</h1>
            <p className="mt-1 text-sm text-ink-500">{AUTH_LABELS.loginSubtitle}</p>

            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-5 overflow-hidden"
                >
                  <Alert variant="error">{errorMsg}</Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-4">
              <div>
                <Label htmlFor="email">{AUTH_LABELS.emailLabel}</Label>
                <Input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  placeholder="you@organization.com or admin"
                  autoCapitalize="none"
                  autoCorrect="off"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">{AUTH_LABELS.passwordLabel}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <Button type="submit" disabled={submitting} variant="brand" size="lg" className="mt-2 w-full">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    {AUTH_LABELS.submitLogin}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-ink-500">
              {AUTH_LABELS.needAccount}{' '}
              <Link href="/register" className="font-semibold text-brand-700 hover:text-brand-800">
                Register here
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}