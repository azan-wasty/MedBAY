'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { COLOR_PALETTE, ADMIN_COMPANIES_LABELS, COMPANY_STATUS_MAP } from '../../../lib/constants';
import { CompanyPartner, User } from '../../../lib/odooClient';

type FilterValue = '' | 'pending' | 'verified' | 'rejected';

const FILTERS: { value: FilterValue; label: string }[] = [
    { value: '', label: ADMIN_COMPANIES_LABELS.filterAll },
    { value: 'pending', label: ADMIN_COMPANIES_LABELS.filterPending },
    { value: 'verified', label: ADMIN_COMPANIES_LABELS.filterVerified },
    { value: 'rejected', label: ADMIN_COMPANIES_LABELS.filterRejected },
];

export default function AdminCompaniesPage() {
    const router = useRouter();
    const [authChecked, setAuthChecked] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    const [filter, setFilter] = useState<FilterValue>('');
    const [companies, setCompanies] = useState<CompanyPartner[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    const [actioningId, setActioningId] = useState<number | null>(null);
    const [rejectTarget, setRejectTarget] = useState<CompanyPartner | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    const loadCompanies = async (status: FilterValue) => {
        try {
            setLoading(true);
            setErrorMsg('');
            const query = status ? `?status=${status}` : '';
            const res = await fetch(`/api/admin/companies${query}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load companies');
            setCompanies(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setErrorMsg(err.message || 'Unable to load companies.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('med_user');
        if (!storedUser) {
            router.push('/login');
            return;
        }
        try {
            const user: User = JSON.parse(storedUser);
            setIsAdmin(!!user.is_admin);
            setAuthChecked(true);
            if (user.is_admin) {
                loadCompanies(filter);
            }
        } catch {
            router.push('/login');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    const handleFilterChange = (value: FilterValue) => {
        setFilter(value);
        loadCompanies(value);
    };

    const handleVerify = async (companyId: number) => {
        try {
            setActioningId(companyId);
            const res = await fetch(`/api/admin/companies/${companyId}/verify`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error || 'Failed to verify company');
            setCompanies((prev) =>
                prev.map((c) => (c.id === companyId ? { ...c, verification_status: 'verified' } : c))
            );
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to verify company.');
        } finally {
            setActioningId(null);
        }
    };

    const handleConfirmReject = async () => {
        if (!rejectTarget) return;
        try {
            setActioningId(rejectTarget.id);
            const res = await fetch(`/api/admin/companies/${rejectTarget.id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: rejectReason }),
            });
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error || 'Failed to reject company');
            setCompanies((prev) =>
                prev.map((c) => (c.id === rejectTarget.id ? { ...c, verification_status: 'rejected' } : c))
            );
            setRejectTarget(null);
            setRejectReason('');
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to reject company.');
        } finally {
            setActioningId(null);
        }
    };

    if (!authChecked) return null;

    if (!isAdmin) {
        return (
            <div className="container" style={{ maxWidth: '440px', padding: '4rem 1rem' }}>
                <div className="auth-card">
                    <h2 style={{ marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: 600 }}>
                        {ADMIN_COMPANIES_LABELS.forbiddenTitle}
                    </h2>
                    <p style={{ color: COLOR_PALETTE.textSecondary, fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                        {ADMIN_COMPANIES_LABELS.forbiddenMsg}
                    </p>
                    <Link href="/dashboard" className="btn btn-primary" style={{ width: '100%' }}>
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ padding: '2rem 2rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
                    {ADMIN_COMPANIES_LABELS.title}
                </h1>
                <p style={{ color: COLOR_PALETTE.textSecondary, fontSize: '0.875rem' }}>
                    {ADMIN_COMPANIES_LABELS.subtitle}
                </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {FILTERS.map((f) => (
                    <button
                        key={f.value}
                        onClick={() => handleFilterChange(f.value)}
                        className={`btn ${filter === f.value ? 'btn-primary' : 'btn-outline'}`}
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {errorMsg && (
                <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
                    {errorMsg}
                </div>
            )}

            {loading ? (
                <div className="skeleton-card" />
            ) : companies.length === 0 ? (
                <div style={{ padding: '2rem', backgroundColor: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)' }}>
                    <p style={{ color: COLOR_PALETTE.textSecondary, fontSize: '0.875rem', margin: 0 }}>
                        {ADMIN_COMPANIES_LABELS.noCompanies}
                    </p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="responsive-table">
                        <thead>
                            <tr>
                                <th>{ADMIN_COMPANIES_LABELS.tableName}</th>
                                <th>{ADMIN_COMPANIES_LABELS.tableEmail}</th>
                                <th>{ADMIN_COMPANIES_LABELS.tableReg}</th>
                                <th>{ADMIN_COMPANIES_LABELS.tableStatus}</th>
                                <th>{ADMIN_COMPANIES_LABELS.tableDate}</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence initial={false}>
                                {companies.map((c) => {
                                    const statusConfig = COMPANY_STATUS_MAP[c.verification_status] || {
                                        label: c.verification_status,
                                        bg: '#f1f5f9',
                                        text: '#475569',
                                    };
                                    return (
                                        <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            <td style={{ fontWeight: 500 }}>{c.name}</td>
                                            <td style={{ fontSize: '0.875rem', color: COLOR_PALETTE.textSecondary }}>{c.email || '—'}</td>
                                            <td style={{ fontSize: '0.875rem' }}>{c.registration_number || '—'}</td>
                                            <td>
                                                <span className="badge" style={{ backgroundColor: statusConfig.bg, color: statusConfig.text }}>
                                                    {statusConfig.label}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.875rem', color: COLOR_PALETTE.textSecondary }}>
                                                {new Date(c.create_date).toLocaleDateString()}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => handleVerify(c.id)}
                                                        disabled={actioningId === c.id || c.verification_status === 'verified'}
                                                        className="btn btn-sm btn-primary"
                                                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                                                    >
                                                        {ADMIN_COMPANIES_LABELS.verifyButton}
                                                    </button>
                                                    <button
                                                        onClick={() => { setRejectTarget(c); setRejectReason(''); }}
                                                        disabled={actioningId === c.id || c.verification_status === 'rejected'}
                                                        className="btn btn-sm btn-danger-outline"
                                                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                                                    >
                                                        {ADMIN_COMPANIES_LABELS.rejectButton}
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            )}

            <AnimatePresence>
                {rejectTarget && (
                    <div className="modal-overlay" onClick={() => setRejectTarget(null)}>
                        <motion.div
                            className="modal-content"
                            onClick={(e) => e.stopPropagation()}
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                        >
                            <div className="modal-header">
                                <h3 className="modal-title">{ADMIN_COMPANIES_LABELS.rejectModalTitle}: {rejectTarget.name}</h3>
                                <button className="modal-close-btn" onClick={() => setRejectTarget(null)}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">{ADMIN_COMPANIES_LABELS.rejectReasonLabel}</label>
                                    <textarea
                                        className="form-input"
                                        rows={3}
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-outline" onClick={() => setRejectTarget(null)}>
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-danger-outline"
                                    onClick={handleConfirmReject}
                                    disabled={actioningId === rejectTarget.id}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    {actioningId === rejectTarget.id && <span className="spinner" />}
                                    {ADMIN_COMPANIES_LABELS.confirmReject}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}