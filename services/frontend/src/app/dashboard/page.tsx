'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  COLOR_PALETTE, DASHBOARD_LABELS, ODOO_STATUS_MAP, AUTH_LABELS,
  TRACKING_LABELS, REVIEW_LABELS, BUYER_STAGE_MAP, ORDER_STAGE_KEYS
} from '../../lib/constants';
import { RFQItem, User, RFQDetail, OrderTracking, OrderReview } from '../../lib/odooClient';

// ---------------------------------------------------------------------------
// OrderStepper component — horizontal on desktop, vertical on mobile
// ---------------------------------------------------------------------------
function OrderStepper({ tracking }: { tracking: OrderTracking }) {
  const { buyer_stage, stages, carrier, tracking_reference, tracking_url } = tracking;
  const mainStages = stages.filter(s => ORDER_STAGE_KEYS.includes(s.key));
  const currentIdx = ORDER_STAGE_KEYS.indexOf(buyer_stage);

  // Branch stages shown as a banner instead of a step
  const isBranchStage = !ORDER_STAGE_KEYS.includes(buyer_stage);
  const branchConfig = BUYER_STAGE_MAP[buyer_stage];

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h5 style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
        {TRACKING_LABELS.title}
      </h5>

      {isBranchStage && branchConfig ? (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-full)', backgroundColor: branchConfig.bg, color: branchConfig.text, fontSize: '0.82rem', fontWeight: 600 }}>
          {branchConfig.label}
        </div>
      ) : (
        <div className="order-stepper">
          {mainStages.map((stage, idx) => {
            const isCompleted = currentIdx > idx || (buyer_stage === 'completed' && stage.key === 'completed');
            const isActive = buyer_stage === stage.key && !isCompleted;
            return (
              <div key={stage.key} className={`stepper-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                <div className="stepper-icon">
                  {isCompleted
                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m20 6-11 11-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    : <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'currentColor', display: 'block' }} />
                  }
                </div>
                <div className="stepper-label">{stage.label}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Carrier tracking info — shown when carrier info exists */}
      {(buyer_stage === 'out_for_delivery' || buyer_stage === 'delivered' || buyer_stage === 'completed') && carrier && tracking_reference && (
        <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--primary-border)', fontSize: '0.82rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{TRACKING_LABELS.carrierLabel}:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{carrier.name}</span>
            <span style={{ color: 'var(--text-muted)' }}>·</span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{TRACKING_LABELS.trackingRefLabel}:</span>
            {tracking_url ? (
              <a href={tracking_url as string} target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}>
                {tracking_reference} {TRACKING_LABELS.trackingLinkLabel}
              </a>
            ) : (
              <span style={{ fontWeight: 600 }}>{tracking_reference}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StarRating selector
// ---------------------------------------------------------------------------
function StarRating({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: '0.15rem' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" disabled={disabled}
          onClick={() => onChange(star)}
          onMouseEnter={() => !disabled && setHover(star)}
          onMouseLeave={() => !disabled && setHover(0)}
          style={{ background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer', padding: '0.1rem', lineHeight: 1, fontSize: '1.3rem',
            color: star <= (hover || value) ? '#f59e0b' : '#cbd5e1', transition: 'color 0.1s' }}>
          ★
        </button>
      ))}
    </div>
  );
}


function DashboardSkeleton() {
  return (
    <div className="container" style={{ padding: '2rem 2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div className="skeleton" style={{ width: '200px', height: '1.6rem' }} />
          <div className="skeleton skeleton-text" style={{ width: '280px' }} />
        </div>
        <div className="skeleton" style={{ width: '120px', height: '2rem', borderRadius: 'var(--radius-full)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '2rem' }}>
        <div className="skeleton-card" style={{ gap: '1.25rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i}>
              <div className="skeleton skeleton-text" style={{ width: '40%', marginBottom: '0.25rem' }} />
              <div className="skeleton skeleton-text" style={{ width: '75%', height: '1rem' }} />
            </div>
          ))}
        </div>
        <div>
          <div className="skeleton skeleton-text" style={{ width: '180px', marginBottom: '1rem', height: '1rem' }} />
          <div className="table-container">
            <table className="responsive-table">
              <thead>
                <tr>{[1, 2, 3, 4].map(i => <th key={i}><div className="skeleton skeleton-text" style={{ width: '60%' }} /></th>)}</tr>
              </thead>
              <tbody>
                {[1, 2, 3].map(i => (
                  <tr key={i}>{[1, 2, 3, 4].map(j => <td key={j}><div className="skeleton skeleton-text" style={{ width: ['55%', '70%', '50%', '65%'][j - 1] }} /></td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [rfqItems, setRfqItems] = useState<RFQItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Detail Modal States
  const [selectedRfq, setSelectedRfq] = useState<RFQItem | null>(null);
  const [rfqDetail, setRfqDetail] = useState<RFQDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string>('');
  const [approving, setApproving] = useState<boolean>(false);

  // Order Tracking + Review States
  const [showTracking, setShowTracking] = useState<boolean>(false);
  const [tracking, setTracking] = useState<OrderTracking | null>(null);
  const [trackingLoading, setTrackingLoading] = useState<boolean>(false);
  const [trackingError, setTrackingError] = useState<string>('');

  // Review states
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

      // Update local item status
      setRfqItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, state: 'sale' } : item))
      );
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
      // Refresh tracking to get has_been_reviewed=true + review object
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
      // Refresh tracking
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

        // Sort by date descending
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
      <div className="container" style={{ maxWidth: '440px', padding: '4rem 1rem' }}>
        <div className="auth-card">
          <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 600 }}>{AUTH_LABELS.loginPrompt}</h2>
          <Link href="/login" className="btn btn-primary" style={{ width: '100%' }}>
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem 2rem' }}>
      {/* Top Header */}
      <motion.div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            {DASHBOARD_LABELS.title}
          </h1>
          <p style={{ color: COLOR_PALETTE.textSecondary, fontSize: '0.875rem' }}>
            {DASHBOARD_LABELS.subtitle}
          </p>
        </div>

        {/* Verification Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-white)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
          <span style={{ fontSize: '0.75rem', color: COLOR_PALETTE.textSecondary, fontWeight: 500 }}>Status:</span>
          <span className="badge badge-verified">
            {DASHBOARD_LABELS.statusVerified}
          </span>
        </div>
      </motion.div>

      {errorMsg && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Split Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Company Card */}
        <div className="section-card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem', color: COLOR_PALETTE.textDark }}>
            {DASHBOARD_LABELS.companyInfo}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
            <div>
              <span style={{ color: COLOR_PALETTE.textSecondary, display: 'block', fontSize: '0.7rem', fontWeight: 500, textTransform: 'uppercase', marginBottom: '0.15rem' }}>Organization</span>
              <strong style={{ color: COLOR_PALETTE.textDark, fontWeight: 500 }}>{user?.name}</strong>
            </div>
            <div>
              <span style={{ color: COLOR_PALETTE.textSecondary, display: 'block', fontSize: '0.7rem', fontWeight: 500, textTransform: 'uppercase', marginBottom: '0.15rem' }}>Email</span>
              <strong style={{ color: COLOR_PALETTE.textDark, fontWeight: 500 }}>{user?.email}</strong>
            </div>
            <div>
              <span style={{ color: COLOR_PALETTE.textSecondary, display: 'block', fontSize: '0.7rem', fontWeight: 500, textTransform: 'uppercase', marginBottom: '0.15rem' }}>Account ID</span>
              <strong style={{ color: COLOR_PALETTE.textDark, fontWeight: 500 }}>PARTNER#{user?.partner_id}</strong>
            </div>
          </div>
        </div>

        {/* RFQ Table */}
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
            {DASHBOARD_LABELS.rfqListTitle}
          </h3>

          {rfqItems.length === 0 ? (
            <div style={{ padding: '3rem 2rem', backgroundColor: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)' }}>
              <p style={{ color: COLOR_PALETTE.textSecondary, fontSize: '0.875rem', marginBottom: '1rem' }}>
                {DASHBOARD_LABELS.noRfqs}
              </p>
              <Link href="/" className="btn btn-outline" style={{ fontSize: '0.875rem' }}>
                Browse Catalog
              </Link>
            </div>
          ) : (
            <div className="table-container">
              <table className="responsive-table">
                <thead>
                  <tr>
                    <th>{DASHBOARD_LABELS.tableId}</th>
                    <th>{DASHBOARD_LABELS.tableDate}</th>
                    <th>{DASHBOARD_LABELS.tableTotal}</th>
                    <th>{DASHBOARD_LABELS.tableStatus}</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {rfqItems.map((rfq, i) => {
                      const statusConfig = ODOO_STATUS_MAP[rfq.state] || {
                        label: rfq.state.toUpperCase(),
                        bg: '#f1f5f9',
                        text: '#475569'
                      };

                      return (
                        <motion.tr
                          key={rfq.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25, delay: i * 0.05 }}
                        >
                          <td style={{ fontWeight: 500, color: COLOR_PALETTE.textDark }}>
                            {rfq.name}
                          </td>
                          <td style={{ color: COLOR_PALETTE.textSecondary, fontSize: '0.875rem' }}>
                            {new Date(rfq.date_order).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td style={{ fontWeight: 500 }}>
                            {rfq.amount_total > 0
                              ? `$${rfq.amount_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                              : "Pending"}
                          </td>
                          <td>
                            <span
                              className={`badge ${rfq.state === 'sale' ? 'badge-verified' : rfq.state === 'draft' ? 'badge-pending' : ''}`}
                              style={{
                                backgroundColor: statusConfig.bg,
                                color: statusConfig.text,
                              }}
                            >
                              <span
                                className="status-dot"
                                style={{
                                  backgroundColor: statusConfig.text,
                                  marginRight: '0.15rem'
                                }}
                              />
                              {statusConfig.label}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => handleOpenRFQ(rfq)}
                              className={`btn btn-sm ${rfq.state === 'sent' ? 'btn-primary' : 'btn-outline'}`}
                              style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                            >
                              {rfq.state === 'sent' ? 'Review & Approve' : 'Details'}
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {/* Detail & Approval Modal */}
      <AnimatePresence>
        {selectedRfq && (
          <div className="modal-overlay" onClick={() => setSelectedRfq(null)}>
            <motion.div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div className="modal-header">
                <h3 className="modal-title">Quote Details: {selectedRfq.name}</h3>
                <button className="modal-close-btn" onClick={() => setSelectedRfq(null)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              <div className="modal-body">
                {detailLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem 0' }}>
                    <span className="spinner" style={{ borderTopColor: 'var(--primary)', width: '32px', height: '32px', border: '3px solid rgba(15, 118, 110, 0.1)' }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading quote specifications...</p>
                  </div>
                ) : detailError ? (
                  <div className="alert alert-error" style={{ margin: 0 }}>
                    {detailError}
                  </div>
                ) : rfqDetail ? (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.875rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Date Requested</span>
                        <strong>{new Date(rfqDetail.date_order).toLocaleDateString(undefined, { dateStyle: 'medium' })}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Status</span>
                        <div style={{ marginTop: '0.25rem' }}>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: ODOO_STATUS_MAP[rfqDetail.state]?.bg || '#f1f5f9',
                              color: ODOO_STATUS_MAP[rfqDetail.state]?.text || '#475569',
                              display: 'inline-flex'
                            }}
                          >
                            {ODOO_STATUS_MAP[rfqDetail.state]?.label || rfqDetail.state.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-main)' }}>Items Quoted</h4>
                    <div className="table-container" style={{ marginBottom: '1.5rem' }}>
                      <table className="responsive-table" style={{ fontSize: '0.875rem' }}>
                        <thead>
                          <tr>
                            <th>Product Name</th>
                            <th style={{ textAlign: 'center' }}>Qty</th>
                            <th style={{ textAlign: 'right' }}>Unit Price</th>
                            <th style={{ textAlign: 'right' }}>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rfqDetail.lines.map((line) => (
                            <tr key={line.id}>
                              <td style={{ fontWeight: 500 }}>{line.product_name}</td>
                              <td style={{ textAlign: 'center' }}>{line.product_uom_qty}</td>
                              <td style={{ textAlign: 'right' }}>
                                {line.price_unit > 0 ? `$${line.price_unit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'Pending Quote'}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 500 }}>
                                {line.price_subtotal > 0 ? `$${line.price_subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', padding: '1rem 0', borderTop: '1px solid var(--border-light)' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Estimated Total:</span>
                      <strong style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>
                        {rfqDetail.amount_total > 0 ? `$${rfqDetail.amount_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'Pending Admin Pricing'}
                      </strong>
                    </div>

                    {rfqDetail.state === 'draft' && (
                      <div className="alert alert-success" style={{ margin: '1rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--primary-light)', border: '1px solid var(--primary-border)', color: 'var(--primary)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 16v-4M12 8h.01" />
                        </svg>
                        <span style={{ fontSize: '0.8rem' }}>We are reviewing your request. A formal quotation will be posted here shortly.</span>
                      </div>
                    )}

                    {rfqDetail.state === 'sale' && (
                      <>
                        <div className="alert alert-success" style={{ margin: '1rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <path d="m22 4-10 10.01-3-3" />
                          </svg>
                          <span style={{ fontSize: '0.8rem' }}>This quote has been approved. The order is now being processed.</span>
                        </div>

                        <button
                          onClick={() => handleToggleTracking(rfqDetail.id)}
                          className="btn btn-outline"
                          style={{ marginTop: '1rem', fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                        >
                          {showTracking ? TRACKING_LABELS.hideButton : TRACKING_LABELS.showButton}
                        </button>

                        <AnimatePresence>
                          {showTracking && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              style={{ overflow: 'hidden' }}
                            >
                              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--bg-light)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                                {trackingLoading ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    <span className="spinner" style={{ width: '16px', height: '16px' }} />
                                    Loading order status...
                                  </div>
                                ) : trackingError ? (
                                  <div className="alert alert-error" style={{ margin: 0 }}>{trackingError}</div>
                                ) : tracking ? (
                                  <>
                                    {/* Order Status Stepper */}
                                    <OrderStepper tracking={tracking} />

                                    {/* Shipments */}
                                    <h5 style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                                      {TRACKING_LABELS.pickingsTitle}
                                    </h5>
                                    {tracking.pickings.length === 0 ? (
                                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{TRACKING_LABELS.noPickings}</p>
                                    ) : (
                                      <div className="table-container" style={{ marginBottom: '1rem' }}>
                                        <table className="responsive-table" style={{ fontSize: '0.8rem' }}>
                                          <thead><tr><th>Reference</th><th>Status</th><th>{TRACKING_LABELS.scheduledLabel}</th><th>{TRACKING_LABELS.doneLabel}</th></tr></thead>
                                          <tbody>
                                            {tracking.pickings.map((p) => (
                                              <tr key={p.id}>
                                                <td style={{ fontWeight: 500 }}>{p.name}</td>
                                                <td style={{ textTransform: 'capitalize' }}>{p.state.replace(/_/g, ' ')}</td>
                                                <td>{p.scheduled_date ? new Date(p.scheduled_date as string).toLocaleDateString() : '—'}</td>
                                                <td>{p.date_done ? new Date(p.date_done as string).toLocaleDateString() : '—'}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}

                                    {/* Invoices */}
                                    <h5 style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                                      {TRACKING_LABELS.invoicesTitle}
                                    </h5>
                                    {tracking.invoices.length === 0 ? (
                                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>{TRACKING_LABELS.noInvoices}</p>
                                    ) : (
                                      <div className="table-container" style={{ marginBottom: '1.25rem' }}>
                                        <table className="responsive-table" style={{ fontSize: '0.8rem' }}>
                                          <thead><tr><th>Reference</th><th>Status</th><th>Payment</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
                                          <tbody>
                                            {tracking.invoices.map((inv) => (
                                              <tr key={inv.id}>
                                                <td style={{ fontWeight: 500 }}>{inv.name}</td>
                                                <td style={{ textTransform: 'capitalize' }}>{inv.state}</td>
                                                <td style={{ textTransform: 'capitalize' }}>{inv.payment_state?.replace(/_/g, ' ')}</td>
                                                <td style={{ textAlign: 'right' }}>${inv.amount_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}

                                    {/* Review section — only for completed orders, one-time-ever */}
                                    {tracking.buyer_stage === 'completed' && (
                                      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                        <h5 style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                                          {REVIEW_LABELS.sectionTitle}
                                        </h5>
                                        {tracking.has_been_reviewed ? (
                                          tracking.review ? (
                                            <div style={{ fontSize: '0.82rem' }}>
                                              <div style={{ color: '#f59e0b', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                                                {'★'.repeat(tracking.review.rating)}{'☆'.repeat(5 - tracking.review.rating)}
                                              </div>
                                              {tracking.review.review_text && <p style={{ color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>{tracking.review.review_text}</p>}
                                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                                  {new Date(tracking.review.create_date).toLocaleDateString()}
                                                </span>
                                                <button type="button" onClick={() => handleDeleteReview(tracking.review!.id, tracking.order_id)} style={{ color: '#ef4444', background: 'none', border: 'none', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}>Delete Review</button>
                                              </div>
                                            </div>
                                          ) : (
                                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{REVIEW_LABELS.alreadyReviewed}</p>
                                          )
                                        ) : (
                                          <div>
                                            <AnimatePresence>
                                              {reviewError && <motion.div className="alert alert-error" style={{ marginBottom: '0.75rem', fontSize: '0.8rem' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{reviewError}</motion.div>}
                                              {reviewSuccess && <motion.div className="alert alert-success" style={{ marginBottom: '0.75rem', fontSize: '0.8rem' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{reviewSuccess}</motion.div>}
                                            </AnimatePresence>
                                            {!reviewSuccess && (
                                              <>
                                                <div style={{ marginBottom: '0.5rem' }}>
                                                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>{REVIEW_LABELS.ratingLabel}</label>
                                                  <StarRating value={reviewRating} onChange={setReviewRating} disabled={submittingReview} />
                                                </div>
                                                <div style={{ marginBottom: '0.75rem' }}>
                                                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>{REVIEW_LABELS.reviewTextLabel}</label>
                                                  <textarea className="form-input" rows={2} value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder={REVIEW_LABELS.reviewTextPlaceholder} disabled={submittingReview} style={{ fontSize: '0.82rem' }} />
                                                </div>
                                                <button type="button" className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                                  onClick={() => handleSubmitReview(rfqDetail.id)} disabled={submittingReview}>
                                                  {submittingReview && <span className="spinner" />}
                                                  {submittingReview ? REVIEW_LABELS.submitting : REVIEW_LABELS.submitButton}
                                                </button>
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
              </div>

              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => setSelectedRfq(null)}>
                  Close
                </button>
                {rfqDetail?.state === 'sent' && (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleApproveRFQ(rfqDetail.id)}
                    disabled={approving}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    {approving && <span className="spinner" />}
                    Approve & Order
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}