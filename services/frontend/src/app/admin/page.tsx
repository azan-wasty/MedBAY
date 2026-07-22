'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ShieldAlert, Building2, RotateCcw, Truck, Ship } from 'lucide-react';

import {
  ADMIN_COMPANIES_LABELS,
  ADMIN_RETURNS_LABELS,
  COMPANY_STATUS_MAP,
  RETURN_STATUS_MAP,
  TRACKING_LABELS,
} from '@/lib/constants';
import type { CompanyPartner, AdminReturnRequest, RFQItem, Carrier, User, AdminOrder } from '@/lib/odooClient';
import { Container } from '@/components/shared/Container';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { AdminOverview } from '@/components/admin/AdminOverview';

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

function FilterPills<T extends string>({
  filters,
  active,
  onChange,
}: {
  filters: { value: T; label: string }[];
  active: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={
            active === f.value
              ? 'rounded-full bg-ink-900 px-4 py-1.5 text-[12.5px] font-semibold text-white transition-colors'
              : 'rounded-full border border-ink-200 bg-white px-4 py-1.5 text-[12.5px] font-medium text-ink-600 transition-colors hover:border-ink-300'
          }
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-8">
      <p className="text-sm text-ink-500">{message}</p>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<TabValue>('companies');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [refreshSignal, setRefreshSignal] = useState(0);

  const [companyFilter, setCompanyFilter] = useState<CompanyFilterValue>('');
  const [companies, setCompanies] = useState<CompanyPartner[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [actioningCompanyId, setActioningCompanyId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<CompanyPartner | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [returnFilter, setReturnFilter] = useState<ReturnFilterValue>('');
  const [returns, setReturns] = useState<AdminReturnRequest[]>([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [actioningReturnId, setActioningReturnId] = useState<number | null>(null);

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<AdminOrder | null>(null);
  const [trackingCarrierId, setTrackingCarrierId] = useState<string>('');
  const [trackingReference, setTrackingReference] = useState<string>('');
  const [submittingTracking, setSubmittingTracking] = useState(false);

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
      const res = await fetch(`/api/rfq?state=sale`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load orders');
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
        loadCompanies(companyFilter);
        loadCarriers();
      }
    } catch {
      router.push('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleTabChange = (tab: string) => {
    const t = tab as TabValue;
    setActiveTab(t);
    setErrorMsg('');
    setSuccessMsg('');
    if (t === 'companies') {
      loadCompanies(companyFilter);
    } else if (t === 'returns') {
      loadReturns(returnFilter);
    } else if (t === 'tracking') {
      loadOrders();
    }
  };

  // Lets the overview's KPI cards and chart segments jump straight into a
  // filtered tab view, instead of just switching tabs blind.
  const handleOverviewNavigate = (tab: TabValue, filter?: string) => {
    if (tab === 'companies') {
      const f = (filter as CompanyFilterValue) ?? companyFilter;
      setCompanyFilter(f);
      setActiveTab('companies');
      setErrorMsg('');
      setSuccessMsg('');
      loadCompanies(f);
    } else if (tab === 'returns') {
      const f = (filter as ReturnFilterValue) ?? returnFilter;
      setReturnFilter(f);
      setActiveTab('returns');
      setErrorMsg('');
      setSuccessMsg('');
      loadReturns(f);
    } else {
      handleTabChange(tab);
    }
    document.getElementById('admin-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleVerifyCompany = async (companyId: number) => {
    try {
      setActioningCompanyId(companyId);
      setErrorMsg('');
      const res = await fetch(`/api/admin/companies/${companyId}/verify`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to verify company');
      setCompanies((prev) => prev.map((c) => (c.id === companyId ? { ...c, verification_status: 'verified' } : c)));
      setSuccessMsg('Company verified successfully.');
      setRefreshSignal((s) => s + 1);
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
      setCompanies((prev) => prev.map((c) => (c.id === rejectTarget.id ? { ...c, verification_status: 'rejected' } : c)));
      setRejectTarget(null);
      setRejectReason('');
      setSuccessMsg('Company verification rejected.');
      setRefreshSignal((s) => s + 1);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reject company.');
    } finally {
      setActioningCompanyId(null);
    }
  };

  const handleApproveReturn = async (returnId: number) => {
    try {
      setActioningReturnId(returnId);
      setErrorMsg('');
      const res = await fetch(`/api/admin/returns/${returnId}/approve`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to approve return request');
      setReturns((prev) => prev.map((r) => (r.id === returnId ? { ...r, state: 'approved' } : r)));
      setSuccessMsg('Return request approved. Incoming shipment generated.');
      setRefreshSignal((s) => s + 1);
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
      setReturns((prev) => prev.map((r) => (r.id === returnId ? { ...r, state: 'rejected' } : r)));
      setSuccessMsg('Return request rejected.');
      setRefreshSignal((s) => s + 1);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reject return request.');
    } finally {
      setActioningReturnId(null);
    }
  };

  const handleOpenTrackingSetup = (order: AdminOrder) => {
    setSelectedOrderForTracking(order);
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
          tracking_reference: trackingReference.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to update tracking');

      setSuccessMsg(`Tracking details updated for order ${selectedOrderForTracking.name}.`);
      setSelectedOrderForTracking(null);
      setTrackingCarrierId('');
      setTrackingReference('');
      loadOrders();
      setRefreshSignal((s) => s + 1);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update tracking information.');
    } finally {
      setSubmittingTracking(false);
    }
  };

  if (!authChecked) return null;

  if (!isAdmin) {
    return (
      <Container className="flex max-w-md flex-col items-start gap-4 py-24">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <ShieldAlert className="h-6 w-6" />
        </span>
        <h2 className="font-display text-xl font-semibold text-ink-900">{ADMIN_COMPANIES_LABELS.forbiddenTitle}</h2>
        <p className="text-sm text-ink-500">{ADMIN_COMPANIES_LABELS.forbiddenMsg}</p>
        <Button asChild variant="brand" className="w-full">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </Container>
    );
  }

  return (
    <div className="bg-ink-50/40 py-10 sm:py-14">
      <Container>
        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
            Marketplace Admin Console
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Manage buyer registrations, handle customer return requests, and track shipping operations.
          </p>
        </div>

        <AdminOverview refreshSignal={refreshSignal} onNavigate={handleOverviewNavigate} />

        <div id="admin-tabs" className="scroll-mt-20">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <div className="overflow-x-auto pb-1">
              <TabsList>
                <TabsTrigger value="companies">
                  <Building2 className="mr-1.5 h-3.5 w-3.5" />
                  Company Verification
                </TabsTrigger>
                <TabsTrigger value="returns">
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Return Requests
                </TabsTrigger>
                <TabsTrigger value="tracking">
                  <Truck className="mr-1.5 h-3.5 w-3.5" />
                  Order Tracking &amp; Shipping
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="mt-6">
              <AnimatePresence>
                {errorMsg && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-5">
                    <Alert variant="error">{errorMsg}</Alert>
                  </motion.div>
                )}
                {successMsg && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-5">
                    <Alert variant="success">{successMsg}</Alert>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* TAB 1: COMPANY VERIFICATION */}
            <TabsContent value="companies">
              <FilterPills
                filters={COMPANY_FILTERS}
                active={companyFilter}
                onChange={(v) => {
                  setCompanyFilter(v);
                  loadCompanies(v);
                }}
              />

              {companiesLoading ? (
                <Skeleton className="h-56 w-full rounded-xl" />
              ) : companies.length === 0 ? (
                <EmptyPanel message={ADMIN_COMPANIES_LABELS.noCompanies} />
              ) : (
                <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-soft-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-[13px]">
                      <thead>
                        <tr className="border-b border-ink-100 bg-ink-50/60 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                          <th className="px-4 py-3">{ADMIN_COMPANIES_LABELS.tableName}</th>
                          <th className="px-4 py-3">{ADMIN_COMPANIES_LABELS.tableEmail}</th>
                          <th className="px-4 py-3">{ADMIN_COMPANIES_LABELS.tableReg}</th>
                          <th className="px-4 py-3">{ADMIN_COMPANIES_LABELS.tableStatus}</th>
                          <th className="px-4 py-3">{ADMIN_COMPANIES_LABELS.tableDate}</th>
                          <th className="px-4 py-3 text-right">Actions</th>
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
                              <motion.tr
                                key={c.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="border-b border-ink-100 last:border-b-0 hover:bg-ink-50/40"
                              >
                                <td className="px-4 py-3 font-medium text-ink-900">{c.name}</td>
                                <td className="px-4 py-3 text-ink-500">{c.email || '—'}</td>
                                <td className="px-4 py-3 text-ink-600">{c.registration_number || '—'}</td>
                                <td className="px-4 py-3">
                                  <StatusBadge config={statusConfig} />
                                </td>
                                <td className="px-4 py-3 text-ink-500">{new Date(c.create_date).toLocaleDateString()}</td>
                                <td className="px-4 py-3">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="brand"
                                      onClick={() => handleVerifyCompany(c.id)}
                                      disabled={actioningCompanyId === c.id || c.verification_status === 'verified'}
                                    >
                                      {ADMIN_COMPANIES_LABELS.verifyButton}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        setRejectTarget(c);
                                        setRejectReason('');
                                      }}
                                      disabled={actioningCompanyId === c.id || c.verification_status === 'rejected'}
                                    >
                                      {ADMIN_COMPANIES_LABELS.rejectButton}
                                    </Button>
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
            </TabsContent>

            {/* TAB 2: RETURN REQUESTS */}
            <TabsContent value="returns">
              <FilterPills
                filters={RETURN_FILTERS}
                active={returnFilter}
                onChange={(v) => {
                  setReturnFilter(v);
                  loadReturns(v);
                }}
              />

              {returnsLoading ? (
                <Skeleton className="h-56 w-full rounded-xl" />
              ) : returns.length === 0 ? (
                <EmptyPanel message={ADMIN_RETURNS_LABELS.noReturns} />
              ) : (
                <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-soft-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px] text-left text-[13px]">
                      <thead>
                        <tr className="border-b border-ink-100 bg-ink-50/60 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                          <th className="px-4 py-3">{ADMIN_RETURNS_LABELS.tableRef}</th>
                          <th className="px-4 py-3">{ADMIN_RETURNS_LABELS.tableOrder}</th>
                          <th className="px-4 py-3">{ADMIN_RETURNS_LABELS.tableCompany}</th>
                          <th className="px-4 py-3">{ADMIN_RETURNS_LABELS.tableProduct}</th>
                          <th className="px-4 py-3">{ADMIN_RETURNS_LABELS.tableReason}</th>
                          <th className="px-4 py-3">{ADMIN_RETURNS_LABELS.tableType}</th>
                          <th className="px-4 py-3">{ADMIN_RETURNS_LABELS.tableStatus}</th>
                          <th className="px-4 py-3">{ADMIN_RETURNS_LABELS.tableDate}</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence initial={false}>
                          {returns.map((r) => {
                            const statusConfig = RETURN_STATUS_MAP[r.state] || { label: r.state, bg: '#f1f5f9', text: '#475569' };
                            return (
                              <motion.tr
                                key={r.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="border-b border-ink-100 last:border-b-0 hover:bg-ink-50/40"
                              >
                                <td className="px-4 py-3 font-data font-medium text-ink-900">{r.name}</td>
                                <td className="px-4 py-3 text-ink-600">{r.sale_order_name || '—'}</td>
                                <td className="px-4 py-3 text-ink-500">{r.partner_name || '—'}</td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-ink-900">{r.product_name}</div>
                                  <div className="text-xs text-ink-400">Qty: {r.quantity}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-ink-600">{r.reason_category || '—'}</div>
                                  {r.reason_detail && (
                                    <div
                                      className="max-w-[200px] truncate text-xs italic text-ink-400"
                                      title={r.reason_detail}
                                    >
                                      {r.reason_detail}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 capitalize text-ink-600">{r.return_type}</td>
                                <td className="px-4 py-3">
                                  <StatusBadge config={statusConfig} />
                                </td>
                                <td className="px-4 py-3 text-ink-500">{new Date(r.request_date).toLocaleDateString()}</td>
                                <td className="px-4 py-3">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="brand"
                                      onClick={() => handleApproveReturn(r.id)}
                                      disabled={actioningReturnId === r.id || r.state !== 'requested'}
                                    >
                                      {ADMIN_RETURNS_LABELS.approveButton}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleRejectReturn(r.id)}
                                      disabled={actioningReturnId === r.id || r.state !== 'requested'}
                                    >
                                      {ADMIN_RETURNS_LABELS.rejectButton}
                                    </Button>
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
            </TabsContent>

            {/* TAB 3: ORDER TRACKING & SHIPPING */}
            <TabsContent value="tracking">
              {ordersLoading ? (
                <Skeleton className="h-56 w-full rounded-xl" />
              ) : orders.length === 0 ? (
                <EmptyPanel message='No active confirmed orders found. Only orders in "Ordered/Confirmed" state can receive tracking.' />
              ) : (
                <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-soft-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-[13px]">
                      <thead>
                        <tr className="border-b border-ink-100 bg-ink-50/60 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                          <th className="px-4 py-3">Order Reference</th>
                          <th className="px-4 py-3">Customer Company</th>
                          <th className="px-4 py-3">Date Confirmed</th>
                          <th className="px-4 py-3">Total Amount</th>
                          <th className="px-4 py-3">Shipment Tracking</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((o) => {
                          const trackingSet = !!o.tracking_reference;
                          const ord: any = o;
                          const carrierName = ord.carrier_id ? ord.carrier_id[1] : '';

                          return (
                            <tr key={o.id} className="border-b border-ink-100 last:border-b-0 hover:bg-ink-50/40">
                              <td className="px-4 py-3 font-data font-medium text-ink-900">{o.name}</td>
                              <td className="px-4 py-3 text-ink-600">{Array.isArray(o.partner_id) ? o.partner_id[1] : '—'}</td>
                              <td className="px-4 py-3 text-ink-500">{new Date(o.date_order).toLocaleDateString()}</td>
                              <td className="px-4 py-3 font-medium text-ink-900">
                                ${o.amount_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3">
                                {trackingSet ? (
                                  <div>
                                    <span className="font-medium text-brand-700">{carrierName}</span>
                                    <div className="text-xs text-ink-400">ID: {o.tracking_reference}</div>
                                  </div>
                                ) : (
                                  <span className="text-xs italic text-ink-400">Not yet shipped</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button size="sm" variant="outline" onClick={() => handleOpenTrackingSetup(o)}>
                                  <Ship className="h-3.5 w-3.5" />
                                  {trackingSet ? 'Update Tracking' : 'Ship Order'}
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </Container>

      {/* Company Rejection Modal */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {ADMIN_COMPANIES_LABELS.rejectModalTitle}: {rejectTarget?.name}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Label htmlFor="rejectReason">{ADMIN_COMPANIES_LABELS.rejectReasonLabel}</Label>
            <Textarea id="rejectReason" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} autoFocus />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructiveSolid"
              onClick={handleConfirmRejectCompany}
              disabled={actioningCompanyId === rejectTarget?.id}
            >
              {actioningCompanyId === rejectTarget?.id && <Loader2 className="h-4 w-4 animate-spin" />}
              {ADMIN_COMPANIES_LABELS.confirmReject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Tracking Entry Modal */}
      <Dialog open={!!selectedOrderForTracking} onOpenChange={(open) => !open && setSelectedOrderForTracking(null)}>
        <DialogContent>
          <form onSubmit={handleSubmitTracking}>
            <DialogHeader>
              <DialogTitle>Ship Order / Setup Tracking: {selectedOrderForTracking?.name}</DialogTitle>
            </DialogHeader>
            <DialogBody className="flex flex-col gap-4">
              <div>
                <Label htmlFor="carrierSelect">{TRACKING_LABELS.carrierLabel}</Label>
                <Select
                  id="carrierSelect"
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
                </Select>
              </div>
              <div>
                <Label htmlFor="trackingRef">{TRACKING_LABELS.trackingRefLabel}</Label>
                <Input
                  id="trackingRef"
                  type="text"
                  value={trackingReference}
                  onChange={(e) => setTrackingReference(e.target.value)}
                  placeholder="e.g. 1Z9999999999999999 or AWB12345678"
                  required
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSelectedOrderForTracking(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="brand" disabled={submittingTracking}>
                {submittingTracking && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Shipment &amp; Notify Buyer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}