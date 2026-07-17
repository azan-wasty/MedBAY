'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { COLOR_PALETTE, RETURNS_LABELS, RETURN_STATUS_MAP, AUTH_LABELS } from '../../lib/constants';
import { RFQItem, RFQDetail, RFQLine, ReturnRequest } from '../../lib/odooClient';

export default function ReturnsPage() {
    const router = useRouter();
    const [authChecked, setAuthChecked] = useState(false);

    const [eligibleOrders, setEligibleOrders] = useState<RFQItem[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(true);

    const [selectedOrderId, setSelectedOrderId] = useState<string>('');
    const [orderLines, setOrderLines] = useState<RFQLine[]>([]);
    const [loadingLines, setLoadingLines] = useState(false);

    const [productId, setProductId] = useState<string>('');
    const [quantity, setQuantity] = useState<string>('1');
    const [returnType, setReturnType] = useState<'refund' | 'replacement'>('refund');
    const [reason, setReason] = useState<string>('');

    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState('');

    const [returns, setReturns] = useState<ReturnRequest[]>([]);
    const [loadingReturns, setLoadingReturns] = useState(true);

    const loadReturns = async () => {
        try {
            setLoadingReturns(true);
            const res = await fetch('/api/returns');
            if (res.status === 401) {
                router.push('/login');
                return;
            }
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error || 'Failed to load returns');
            setReturns(Array.isArray(data.returns) ? data.returns : []);
        } catch (err) {
            // Non-fatal: the submission form still works even if history fails to load
            console.error('Error loading return history:', err);
        } finally {
            setLoadingReturns(false);
        }
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('med_user');
        if (!storedUser) {
            router.push('/login');
            return;
        }
        setAuthChecked(true);

        const loadOrders = async () => {
            try {
                setLoadingOrders(true);
                const res = await fetch('/api/rfq');
                if (res.status === 401) {
                    router.push('/login');
                    return;
                }
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to load orders');
                // Only confirmed ("sale") orders have been delivered/invoiced and are eligible for returns
                const eligible = Array.isArray(data) ? data.filter((o: RFQItem) => o.state === 'sale') : [];
                setEligibleOrders(eligible);
            } catch (err) {
                console.error('Error loading eligible orders:', err);
            } finally {
                setLoadingOrders(false);
            }
        };

        loadOrders();
        loadReturns();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    const handleSelectOrder = async (orderId: string) => {
        setSelectedOrderId(orderId);
        setProductId('');
        setOrderLines([]);
        if (!orderId) return;

        try {
            setLoadingLines(true);
            const res = await fetch(`/api/rfq/${orderId}`);
            const data: RFQDetail = await res.json();
            if (!res.ok) throw new Error((data as any).error || 'Failed to load order lines');
            setOrderLines(data.lines || []);
        } catch (err) {
            console.error('Error loading order lines:', err);
        } finally {
            setLoadingLines(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError('');
        setSubmitSuccess('');

        if (!selectedOrderId || !productId || !quantity || !reason.trim()) {
            setSubmitError('Please fill in all fields before submitting.');
            return;
        }

        try {
            setSubmitting(true);
            const res = await fetch('/api/returns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: parseInt(selectedOrderId, 10),
                    product_id: parseInt(productId, 10),
                    quantity: parseFloat(quantity),
                    return_type: returnType,
                    reason: reason.trim(),
                }),
            });
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error || 'Failed to submit return request');

            setSubmitSuccess(`Return request ${data.name || ''} submitted successfully.`);
            setSelectedOrderId('');
            setOrderLines([]);
            setProductId('');
            setQuantity('1');
            setReturnType('refund');
            setReason('');
            loadReturns();
        } catch (err: any) {
            setSubmitError(err.message || 'An error occurred while submitting your return request.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!authChecked) return null;

    return (
        <div className="container" style={{ padding: '2rem 2rem', maxWidth: '960px' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
                    {RETURNS_LABELS.title}
                </h1>
                <p style={{ color: COLOR_PALETTE.textSecondary, fontSize: '0.875rem' }}>
                    {RETURNS_LABELS.subtitle}
                </p>
            </div>

            <div className="section-card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1.25rem' }}>
                    {RETURNS_LABELS.formTitle}
                </h3>

                <AnimatePresence>
                    {submitError && (
                        <motion.div className="alert alert-error" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginBottom: '1rem' }}>
                            {submitError}
                        </motion.div>
                    )}
                    {submitSuccess && (
                        <motion.div className="alert alert-success" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginBottom: '1rem' }}>
                            {submitSuccess}
                        </motion.div>
                    )}
                </AnimatePresence>

                {loadingOrders ? (
                    <div className="skeleton skeleton-text" style={{ width: '60%' }} />
                ) : eligibleOrders.length === 0 ? (
                    <p style={{ fontSize: '0.875rem', color: COLOR_PALETTE.textMuted }}>
                        {RETURNS_LABELS.noEligibleOrders}
                    </p>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">{RETURNS_LABELS.orderLabel}</label>
                            <select
                                className="form-input"
                                value={selectedOrderId}
                                onChange={(e) => handleSelectOrder(e.target.value)}
                                disabled={submitting}
                                required
                            >
                                <option value="">{RETURNS_LABELS.orderPlaceholder}</option>
                                {eligibleOrders.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.name} — {new Date(o.date_order).toLocaleDateString()}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedOrderId && (
                            <div className="form-group">
                                <label className="form-label">{RETURNS_LABELS.productLabel}</label>
                                <select
                                    className="form-input"
                                    value={productId}
                                    onChange={(e) => setProductId(e.target.value)}
                                    disabled={submitting || loadingLines}
                                    required
                                >
                                    <option value="">{loadingLines ? 'Loading products...' : 'Select a product from this order...'}</option>
                                    {orderLines.map((line) => (
                                        <option key={line.id} value={line.product_id}>
                                            {line.product_name} (Ordered: {line.product_uom_qty})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">{RETURNS_LABELS.quantityLabel}</label>
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                className="form-input"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                disabled={submitting}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">{RETURNS_LABELS.typeLabel}</label>
                            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        name="return_type"
                                        checked={returnType === 'refund'}
                                        onChange={() => setReturnType('refund')}
                                        disabled={submitting}
                                    />
                                    {RETURNS_LABELS.refundOption}
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        name="return_type"
                                        checked={returnType === 'replacement'}
                                        onChange={() => setReturnType('replacement')}
                                        disabled={submitting}
                                    />
                                    {RETURNS_LABELS.replacementOption}
                                </label>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label className="form-label">{RETURNS_LABELS.reasonLabel}</label>
                            <textarea
                                className="form-input"
                                rows={3}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder={RETURNS_LABELS.reasonPlaceholder}
                                disabled={submitting}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={submitting}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            {submitting && <span className="spinner" />}
                            {submitting ? RETURNS_LABELS.submitting : RETURNS_LABELS.submitButton}
                        </button>
                    </form>
                )}
            </div>

            <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                    {RETURNS_LABELS.historyTitle}
                </h3>

                {loadingReturns ? (
                    <div className="skeleton-card" />
                ) : returns.length === 0 ? (
                    <div style={{ padding: '2rem', backgroundColor: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)' }}>
                        <p style={{ color: COLOR_PALETTE.textSecondary, fontSize: '0.875rem', margin: 0 }}>
                            {RETURNS_LABELS.noReturns}
                        </p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="responsive-table">
                            <thead>
                                <tr>
                                    <th>{RETURNS_LABELS.tableName}</th>
                                    <th>{RETURNS_LABELS.tableProduct}</th>
                                    <th>{RETURNS_LABELS.tableQty}</th>
                                    <th>{RETURNS_LABELS.tableType}</th>
                                    <th>{RETURNS_LABELS.tableStatus}</th>
                                    <th>{RETURNS_LABELS.tableDate}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {returns.map((r) => {
                                    const statusConfig = RETURN_STATUS_MAP[r.state] || { label: r.state, bg: '#f1f5f9', text: '#475569' };
                                    return (
                                        <tr key={r.id}>
                                            <td style={{ fontWeight: 500 }}>{r.name}</td>
                                            <td>{r.product_name}</td>
                                            <td>{r.quantity}</td>
                                            <td style={{ textTransform: 'capitalize' }}>{r.return_type}</td>
                                            <td>
                                                <span className="badge" style={{ backgroundColor: statusConfig.bg, color: statusConfig.text }}>
                                                    {statusConfig.label}
                                                </span>
                                            </td>
                                            <td>{new Date(r.request_date).toLocaleDateString()}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}