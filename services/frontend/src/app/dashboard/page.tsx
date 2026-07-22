'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Loader2,
  ShieldCheck,
  FileText,
  Truck,
  CheckCircle2,
  Info,
  Trash2,
} from 'lucide-react';

import {
  DASHBOARD_LABELS, ODOO_STATUS_MAP, AUTH_LABELS,
  TRACKING_LABELS, REVIEW_LABELS,
} from '@/lib/constants';
import type { RFQItem, User, RFQDetail, OrderTracking } from '@/lib/odooClient';
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

  const [selectedRfq, setSelectedRfq] = useState<RFQItem | null>(null);
  const [rfqDetail, setRfqDetail] = useState<RFQDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string>('');
  const [approving, setApproving] = useState<boolean>(false);

  const [showTracking, setShowTracking] = useState<boolean>(false);
  const [tracking, setTracking] = useState<OrderTracking | null>(null);
  const [trackingLoading, setTrackingLoading] = useState<boolean>(false);
  const [trackingError, setTrackingError] = useState<string>('');

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

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

  const handleApproveRFQ = async (id: number) => {
    try {
      setApproving(true);
      setDetailError('');
      const res = await fetch(`/api/rfq/${id}/approve`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to approve quotation.');
      }

      setRfqItems((prev) => prev.map((item) => (item.id === id ? { ...item, state: 'sale' } : item)));
      if (rfqDetail) {
        setRfqDetail({ ...rfqDetail, state: 'sale' });
      }
    } catch (err: any) {
      setDetailError(err.message || 'An error occurred during approval.');
    } finally {
      setApproving(false);
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
      setUser(JSON.parse(storedUser));
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
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="mb-8 flex flex-wrap items-center justify-between gap-4"
        >
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
              {DASHBOARD_LABELS.title}
            </h1>
            <p className="mt-1 text-sm text-ink-500">{DASHBOARD_LABELS.subtitle}</p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-ink-100 bg-white px-3.5 py-2">
            <span className="text-xs font-medium text-ink-500">Status:</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              <ShieldCheck className="h-3 w-3" />
              {DASHBOARD_LABELS.statusVerified}
            </span>
          </div>
        </motion.div>

        {errorMsg && (
          <div className="mb-6">
            <Alert variant="error">{errorMsg}</Alert>
          </div>
        )}

        <BuyerOverview rfqItems={rfqItems} onSelectRFQ={handleOpenRFQ} />

        <div id="rfq-list" className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[260px_1fr] lg:gap-8 scroll-mt-20">
          {/* Company card */}
          <div className="rounded-xl border border-ink-100 bg-white p-5 lg:sticky lg:top-24">
            <h3 className="mb-4 border-b border-ink-100 pb-3 font-display text-[14px] font-semibold text-ink-900">
              {DASHBOARD_LABELS.companyInfo}
            </h3>
            <div className="flex flex-col gap-3.5 text-sm">
              <div>
                <span className="mb-0.5 block text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">
                  Organization
                </span>
                <strong className="font-medium text-ink-900">{user?.name}</strong>
              </div>
              <div>
                <span className="mb-0.5 block text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">
                  Email
                </span>
                <strong className="break-all font-medium text-ink-900">{user?.email}</strong>
              </div>
              <div>
                <span className="mb-0.5 block text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">
                  Account ID
                </span>
                <strong className="font-data font-medium text-ink-900">PARTNER#{user?.partner_id}</strong>
              </div>
            </div>
          </div>

          {/* RFQ list */}
          <div className="min-w-0">
            <h3 className="mb-4 font-display text-[15px] font-semibold text-ink-900">{DASHBOARD_LABELS.rfqListTitle}</h3>

            {rfqItems.length === 0 ? (
              <div className="rounded-xl border border-ink-100 bg-white p-8">
                <p className="mb-4 text-sm text-ink-500">{DASHBOARD_LABELS.noRfqs}</p>
                <Button asChild variant="outline">
                  <Link href="/">Browse Catalog</Link>
                </Button>
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
                        {rfqItems.map((rfq, i) => {
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
                                <Button
                                  size="sm"
                                  variant={rfq.state === 'sent' ? 'brand' : 'outline'}
                                  onClick={() => handleOpenRFQ(rfq)}
                                >
                                  {rfq.state === 'sent' ? 'Review & Approve' : 'Details'}
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
        </div>
      </Container>

      {/* Detail & Approval Modal */}
      <Dialog open={!!selectedRfq} onOpenChange={(open) => !open && setSelectedRfq(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Quote Details: {selectedRfq?.name}</DialogTitle>
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

                <h4 className="mb-2.5 text-[13px] font-semibold text-ink-900">Items Quoted</h4>
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
                              <td className={`px-3 py-2.5 text-right ${
                                isAboveTarget ? 'text-amber-600 font-semibold' : 'text-ink-600'
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

                {rfqDetail.state === 'draft' && (
                  <Alert variant="info" icon>
                    <span className="text-[13px]">We are reviewing your request. A formal quotation will be posted here shortly.</span>
                  </Alert>
                )}

                {rfqDetail.state === 'sale' && (
                  <>
                    <Alert variant="success" icon>
                      <span className="text-[13px]">This quote has been approved. The order is now being processed.</span>
                    </Alert>

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

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRfq(null)}>
              Close
            </Button>
            {rfqDetail?.state === 'sent' && (
              <Button variant="brand" onClick={() => handleApproveRFQ(rfqDetail.id)} disabled={approving}>
                {approving && <Loader2 className="h-4 w-4 animate-spin" />}
                Approve &amp; Order
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
