'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  COLOR_PALETTE,
  ADMIN_COMPANIES_LABELS,
  ADMIN_RETURNS_LABELS,
  COMPANY_STATUS_MAP,
  RETURN_STATUS_MAP,
  TRACKING_LABELS
} from '../../lib/constants';
import {
  CompanyPartner,
  AdminReturnRequest,
  RFQItem,
  Carrier,
  User
} from '../../lib/odooClient';

export interface AdminOrder extends RFQItem {
  partner_id: [number, string] | boolean;
  carrier_id?: [number, string] | boolean;
  tracking_reference?: string | boolean;
}

type TabValue = 'companies' | 'returns' | 'tracking';
type CompanyFilterValue = '' | 'pending' | 'verified' | 'rejected';
type ReturnFilterValue = '' | 'requested' | 'approved' | 'rejected';

const COMPANY_FILTERS: { value: CompanyFilterValue; label: string }[] = [
  { value: '', label: ADMIN_COMPANIES_LABELS.filterAll },
  { value: 'pending', label: ADMIN_COMPANIES_LABELS.filterPending },
  { value: 'verified', label: ADMIN_COMPANIES_LABELS.filterVerified },
  { value: 'rejected', label: ADMIN_COMPANIES_LABELS.filterRejected },
];

const RETURN_FILTERS: { value: ReturnFilterValue; label: string }[] = [
  { value: '', label: ADMIN_RETURNS_LABELS.filterAll },
  { value: 'requested', label: ADMIN_RETURNS_LABELS.filterUnderReview },
  { value: 'approved', label: ADMIN_RETURNS_LABELS.filterApproved },
  { value: 'rejected', label: ADMIN_RETURNS_LABELS.filterRejected },
];

