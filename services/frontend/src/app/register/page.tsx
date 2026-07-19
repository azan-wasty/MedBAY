'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ArrowRight, Loader2, CheckCircle2, PartyPopper } from 'lucide-react';

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
                Join a verified procurement network.
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
          <div className="flex flex-col justify-center p-8 sm:p-10">
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-start"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                    <PartyPopper className="h-6 w-6" />
                  </span>
                  <h1 className="mt-4 font-display text-2xl font-semibold text-ink-900">Registration Complete</h1>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">
                    Your organization profile has been submitted. Once verified, you&apos;ll be able to request
                    quotations through {BRAND_CONFIG.name}.
                  </p>
                  <Button asChild variant="brand" size="lg" className="mt-6 w-full">
                    <Link href="/login">
                      Proceed to Sign In
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="mb-2 lg:hidden">
                    <Logo />
                  </div>
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                    <ShieldCheck className="h-3 w-3" />
                    Organization Registration
                  </span>
                  <h1 className="mt-3 font-display text-2xl font-semibold text-ink-900">{AUTH_LABELS.registerTitle}</h1>
                  <p className="mt-1 text-sm text-ink-500">{AUTH_LABELS.registerSubtitle}</p>

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

                  <form onSubmit={handleRegister} className="mt-6 flex flex-col gap-4">
                    <div>
                      <Label htmlFor="orgName">{AUTH_LABELS.nameLabel}</Label>
                      <Input
                        id="orgName"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={submitting}
                        placeholder="e.g. Hope General Hospital"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="license">{AUTH_LABELS.licenseLabel}</Label>
                      <Input
                        id="license"
                        type="text"
                        value={license}
                        onChange={(e) => setLicense(e.target.value)}
                        disabled={submitting}
                        placeholder="e.g. LIC-998877"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="regEmail">{AUTH_LABELS.emailLabel}</Label>
                      <Input
                        id="regEmail"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={submitting}
                        placeholder="you@organization.com"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="regPassword">{AUTH_LABELS.passwordLabel}</Label>
                      <Input
                        id="regPassword"
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
                          Submitting...
                        </>
                      ) : (
                        <>
                          {AUTH_LABELS.submitRegister}
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>

                  <p className="mt-6 text-center text-sm text-ink-500">
                    {AUTH_LABELS.haveAccount}{' '}
                    <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
                      Sign in here
                    </Link>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
