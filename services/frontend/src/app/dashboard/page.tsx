'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  ShieldCheck,
  FileText,
  Truck,
  CheckCircle2,
  Info,
  Bell,
  Trash2,
  Package,
} from 'lucide-react';

import {
  DASHBOARD_LABELS, ODOO_STATUS_MAP, AUTH_LABELS,
  TRACKING_LABELS, REVIEW_LABELS, RFQ_NEGOTIATION_LABELS,
} from '@/lib/constants';
import type { RFQItem, User, RFQDetail, OrderTracking } from '@/lib/odooClient';
import { formatDisplayName } from '@/lib/utils';
import { Container } from '@/components/shared/Container';
import { OrderStepper } from '@/components/dashboard/OrderStepper';
import { BuyerOverview } from '@/components/dashboard/BuyerOverview';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Stars, StarRatingInput } from '@/components/ui/stars';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter,
} from '@/components/ui/dialog';

function DashboardSkeleton() {
  return (
    <Container className="py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        <div className="flex flex-col gap-4 rounded-xl border border-ink-100 bg-white p-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    </Container>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [rfqItems, setRfqItems] = useState<RFQItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Filter state for Quotations and Orders sections
  type QuoteFilter = 'all' | 'draft' | 'sent' | 'cancel';
  type OrderFilter = 'all' | 'sale' | 'done';
  const [quoteFilter, setQuoteFilter] = useState<QuoteFilter>('all');
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all');

  const [selectedRfq, setSelectedRfq] = useState<RFQItem | null>(null);
  const [rfqDetail, setRfqDetail] = useState<RFQDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string>('');
  const [approving, setApproving] = useState<boolean>(false);
  const [rfqToApprove, setRfqToApprove] = useState<RFQDetail | null>(null);

  const [showTracking, setShowTracking] = useState<boolean>(false);
  const [tracking, setTracking] = useState<OrderTracking | null>(null);
  const [trackingLoading, setTrackingLoading] = useState<boolean>(false);
  const [trackingError, setTrackingError] = useState<string>('');

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  // Negotiation states
  const [rfqToReject, setRfqToReject] = useState<RFQDetail | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const [rfqToCounter, setRfqToCounter] = useState<RFQDetail | null>(null);
  const [counterTargetPrices, setCounterTargetPrices] = useState<Record<number, string>>({});
  const [counterNotesInput, setCounterNotesInput] = useState('');
  const [submittingCounter, setSubmittingCounter] = useState(false);

  // Derived lists
  const quotationItems = useMemo(
    () => rfqItems.filter((r) => r.state === 'draft' || r.state === 'sent' || r.state === 'cancel'),
    [rfqItems]
  );
  const orderItems = useMemo(
    () => rfqItems.filter((r) => r.state === 'sale' || r.state === 'done'),
    [rfqItems]
  );
  const filteredQuotations = useMemo(() => {
    if (quoteFilter === 'all') return quotationItems;
    return quotationItems.filter((r) => r.state === quoteFilter);
  }, [quotationItems, quoteFilter]);
  const filteredOrders = useMemo(() => {
    if (orderFilter === 'all') return orderItems;
    return orderItems.filter((r) => r.state === orderFilter);
  }, [orderItems, orderFilter]);

  // Whether the selected detail dialog is showing an order (sale/done) or a quotation
  const isOrderDetail = rfqDetail?.state === 'sale' || rfqDetail?.state === 'done';
  const isOrderSelected = selectedRfq?.state === 'sale' || selectedRfq?.state === 'done';

  const handleOpenRFQ = async (rfq: RFQItem) => {
    setSelectedRfq(rfq);
    setDetailLoading(true);
    setDetailError('');
    setRfqDetail(null);
    setShowTracking(false);
    setTracking(null);
    setTrackingError('');
    setReviewRating(5);
    setReviewText('');
    setReviewError('');
    setReviewSuccess('');
    try {
      const res = await fetch(`/api/rfq/${rfq.id}`);
      if (!res.ok) throw new Error('Failed to fetch quote details.');
      const data = await res.json();
      setRfqDetail(data);
    } catch (err: any) {
      setDetailError(err.message || 'Unable to retrieve quotation details.');
    } finally {
      setDetailLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // RFQ Negotiation Handlers: Accept, Reject, Counter
  // -------------------------------------------------------------------

  /**
   * Step 1: Open 2-step purchase confirmation modal.
   * Pauses control flow and displays itemized cost summary before placing binding order.
   */
  const handleOpenApproveModal = async (rfq: RFQItem | RFQDetail) => {
    setSelectedRfq(null);
    let detail: RFQDetail;
    if ('lines' in rfq && Array.isArray((rfq as RFQDetail).lines)) {
      detail = rfq as RFQDetail;
    } else {
      try {
        const res = await fetch(`/api/rfq/${rfq.id}`);
        detail = await res.json();
      } catch {
        detail = { id: rfq.id, name: rfq.name, state: rfq.state, date_order: rfq.date_order, amount_total: rfq.amount_total, lines: [] };
      }
    }
    setRfqToApprove(detail);
  };

  /**
   * Step 2: Finalize purchase order upon explicit buyer acceptance.
   * Converts RFQ status from 'sent' -> 'sale' (Confirmed).
   */
  const handleConfirmApprove = async () => {
    if (!rfqToApprove) return;
    try {
      setApproving(true);
      setDetailError('');
      const res = await fetch(`/api/rfq/${rfqToApprove.id}/approve`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to approve quotation.');
      }

      setRfqItems((prev) => prev.map((item) => (item.id === rfqToApprove.id ? { ...item, state: 'sale' } : item)));
      if (rfqDetail && rfqDetail.id === rfqToApprove.id) {
        setRfqDetail({ ...rfqDetail, state: 'sale' });
      }
      setRfqToApprove(null);
    } catch (err: any) {
      setDetailError(err.message || 'An error occurred during approval.');
    } finally {
      setApproving(false);
    }
  };

  /**
   * Open rejection reason modal for buyer feedback.
   */
  const handleOpenRejectModal = async (rfq: RFQItem | RFQDetail) => {
    setSelectedRfq(null);
    let detail: RFQDetail;
    if ('lines' in rfq && Array.isArray((rfq as RFQDetail).lines)) {
      detail = rfq as RFQDetail;
    } else {
      try {
        const res = await fetch(`/api/rfq/${rfq.id}`);
        detail = await res.json();
      } catch {
        detail = { id: rfq.id, name: rfq.name, state: rfq.state, date_order: rfq.date_order, amount_total: rfq.amount_total, lines: [] };
      }
    }
    setRfqToReject(detail);
    setRejectionReasonInput('');
  };

  /**
   * Reject quotation and prevent order creation.
   * Converts RFQ status from 'sent'/'draft' -> 'cancel' ("Rejected by Buyer").
   */
  const handleConfirmReject = async () => {
    if (!rfqToReject) return;
    try {
      setRejecting(true);
      setDetailError('');
      const res = await fetch(`/api/rfq/${rfqToReject.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason: rejectionReasonInput }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to reject quotation.');
      }

      setRfqItems((prev) => prev.map((item) => (item.id === rfqToReject.id ? { ...item, state: 'cancel', rejection_reason: data.rejection_reason } : item)));
      if (rfqDetail && rfqDetail.id === rfqToReject.id) {
        setRfqDetail({ ...rfqDetail, state: 'cancel', rejection_reason: data.rejection_reason });
      }
      setRfqToReject(null);
    } catch (err: any) {
      setDetailError(err.message || 'Failed to reject quotation.');
    } finally {
      setRejecting(false);
    }
  };

  const handleOpenCounterModal = async (rfq: RFQItem | RFQDetail) => {
    setSelectedRfq(null);
    let detail: RFQDetail;
    if ('lines' in rfq && Array.isArray((rfq as RFQDetail).lines)) {
      detail = rfq as RFQDetail;
    } else {
      try {
        const res = await fetch(`/api/rfq/${rfq.id}`);
        detail = await res.json();
      } catch {
        detail = { id: rfq.id, name: rfq.name, state: rfq.state, date_order: rfq.date_order, amount_total: rfq.amount_total, lines: [] };
      }
    }
    setRfqToCounter(detail);
    const initialPrices: Record<number, string> = {};
    if (detail.lines) {
      detail.lines.forEach((l) => {
        initialPrices[l.id] = String(l.target_price_unit ?? l.price_unit ?? '');
      });
    }
    setCounterTargetPrices(initialPrices);
    setCounterNotesInput(detail.buyer_notes || '');
  };

  const handleConfirmCounter = async () => {
    if (!rfqToCounter) return;
    try {
      setSubmittingCounter(true);
      setDetailError('');
      const lines = rfqToCounter.lines.map((l) => ({
        line_id: l.id,
        target_price_unit: parseFloat(counterTargetPrices[l.id] || '0') || 0,
      }));

      const res = await fetch(`/api/rfq/${rfqToCounter.id}/counter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_notes: counterNotesInput,
          lines,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to submit counter offer.');
      }

      setRfqItems((prev) => prev.map((item) => (item.id === rfqToCounter.id ? { ...item, state: 'draft' } : item)));
      if (rfqDetail && rfqDetail.id === rfqToCounter.id) {
        setRfqDetail({
          ...rfqDetail,
          state: 'draft',
          buyer_notes: counterNotesInput,
          last_counter_by: 'buyer',
          lines: rfqDetail.lines.map((l) => ({
            ...l,
            target_price_unit: parseFloat(counterTargetPrices[l.id] || '0') || l.target_price_unit,
          })),
        });
      }
      setRfqToCounter(null);
    } catch (err: any) {
      setDetailError(err.message || 'Failed to submit counter offer.');
    } finally {
      setSubmittingCounter(false);
    }
  };

  const handleToggleTracking = async (orderId: number) => {
    if (showTracking) {
      setShowTracking(false);
      return;
    }
    setShowTracking(true);
    if (tracking) return;
    try {
      setTrackingLoading(true);
      setTrackingError('');
      const res = await fetch(`/api/orders/${orderId}/tracking`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to load order status.');
      setTracking(data);
    } catch (err: any) {
      setTrackingError(err.message || 'Unable to retrieve order status.');
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleSubmitReview = async (orderId: number) => {
    setReviewError('');
    setReviewSuccess('');
    try {
      setSubmittingReview(true);
      const res = await fetch(`/api/orders/${orderId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: reviewRating, review_text: reviewText }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to submit review.');
      setReviewSuccess(REVIEW_LABELS.successMsg);
      const tRes = await fetch(`/api/orders/${orderId}/tracking`);
      const tData = await tRes.json();
      if (tRes.ok) setTracking(tData);
    } catch (err: any) {
      setReviewError(err.message || 'An error occurred during submission.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: number, orderId: number) => {
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone, and you cannot submit another review for this order.')) return;
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete review');
      const tRes = await fetch(`/api/orders/${orderId}/tracking`);
      const tData = await tRes.json();
      if (tRes.ok) setTracking(tData);
    } catch (err: any) {
      console.error(err);
      alert('Unable to delete review.');
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('med_user');
    if (!storedUser) {
      setErrorMsg(AUTH_LABELS.loginPrompt);
      setLoading(false);
      router.push('/login');
      return;
    }

    try {
      const parsedUser: User = JSON.parse(storedUser);
      if (parsedUser) {
        parsedUser.name = formatDisplayName(parsedUser.name, parsedUser.email);
        localStorage.setItem('med_user', JSON.stringify(parsedUser));
        window.dispatchEvent(new Event('auth-updated'));
      }
      setUser(parsedUser);
    } catch {
      setErrorMsg(AUTH_LABELS.loginPrompt);
      setLoading(false);
      router.push('/login');
      return;
    }

    const fetchRfqStatus = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/rfq');

        if (res.status === 401) {
          localStorage.removeItem('med_user');
          window.dispatchEvent(new Event('auth-updated'));
          router.push('/login');
          return;
        }

        if (!res.ok) throw new Error('Failed to load RFQ status history');
        const data = await res.json();

        const sorted = Array.isArray(data)
          ? data.sort((a: RFQItem, b: RFQItem) => new Date(b.date_order).getTime() - new Date(a.date_order).getTime())
          : [];
        setRfqItems(sorted);

        // Auto-prompt buyer if there is a pending quotation awaiting decision
        const pendingQuoted = sorted.find((a: RFQItem) => a.state === 'sent');
        if (pendingQuoted) {
          handleOpenRFQ(pendingQuoted);
        }
      } catch (err: any) {
        console.error('Error fetching dashboard RFQ statuses:', err);
        setErrorMsg(err.message || 'Unable to retrieve your RFQ history.');
      } finally {
        setLoading(false);
      }
    };

    fetchRfqStatus();
  }, [router]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (errorMsg && !user) {
    return (
      <Container className="flex max-w-md flex-col items-start gap-4 py-24">
        <h2 className="font-display text-xl font-semibold text-ink-900">{AUTH_LABELS.loginPrompt}</h2>
        <Button asChild variant="brand" className="w-full">
          <Link href="/login">Sign In</Link>
        </Button>
      </Container>
    );
  }

  return (
    <div className="bg-ink-50/40 py-10 sm:py-14">
      <Container>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
              {DASHBOARD_LABELS.title}
            </h1>
            <p className="mt-1 text-sm text-ink-500">{DASHBOARD_LABELS.subtitle}</p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-ink-100 bg-white px-3.5 py-2">
            <span className="text-xs font-medium text-ink-500">Status:</span>
            {user?.verification_status === 'verified' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                <ShieldCheck className="h-3 w-3" />
                {DASHBOARD_LABELS.statusVerified}
              </span>
            ) : user?.verification_status === 'rejected' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                <Info className="h-3 w-3" />
                Rejected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 animate-pulse">
                <Info className="h-3 w-3" />
                Pending Verification
              </span>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6">
            <Alert variant="error">{errorMsg}</Alert>
          </div>
        )}

        {rfqItems.some((item) => item.state === 'sent') && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/80 p-4 text-brand-950 shadow-soft-xs">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                <Bell className="h-4 w-4" />
              </span>
              <div>
                <h4 className="text-sm font-semibold">Action Required: Quotation Ready for Review</h4>
                <p className="text-xs text-brand-800">
                  The supplier has submitted a quotation. Please review and choose to Accept Order, Counter Offer, or Reject.
                </p>
              </div>
            </div>
          </div>
        )}

        {user && user.verification_status !== 'verified' && (
          <div className={`mb-6 rounded-xl border p-4 text-sm leading-relaxed shadow-soft-xs ${user.verification_status === 'rejected'
              ? 'border-red-200 bg-red-50/80 text-red-900'
              : 'border-amber-200 bg-amber-50/80 text-amber-900'
            }`}>
            <p className="font-semibold">
              {user.verification_status === 'rejected'
                ? 'Verification Rejected'
                : 'Account Pending Verification'}
            </p>
            <p className="mt-0.5 text-[13px]">
              {user.verification_status === 'rejected'
                ? 'Your company verification was rejected. Please contact an administrator for more information.'
                : 'Your company is currently unverified. You cannot submit quotes until an administrator approves your account. You\u2019ll be notified by email once approved.'}
            </p>
          </div>
        )}

        <BuyerOverview rfqItems={rfqItems} onSelectRFQ={handleOpenRFQ} />

        {/* Company profile card */}
        <div className="mb-6 rounded-xl border border-ink-100 bg-white p-4 shadow-soft-xs">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div>
              <span className="mb-0.5 block text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">Organization</span>
              <strong className="font-medium text-ink-900">{formatDisplayName(user?.name, user?.email)}</strong>
            </div>
            <div>
              <span className="mb-0.5 block text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">Email</span>
              <strong className="font-medium text-ink-900">{user?.email}</strong>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">Quotations:</span>
              <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-600">{quotationItems.length}</span>
              <span className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">Orders:</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{orderItems.length}</span>
            </div>
          </div>
        </div>

        {/* ─── QUOTATIONS SECTION ─── */}
        <div id="rfq-list" className="mb-10 scroll-mt-20">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-600" />
              <h3 className="font-display text-[15px] font-semibold text-ink-900">{DASHBOARD_LABELS.quotationsTitle}</h3>
              {quotationItems.length > 0 && (
                <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-500">{quotationItems.length}</span>
              )}
            </div>
            {/* Filter pills */}
            {quotationItems.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {([['all', 'All'], ['draft', 'Pending'], ['sent', 'Quoted'], ['cancel', 'Rejected']] as [QuoteFilter, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setQuoteFilter(val)}
                    className={
                      quoteFilter === val
                        ? 'rounded-full bg-ink-900 px-3 py-1 text-[11.5px] font-semibold text-white transition-colors'
                        : 'rounded-full border border-ink-200 bg-white px-3 py-1 text-[11.5px] font-medium text-ink-600 transition-colors hover:border-ink-300'
                    }
                  >
                    {label}
                    {val !== 'all' && (
                      <span className="ml-1 opacity-60">
                        ({quotationItems.filter((r) => r.state === val).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {quotationItems.length === 0 ? (
            <div className="rounded-xl border border-ink-100 bg-white p-8">
              <p className="mb-4 text-sm text-ink-500">{DASHBOARD_LABELS.noQuotations}</p>
              <Button asChild variant="outline">
                <Link href="/">Browse Catalog</Link>
              </Button>
            </div>
          ) : filteredQuotations.length === 0 ? (
            <div className="rounded-xl border border-ink-100 bg-white p-6">
              <p className="text-sm text-ink-400">No quotations match this filter.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-soft-xs">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-ink-100 bg-ink-50/60 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                      <th className="px-4 py-3">{DASHBOARD_LABELS.tableId}</th>
                      <th className="px-4 py-3">{DASHBOARD_LABELS.tableDate}</th>
                      <th className="px-4 py-3">{DASHBOARD_LABELS.tableTotal}</th>
                      <th className="px-4 py-3">{DASHBOARD_LABELS.tableStatus}</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence initial={false}>
                      {filteredQuotations.map((rfq, i) => {
                        const statusConfig = ODOO_STATUS_MAP[rfq.state] || {
                          label: rfq.state.toUpperCase(),
                          bg: '#f1f5f9',
                          text: '#475569',
                        };

                        return (
                          <motion.tr
                            key={rfq.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25, delay: i * 0.04 }}
                            className="border-b border-ink-100 last:border-b-0 hover:bg-ink-50/40"
                          >
                            <td className="px-4 py-3 font-data font-medium text-ink-900">{rfq.name}</td>
                            <td className="px-4 py-3 text-ink-500">
                              {new Date(rfq.date_order).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </td>
                            <td className="px-4 py-3 font-medium text-ink-900">
                              {rfq.amount_total > 0
                                ? `$${rfq.amount_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                : 'Pending'}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge config={statusConfig} showDot />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex flex-wrap items-center justify-end gap-1.5">
                                {rfq.state === 'sent' ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="brand"
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                      onClick={() => handleOpenApproveModal(rfq)}
                                    >
                                      Accept Order
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-brand-200 text-brand-700 hover:bg-brand-50 font-semibold"
                                      onClick={() => handleOpenCounterModal(rfq)}
                                    >
                                      Counter
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-red-200 text-red-600 hover:bg-red-50 font-semibold"
                                      onClick={() => handleOpenRejectModal(rfq)}
                                    >
                                      Reject
                                    </Button>
                                  </>
                                ) : rfq.state === 'draft' ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenRFQ(rfq)}
                                    >
                                      View Quotation
                                    </Button>
                                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 border border-amber-200">
                                      Awaiting Supplier
                                    </span>
                                  </>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenRFQ(rfq)}
                                  >
                                    View Quotation
                                  </Button>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ─── ORDERS SECTION ─── */}
        <div id="orders-list" className="scroll-mt-20">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-600" />
              <h3 className="font-display text-[15px] font-semibold text-ink-900">{DASHBOARD_LABELS.ordersTitle}</h3>
              {orderItems.length > 0 && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{orderItems.length}</span>
              )}
            </div>
            {/* Filter pills */}
            {orderItems.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {([['all', 'All'], ['sale', 'Active'], ['done', 'Completed']] as [OrderFilter, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setOrderFilter(val)}
                    className={
                      orderFilter === val
                        ? 'rounded-full bg-ink-900 px-3 py-1 text-[11.5px] font-semibold text-white transition-colors'
                        : 'rounded-full border border-ink-200 bg-white px-3 py-1 text-[11.5px] font-medium text-ink-600 transition-colors hover:border-ink-300'
                    }
                  >
                    {label}
                    {val !== 'all' && (
                      <span className="ml-1 opacity-60">
                        ({orderItems.filter((r) => r.state === val).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {orderItems.length === 0 ? (
            <div className="rounded-xl border border-ink-100 bg-white p-8">
              <p className="mb-4 text-sm text-ink-500">{DASHBOARD_LABELS.noOrders}</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-xl border border-ink-100 bg-white p-6">
              <p className="text-sm text-ink-400">No orders match this filter.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-soft-xs">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-ink-100 bg-ink-50/60 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                      <th className="px-4 py-3">{DASHBOARD_LABELS.tableId}</th>
                      <th className="px-4 py-3">{DASHBOARD_LABELS.tableOrderDate}</th>
                      <th className="px-4 py-3">{DASHBOARD_LABELS.tableOrderTotal}</th>
                      <th className="px-4 py-3">{DASHBOARD_LABELS.tableStatus}</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence initial={false}>
                      {filteredOrders.map((rfq, i) => {
                        const statusConfig = ODOO_STATUS_MAP[rfq.state] || {
                          label: rfq.state.toUpperCase(),
                          bg: '#f1f5f9',
                          text: '#475569',
                        };

                        return (
                          <motion.tr
                            key={rfq.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25, delay: i * 0.04 }}
                            className="border-b border-ink-100 last:border-b-0 hover:bg-ink-50/40"
                          >
                            <td className="px-4 py-3 font-data font-medium text-ink-900">{rfq.name}</td>
                            <td className="px-4 py-3 text-ink-500">
                              {new Date(rfq.date_order).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </td>
                            <td className="px-4 py-3 font-medium text-emerald-700">
                              {rfq.amount_total > 0
                                ? `$${rfq.amount_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge config={statusConfig} showDot />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenRFQ(rfq)}
                              >
                                View Order
                              </Button>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Container>

      {/* Detail Modal — context-aware: Quotation or Order */}
      <Dialog open={!!selectedRfq} onOpenChange={(open) => !open && setSelectedRfq(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isOrderSelected ? 'Order Details' : 'Quotation Details'}: {selectedRfq?.name}
            </DialogTitle>
          </DialogHeader>

          <DialogBody>
            {detailLoading ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
                <p className="text-sm text-ink-500">Loading quote specifications...</p>
              </div>
            ) : detailError ? (
              <Alert variant="error">{detailError}</Alert>
            ) : rfqDetail ? (
              <div>
                <div className="mb-5 grid grid-cols-2 gap-4 border-b border-ink-100 pb-5 text-sm">
                  <div>
                    <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">
                      Date Requested
                    </span>
                    <strong className="text-ink-900">
                      {new Date(rfqDetail.date_order).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </strong>
                  </div>
                  <div>
                    <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">
                      Status
                    </span>
                    <StatusBadge
                      config={
                        ODOO_STATUS_MAP[rfqDetail.state] || { label: rfqDetail.state.toUpperCase(), bg: '#f1f5f9', text: '#475569' }
                      }
                    />
                  </div>
                </div>

                <h4 className="mb-2.5 text-[13px] font-semibold text-ink-900">
                  {isOrderDetail ? 'Order Items' : 'Items Quoted'}
                </h4>
                <div className="mb-5 overflow-hidden rounded-lg border border-ink-100">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-left text-[13px]">
                      <thead>
                        <tr className="border-b border-ink-100 bg-ink-50/60 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                          <th className="px-3 py-2.5">Product Name</th>
                          <th className="px-3 py-2.5 text-center">Qty</th>
                          <th className="px-3 py-2.5 text-right">Your Target</th>
                          <th className="px-3 py-2.5 text-right">Quoted Price</th>
                          <th className="px-3 py-2.5 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rfqDetail.lines.map((line) => {
                          const hasTarget = line.target_price_unit && line.target_price_unit > 0;
                          const isAboveTarget =
                            hasTarget && line.price_unit > 0 && line.price_unit > line.target_price_unit!;
                          return (
                            <tr key={line.id} className="border-b border-ink-100 last:border-b-0">
                              <td className="px-3 py-2.5 font-medium text-ink-900">{line.product_name}</td>
                              <td className="px-3 py-2.5 text-center text-ink-600">{line.product_uom_qty}</td>
                              <td className="px-3 py-2.5 text-right text-ink-400">
                                {hasTarget
                                  ? `$${line.target_price_unit!.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                  : <span className="text-ink-300">—</span>}
                              </td>
                              <td className={`px-3 py-2.5 text-right ${isAboveTarget ? 'text-amber-600 font-semibold' : 'text-ink-600'
                                }`}>
                                {line.price_unit > 0
                                  ? `$${line.price_unit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                  : 'Pending Quote'}
                                {isAboveTarget && (
                                  <span className="ml-1.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                    above target
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-right font-medium text-ink-900">
                                {line.price_subtotal > 0
                                  ? `$${line.price_subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                  : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-ink-100 py-4">
                  <span className="text-sm font-medium text-ink-500">Estimated Total:</span>
                  <strong className="font-data text-xl text-brand-700">
                    {rfqDetail.amount_total > 0
                      ? `$${rfqDetail.amount_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      : 'Pending Admin Pricing'}
                  </strong>
                </div>

                {rfqDetail.buyer_notes && (
                  <div className="mb-4 rounded-lg border border-brand-100 bg-brand-50/40 px-4 py-3">
                    <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wide text-brand-600">
                      Your Procurement Notes
                    </span>
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-700">{rfqDetail.buyer_notes}</p>
                  </div>
                )}

                {rfqDetail.state === 'sent' && rfqDetail.last_counter_by === 'seller' ? (
                  <Alert variant="warning" icon className="mb-4 border-amber-300 bg-amber-50 text-amber-950">
                    <div className="text-[13px]">
                      <strong>Seller Responded to Counter Offer:</strong> The supplier has reviewed your target prices and updated the quotation. Please review the final prices below and click <strong>Approve &amp; Order</strong> to accept, <strong>Counter Offer</strong> to negotiate further, or <strong>Reject Quote</strong>.
                    </div>
                  </Alert>
                ) : rfqDetail.state === 'sent' ? (
                  <Alert variant="info" icon className="mb-4 border-brand-200 bg-brand-50 text-brand-900">
                    <div className="text-[13px]">
                      <strong>Action Required — Quotation Received:</strong> The supplier has submitted a quotation for your review. Please review the unit prices below and select <strong>Approve &amp; Order</strong>, <strong>Counter Offer</strong>, or <strong>Reject Quote</strong>.
                    </div>
                  </Alert>
                ) : null}

                {rfqDetail.state === 'draft' && rfqDetail.last_counter_by === 'buyer' ? (
                  <Alert variant="warning" icon className="mb-4">
                    <span className="text-[13px]">
                      <strong>Counter Offer Submitted:</strong> Your proposed target prices have been sent to the supplier. Awaiting supplier review.
                    </span>
                  </Alert>
                ) : rfqDetail.state === 'draft' ? (
                  <Alert variant="info" icon className="mb-4">
                    <span className="text-[13px]">We are reviewing your request. A formal quotation will be posted here shortly.</span>
                  </Alert>
                ) : null}

                {rfqDetail.state === 'cancel' && (
                  <Alert variant="error" icon className="mb-4">
                    <div className="text-[13px]">
                      <strong>Rejected by you</strong>{rfqDetail.rejection_reason ? `: ${rfqDetail.rejection_reason}` : ''}
                    </div>
                  </Alert>
                )}

                {rfqDetail.state === 'sale' && (
                  <>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => handleToggleTracking(rfqDetail.id)}>
                      <Truck className="h-3.5 w-3.5" />
                      {showTracking ? TRACKING_LABELS.hideButton : TRACKING_LABELS.showButton}
                    </Button>

                    <AnimatePresence>
                      {showTracking && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 rounded-lg border border-ink-100 bg-ink-50/50 p-4">
                            {trackingLoading ? (
                              <div className="flex items-center gap-2 text-[13px] text-ink-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading order status...
                              </div>
                            ) : trackingError ? (
                              <Alert variant="error">{trackingError}</Alert>
                            ) : tracking ? (
                              <>
                                <OrderStepper tracking={tracking} />

                                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                                  {TRACKING_LABELS.pickingsTitle}
                                </h5>
                                {tracking.pickings.length === 0 ? (
                                  <p className="mb-4 text-[13px] text-ink-400">{TRACKING_LABELS.noPickings}</p>
                                ) : (
                                  <div className="mb-4 overflow-x-auto rounded-lg border border-ink-100">
                                    <table className="w-full min-w-[440px] text-left text-[12.5px]">
                                      <thead>
                                        <tr className="border-b border-ink-100 bg-white text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">
                                          <th className="px-3 py-2">Reference</th>
                                          <th className="px-3 py-2">Status</th>
                                          <th className="px-3 py-2">{TRACKING_LABELS.scheduledLabel}</th>
                                          <th className="px-3 py-2">{TRACKING_LABELS.doneLabel}</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {tracking.pickings.map((p) => (
                                          <tr key={p.id} className="border-b border-ink-100 bg-white last:border-b-0">
                                            <td className="px-3 py-2 font-medium text-ink-900">{p.name}</td>
                                            <td className="px-3 py-2 capitalize text-ink-600">{p.state.replace(/_/g, ' ')}</td>
                                            <td className="px-3 py-2 text-ink-500">
                                              {p.scheduled_date ? new Date(p.scheduled_date as string).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="px-3 py-2 text-ink-500">
                                              {p.date_done ? new Date(p.date_done as string).toLocaleDateString() : '—'}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                                  {TRACKING_LABELS.invoicesTitle}
                                </h5>
                                {tracking.invoices.length === 0 ? (
                                  <p className="mb-5 text-[13px] text-ink-400">{TRACKING_LABELS.noInvoices}</p>
                                ) : (
                                  <div className="mb-5 overflow-x-auto rounded-lg border border-ink-100">
                                    <table className="w-full min-w-[440px] text-left text-[12.5px]">
                                      <thead>
                                        <tr className="border-b border-ink-100 bg-white text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">
                                          <th className="px-3 py-2">Reference</th>
                                          <th className="px-3 py-2">Status</th>
                                          <th className="px-3 py-2">Payment</th>
                                          <th className="px-3 py-2 text-right">Amount</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {tracking.invoices.map((inv) => (
                                          <tr key={inv.id} className="border-b border-ink-100 bg-white last:border-b-0">
                                            <td className="px-3 py-2 font-medium text-ink-900">{inv.name}</td>
                                            <td className="px-3 py-2 capitalize text-ink-600">{inv.state}</td>
                                            <td className="px-3 py-2 capitalize text-ink-600">{inv.payment_state?.replace(/_/g, ' ')}</td>
                                            <td className="px-3 py-2 text-right font-medium text-ink-900">
                                              ${inv.amount_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {tracking.buyer_stage === 'completed' && (
                                  <div className="mt-2 border-t border-ink-100 pt-4">
                                    <h5 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                                      {REVIEW_LABELS.sectionTitle}
                                    </h5>
                                    {tracking.has_been_reviewed ? (
                                      tracking.review ? (
                                        <div className="text-[13px]">
                                          <Stars rating={tracking.review.rating} size={16} />
                                          {tracking.review.review_text && (
                                            <p className="mt-1.5 text-ink-600">{tracking.review.review_text}</p>
                                          )}
                                          <div className="mt-1.5 flex items-center justify-between">
                                            <span className="text-xs text-ink-400">
                                              {new Date(tracking.review.create_date).toLocaleDateString()}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteReview(tracking.review!.id, tracking.order_id)}
                                              className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                              Delete Review
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-[13px] text-ink-400">{REVIEW_LABELS.alreadyReviewed}</p>
                                      )
                                    ) : (
                                      <div>
                                        <AnimatePresence>
                                          {reviewError && (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-3">
                                              <Alert variant="error">{reviewError}</Alert>
                                            </motion.div>
                                          )}
                                          {reviewSuccess && (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-3">
                                              <Alert variant="success">{reviewSuccess}</Alert>
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                        {!reviewSuccess && (
                                          <>
                                            <div className="mb-3">
                                              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-600">
                                                {REVIEW_LABELS.ratingLabel}
                                              </label>
                                              <StarRatingInput value={reviewRating} onChange={setReviewRating} disabled={submittingReview} />
                                            </div>
                                            <div className="mb-3.5">
                                              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-600">
                                                {REVIEW_LABELS.reviewTextLabel}
                                              </label>
                                              <Textarea
                                                rows={2}
                                                value={reviewText}
                                                onChange={(e) => setReviewText(e.target.value)}
                                                placeholder={REVIEW_LABELS.reviewTextPlaceholder}
                                                disabled={submittingReview}
                                              />
                                            </div>
                                            <Button
                                              type="button"
                                              variant="brand"
                                              size="sm"
                                              onClick={() => handleSubmitReview(rfqDetail.id)}
                                              disabled={submittingReview}
                                            >
                                              {submittingReview && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                              {submittingReview ? REVIEW_LABELS.submitting : REVIEW_LABELS.submitButton}
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            ) : null}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>
            ) : null}
          </DialogBody>

          <DialogFooter className="flex-wrap items-center justify-between gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setSelectedRfq(null)}>
              Close
            </Button>
            {rfqDetail?.state === 'sent' && (
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 font-semibold" onClick={() => handleOpenRejectModal(rfqDetail)}>
                  Reject Quote
                </Button>
                <Button variant="outline" className="border-brand-200 text-brand-700 hover:bg-brand-50 font-semibold" onClick={() => handleOpenCounterModal(rfqDetail)}>
                  Counter Offer
                </Button>
                <Button variant="brand" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" onClick={() => handleOpenApproveModal(rfqDetail)} disabled={approving}>
                  {approving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Accept Order
                </Button>
              </div>
            )}
            {rfqDetail?.state === 'draft' && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
                Under Supplier Review
              </span>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Quote Modal */}
      <Dialog open={!!rfqToReject} onOpenChange={(open) => !open && setRfqToReject(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{RFQ_NEGOTIATION_LABELS.rejectionModalTitle}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="mb-3 text-[13px] text-ink-600">
              Are you sure you want to reject this quotation from the supplier? You can optionally provide feedback or a reason below:
            </p>
            <Textarea
              rows={3}
              value={rejectionReasonInput}
              onChange={(e) => setRejectionReasonInput(e.target.value)}
              placeholder={RFQ_NEGOTIATION_LABELS.rejectionReasonPlaceholder}
              disabled={rejecting}
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRfqToReject(null)} disabled={rejecting}>
              Cancel
            </Button>
            <Button variant="brand" className="bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirmReject} disabled={rejecting}>
              {rejecting && <Loader2 className="h-4 w-4 animate-spin" />}
              {RFQ_NEGOTIATION_LABELS.confirmRejectBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Counter Offer Modal */}
      <Dialog open={!!rfqToCounter} onOpenChange={(open) => !open && setRfqToCounter(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{RFQ_NEGOTIATION_LABELS.counterModalTitle}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="mb-4 text-[13px] text-ink-600">
              {RFQ_NEGOTIATION_LABELS.counterInstructions}
            </p>
            {rfqToCounter && (
              <div className="mb-4 overflow-hidden rounded-lg border border-ink-100">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-ink-100 bg-ink-50/60 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                      <th className="px-3 py-2">Product</th>
                      <th className="px-3 py-2 text-right">Quoted Price</th>
                      <th className="px-3 py-2 text-right">New Target Unit Price ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfqToCounter.lines.map((l) => (
                      <tr key={l.id} className="border-b border-ink-100 last:border-b-0">
                        <td className="px-3 py-2.5 font-medium text-ink-900">{l.product_name}</td>
                        <td className="px-3 py-2.5 text-right font-data text-ink-500">
                          ${l.price_unit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <input
                            id={`counter-target-price-${l.id}`}
                            name={`counter_target_price_${l.id}`}
                            aria-label={`Counter target unit price for ${l.product_name}`}
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-28 rounded-md border border-ink-200 px-2.5 py-1 text-right text-xs font-medium focus:border-brand-500 focus:outline-none"
                            value={counterTargetPrices[l.id] ?? ''}
                            onChange={(e) =>
                              setCounterTargetPrices((prev) => ({
                                ...prev,
                                [l.id]: e.target.value,
                              }))
                            }
                            disabled={submittingCounter}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div>
              <label className="mb-1 block text-[12px] font-semibold text-ink-700">Counter Offer Notes / Budget Justification</label>
              <Textarea
                rows={2}
                value={counterNotesInput}
                onChange={(e) => setCounterNotesInput(e.target.value)}
                placeholder="Explain why you are proposing this counter price (e.g. bulk order discount, competitor pricing)..."
                disabled={submittingCounter}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRfqToCounter(null)} disabled={submittingCounter}>
              Cancel
            </Button>
            <Button variant="brand" onClick={handleConfirmCounter} disabled={submittingCounter}>
              {submittingCounter && <Loader2 className="h-4 w-4 animate-spin" />}
              {RFQ_NEGOTIATION_LABELS.submitCounterBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Final Approval Confirmation Modal */}
      <Dialog open={!!rfqToApprove} onOpenChange={(open) => !open && setRfqToApprove(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Accept Order: {rfqToApprove?.name}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Alert variant="warning" icon className="mb-4">
              <span className="text-[13px]">
                <strong>Final Order Confirmation:</strong> Are you sure you want to accept this quotation and place a binding order for <strong>{rfqToApprove?.name}</strong>?
              </span>
            </Alert>
            {rfqToApprove && (
              <div className="space-y-3 rounded-lg border border-ink-100 bg-ink-50/50 p-4 text-[13px]">
                <div className="flex justify-between border-b border-ink-100 pb-2">
                  <span className="text-ink-500">Quotation Ref:</span>
                  <span className="font-data font-semibold text-ink-900">{rfqToApprove.name}</span>
                </div>
                <div className="flex justify-between border-b border-ink-100 pb-2">
                  <span className="text-ink-500">Total Order Amount:</span>
                  <strong className="font-data text-base text-brand-700">
                    ${rfqToApprove.amount_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                </div>
                <div className="pt-1">
                  <span className="mb-1 block text-xs font-semibold text-ink-600">Line Items:</span>
                  <ul className="space-y-1 text-xs text-ink-700">
                    {rfqToApprove.lines.map((l) => (
                      <li key={l.id} className="flex justify-between">
                        <span>{l.product_name} (x{l.product_uom_qty})</span>
                        <span className="font-data">${l.price_subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </DialogBody>
          <DialogFooter className="flex-wrap items-center justify-between gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setRfqToApprove(null)} disabled={approving}>
              Back / Review
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => {
                  if (rfqToApprove) {
                    const target = rfqToApprove;
                    setRfqToApprove(null);
                    handleOpenRejectModal(target);
                  }
                }}
                disabled={approving}
              >
                Reject Quote
              </Button>
              <Button variant="brand" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" onClick={handleConfirmApprove} disabled={approving}>
                {approving && <Loader2 className="h-4 w-4 animate-spin" />}
                Accept Order
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}