export default function AdminPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<TabValue>('companies');

  // Shared status/error messages
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // -------------------------------------------------------------------------
  // Tab 1: Companies State
  // -------------------------------------------------------------------------
  const [companyFilter, setCompanyFilter] = useState<CompanyFilterValue>('');
  const [companies, setCompanies] = useState<CompanyPartner[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [actioningCompanyId, setActioningCompanyId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<CompanyPartner | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // -------------------------------------------------------------------------
  // Tab 2: Returns State
  // -------------------------------------------------------------------------
  const [returnFilter, setReturnFilter] = useState<ReturnFilterValue>('');
  const [returns, setReturns] = useState<AdminReturnRequest[]>([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [actioningReturnId, setActioningReturnId] = useState<number | null>(null);

  // -------------------------------------------------------------------------
  // Tab 3: Order Tracking State
  // -------------------------------------------------------------------------
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<AdminOrder | null>(null);
  const [trackingCarrierId, setTrackingCarrierId] = useState<string>('');
  const [trackingReference, setTrackingReference] = useState<string>('');
  const [submittingTracking, setSubmittingTracking] = useState(false);

  // -------------------------------------------------------------------------
  // Loaders
  // -------------------------------------------------------------------------
  const loadCompanies = async (status: CompanyFilterValue) => {
    try {
      setCompaniesLoading(true);
      setErrorMsg('');
      const query = status ? `?status=${status}` : '';
      const res = await fetch(`/api/admin/companies${query}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load companies');
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to load companies.');
    } finally {
      setCompaniesLoading(false);
    }
  };

  const loadReturns = async (status: ReturnFilterValue) => {
    try {
      setReturnsLoading(true);
      setErrorMsg('');
      const query = status ? `?status=${status}` : '';
      const res = await fetch(`/api/admin/returns${query}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load returns');
      setReturns(Array.isArray(data.returns) ? data.returns : []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to load returns.');
    } finally {
      setReturnsLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      setOrdersLoading(true);
      setErrorMsg('');
      // Retrieve orders in 'sale' state so admin can enter/update tracking information
      const res = await fetch(`/api/rfq?state=sale`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load orders');
      // Just double check state filtering
      const confirmedOrders = Array.isArray(data) ? data.filter((o: any) => o.state === 'sale') : [];
      setOrders(confirmedOrders);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to load confirmed orders.');
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadCarriers = async () => {
    try {
      // Fetch carriers list
      const carriersRes = await fetch(`/api/admin/carriers`);
      const data = await carriersRes.json();
      if (carriersRes.ok) {
        setCarriers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error loading carriers:', err);
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
        // Initial load for default tab
        loadCompanies(companyFilter);
        loadCarriers();
      }
    } catch {
      router.push('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Tab switching handler
  const handleTabChange = (tab: TabValue) => {
    setActiveTab(tab);
    setErrorMsg('');
    setSuccessMsg('');
    if (tab === 'companies') {
      loadCompanies(companyFilter);
    } else if (tab === 'returns') {
      loadReturns(returnFilter);
    } else if (tab === 'tracking') {
      loadOrders();
    }
  };

  // -------------------------------------------------------------------------
  // Tab 1: Companies Actions
  // -------------------------------------------------------------------------
  const handleVerifyCompany = async (companyId: number) => {
    try {
      setActioningCompanyId(companyId);
      setErrorMsg('');
      const res = await fetch(`/api/admin/companies/${companyId}/verify`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to verify company');
      setCompanies((prev) =>
        prev.map((c) => (c.id === companyId ? { ...c, verification_status: 'verified' } : c))
      );
      setSuccessMsg('Company verified successfully.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to verify company.');
    } finally {
      setActioningCompanyId(null);
    }
  };

  const handleConfirmRejectCompany = async () => {
    if (!rejectTarget) return;
    try {
      setActioningCompanyId(rejectTarget.id);
      setErrorMsg('');
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
      setSuccessMsg('Company verification rejected.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reject company.');
    } finally {
      setActioningCompanyId(null);
    }
  };

  // -------------------------------------------------------------------------
  // Tab 2: Returns Actions
  // -------------------------------------------------------------------------
  const handleApproveReturn = async (returnId: number) => {
    try {
      setActioningReturnId(returnId);
      setErrorMsg('');
      const res = await fetch(`/api/admin/returns/${returnId}/approve`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to approve return request');
      setReturns((prev) =>
        prev.map((r) => (r.id === returnId ? { ...r, state: 'approved' } : r))
      );
      setSuccessMsg('Return request approved. Incoming shipment generated.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to approve return request.');
    } finally {
      setActioningReturnId(null);
    }
  };

  const handleRejectReturn = async (returnId: number) => {
    try {
      setActioningReturnId(returnId);
      setErrorMsg('');
      const res = await fetch(`/api/admin/returns/${returnId}/reject`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to reject return request');
      setReturns((prev) =>
        prev.map((r) => (r.id === returnId ? { ...r, state: 'rejected' } : r))
      );
      setSuccessMsg('Return request rejected.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reject return request.');
    } finally {
      setActioningReturnId(null);
    }
  };

  // -------------------------------------------------------------------------
  // Tab 3: Order Tracking Actions
  // -------------------------------------------------------------------------
  const handleOpenTrackingSetup = (order: AdminOrder) => {
    setSelectedOrderForTracking(order);
    // Cast or handle any existing properties
    const o: any = order;
    setTrackingCarrierId(o.carrier_id ? String(o.carrier_id[0]) : '');
    setTrackingReference(o.tracking_reference || '');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSubmitTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForTracking || !trackingCarrierId || !trackingReference.trim()) {
      setErrorMsg('Please select a carrier and enter a tracking reference.');
      return;
    }

    try {
      setSubmittingTracking(true);
      setErrorMsg('');
      setSuccessMsg('');
      const res = await fetch(`/api/admin/orders/${selectedOrderForTracking.id}/tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carrier_id: parseInt(trackingCarrierId, 10),
          tracking_reference: trackingReference.trim()
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to update tracking');

      setSuccessMsg(`Tracking details updated for order ${selectedOrderForTracking.name}.`);
      setSelectedOrderForTracking(null);
      setTrackingCarrierId('');
      setTrackingReference('');
      loadOrders(); // reload tracking list
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update tracking information.');
    } finally {
      setSubmittingTracking(false);
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
      {/* Top Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
          Marketplace Admin Console
        </h1>
        <p style={{ color: COLOR_PALETTE.textSecondary, fontSize: '0.875rem' }}>
          Manage buyer registrations, handle customer return requests, and track shipping operations.
        </p>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => handleTabChange('companies')}
          className={`btn ${activeTab === 'companies' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: '0.875rem', padding: '0.5rem 1.25rem' }}
        >
          Company Verification
        </button>
        <button
          onClick={() => handleTabChange('returns')}
          className={`btn ${activeTab === 'returns' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: '0.875rem', padding: '0.5rem 1.25rem' }}
        >
          Return Requests
        </button>
        <button
          onClick={() => handleTabChange('tracking')}
          className={`btn ${activeTab === 'tracking' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: '0.875rem', padding: '0.5rem 1.25rem' }}
        >
          Order Tracking & Shipping
        </button>
      </div>

      {/* Status Notifications */}
      {errorMsg && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          {successMsg}
        </div>
      )}

      {/* -----------------------------------------------------------------------
          TAB 1: COMPANY VERIFICATION
          ----------------------------------------------------------------------- */}
      {activeTab === 'companies' && (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {COMPANY_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setCompanyFilter(f.value);
                  loadCompanies(f.value);
                }}
                className={`btn ${companyFilter === f.value ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {companiesLoading ? (
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
                                onClick={() => handleVerifyCompany(c.id)}
                                disabled={actioningCompanyId === c.id || c.verification_status === 'verified'}
                                className="btn btn-sm btn-primary"
                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                              >
                                {ADMIN_COMPANIES_LABELS.verifyButton}
                              </button>
                              <button
                                onClick={() => { setRejectTarget(c); setRejectReason(''); }}
                                disabled={actioningCompanyId === c.id || c.verification_status === 'rejected'}
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
        </div>
      )}

      {/* -----------------------------------------------------------------------
          TAB 2: RETURN REQUESTS
          ----------------------------------------------------------------------- */}
      {activeTab === 'returns' && (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {RETURN_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setReturnFilter(f.value);
                  loadReturns(f.value);
                }}
                className={`btn ${returnFilter === f.value ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {returnsLoading ? (
            <div className="skeleton-card" />
          ) : returns.length === 0 ? (
            <div style={{ padding: '2rem', backgroundColor: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)' }}>
              <p style={{ color: COLOR_PALETTE.textSecondary, fontSize: '0.875rem', margin: 0 }}>
                {ADMIN_RETURNS_LABELS.noReturns}
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="responsive-table">
                <thead>
                  <tr>
                    <th>{ADMIN_RETURNS_LABELS.tableRef}</th>
                    <th>{ADMIN_RETURNS_LABELS.tableOrder}</th>
                    <th>{ADMIN_RETURNS_LABELS.tableCompany}</th>
                    <th>{ADMIN_RETURNS_LABELS.tableProduct}</th>
                    <th>{ADMIN_RETURNS_LABELS.tableReason}</th>
                    <th>{ADMIN_RETURNS_LABELS.tableType}</th>
                    <th>{ADMIN_RETURNS_LABELS.tableStatus}</th>
                    <th>{ADMIN_RETURNS_LABELS.tableDate}</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {returns.map((r) => {
                      const statusConfig = RETURN_STATUS_MAP[r.state] || {
                        label: r.state,
                        bg: '#f1f5f9',
                        text: '#475569',
                      };
                      return (
                        <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <td style={{ fontWeight: 500 }}>{r.name}</td>
                          <td>{r.sale_order_name || '—'}</td>
                          <td style={{ fontSize: '0.875rem', color: COLOR_PALETTE.textSecondary }}>{r.partner_name || '—'}</td>
                          <td>
                            <div style={{ fontWeight: 500 }}>{r.product_name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Qty: {r.quantity}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.875rem' }}>{r.reason_category || '—'}</div>
                            {r.reason_detail && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.reason_detail}>
                                {r.reason_detail}
                              </div>
                            )}
                          </td>
                          <td style={{ textTransform: 'capitalize', fontSize: '0.875rem' }}>{r.return_type}</td>
                          <td>
                            <span className="badge" style={{ backgroundColor: statusConfig.bg, color: statusConfig.text }}>
                              {statusConfig.label}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.875rem', color: COLOR_PALETTE.textSecondary }}>
                            {new Date(r.request_date).toLocaleDateString()}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleApproveReturn(r.id)}
                                disabled={actioningReturnId === r.id || r.state !== 'requested'}
                                className="btn btn-sm btn-primary"
                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                              >
                                {ADMIN_RETURNS_LABELS.approveButton}
                              </button>
                              <button
                                onClick={() => handleRejectReturn(r.id)}
                                disabled={actioningReturnId === r.id || r.state !== 'requested'}
                                className="btn btn-sm btn-danger-outline"
                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                              >
                                {ADMIN_RETURNS_LABELS.rejectButton}
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
        </div>
      )}

      {/* -----------------------------------------------------------------------
          TAB 3: ORDER TRACKING & SHIPPING
          ----------------------------------------------------------------------- */}
      {activeTab === 'tracking' && (
        <div>
          {ordersLoading ? (
            <div className="skeleton-card" />
          ) : orders.length === 0 ? (
            <div style={{ padding: '2rem', backgroundColor: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)' }}>
              <p style={{ color: COLOR_PALETTE.textSecondary, fontSize: '0.875rem', margin: 0 }}>
                No active confirmed orders found. Only orders in "Ordered/Confirmed" state can receive tracking.
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="responsive-table">
                <thead>
                  <tr>
                    <th>Order Reference</th>
                    <th>Customer Company</th>
                    <th>Date Confirmed</th>
                    <th>Total Amount</th>
                    <th>Shipment Tracking</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const trackingSet = !!o.tracking_reference;
                    // Cast carrier field to any
                    const ord: any = o;
                    const carrierName = ord.carrier_id ? ord.carrier_id[1] : '';

                    return (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 500 }}>{o.name}</td>
                        <td style={{ fontSize: '0.875rem' }}>{Array.isArray(o.partner_id) ? o.partner_id[1] : '—'}</td>
                        <td style={{ fontSize: '0.875rem', color: COLOR_PALETTE.textSecondary }}>
                          {new Date(o.date_order).toLocaleDateString()}
                        </td>
                        <td style={{ fontWeight: 500 }}>
                          ${o.amount_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td>
                          {trackingSet ? (
                            <div style={{ fontSize: '0.8rem' }}>
                              <span style={{ fontWeight: 500, color: 'var(--primary)' }}>{carrierName}</span>
                              <div style={{ color: 'var(--text-muted)' }}>ID: {o.tracking_reference}</div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              Not yet shipped
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleOpenTrackingSetup(o)}
                            className="btn btn-sm btn-outline"
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                          >
                            {trackingSet ? 'Update Tracking' : 'Ship Order'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* -----------------------------------------------------------------------
          MODALS
          ----------------------------------------------------------------------- */}

      {/* Company Rejection Modal */}
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
                  onClick={handleConfirmRejectCompany}
                  disabled={actioningCompanyId === rejectTarget.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {actioningCompanyId === rejectTarget.id && <span className="spinner" />}
                  {ADMIN_COMPANIES_LABELS.confirmReject}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Tracking Entry Modal */}
      <AnimatePresence>
        {selectedOrderForTracking && (
          <div className="modal-overlay" onClick={() => setSelectedOrderForTracking(null)}>
            <motion.div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <form onSubmit={handleSubmitTracking}>
                <div className="modal-header">
                  <h3 className="modal-title">Ship Order / Setup Tracking: {selectedOrderForTracking.name}</h3>
                  <button type="button" className="modal-close-btn" onClick={() => setSelectedOrderForTracking(null)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">{TRACKING_LABELS.carrierLabel}</label>
                    <select
                      className="form-input"
                      value={trackingCarrierId}
                      onChange={(e) => setTrackingCarrierId(e.target.value)}
                      required
                    >
                      <option value="">Select carrier company...</option>
                      {carriers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">{TRACKING_LABELS.trackingRefLabel}</label>
                    <input
                      type="text"
                      className="form-input"
                      value={trackingReference}
                      onChange={(e) => setTrackingReference(e.target.value)}
                      placeholder="e.g. 1Z9999999999999999 or AWB12345678"
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline" onClick={() => setSelectedOrderForTracking(null)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submittingTracking}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    {submittingTracking && <span className="spinner" />}
                    Save Shipment & Notify Buyer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}