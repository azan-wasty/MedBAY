'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RotateCcw, PackageOpen } from 'lucide-react';

import { RETURNS_LABELS, RETURN_STATUS_MAP } from '@/lib/constants';
import type { RFQItem, RFQDetail, RFQLine, ReturnRequest, ReturnReason } from '@/lib/odooClient';
import { Container } from '@/components/shared/Container';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { StatusBadge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [reasonCategoryId, setReasonCategoryId] = useState<string>('');
  const [reasonDetail, setReasonDetail] = useState<string>('');

  const [returnReasons, setReturnReasons] = useState<ReturnReason[]>([]);
  const [loadingReasons, setLoadingReasons] = useState(true);
  const [reasonsError, setReasonsError] = useState('');

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
        const eligible = Array.isArray(data) ? data.filter((o: RFQItem) => o.state === 'sale') : [];
        setEligibleOrders(eligible);
      } catch (err) {
        console.error('Error loading eligible orders:', err);
      } finally {
        setLoadingOrders(false);
      }
    };

    const loadReasonCategories = async () => {
      try {
        setLoadingReasons(true);
        setReasonsError('');
        const res = await fetch('/api/returns/reasons');
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Failed');
        setReturnReasons(Array.isArray(data) ? data : []);
      } catch {
        setReasonsError(RETURNS_LABELS.reasonsError);
      } finally {
        setLoadingReasons(false);
      }
    };

    loadOrders();
    loadReturns();
    loadReasonCategories();
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

    if (!selectedOrderId || !productId || !quantity || !reasonCategoryId) {
      setSubmitError('Please fill in all required fields (including Return Reason).');
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
          reason_category_id: parseInt(reasonCategoryId, 10),
          reason_detail: reasonDetail.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to submit return request');

      setSubmitSuccess(
        (data.name ? `Return request ${data.name} submitted. ` : '') +
          (data.confirmation_message || 'Your return request has been received.')
      );
      setSelectedOrderId('');
      setOrderLines([]);
      setProductId('');
      setQuantity('1');
      setReturnType('refund');
      setReasonCategoryId('');
      setReasonDetail('');
      loadReturns();
    } catch (err: any) {
      setSubmitError(err.message || 'An error occurred while submitting your return request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!authChecked) return null;

  return (
    <div className="bg-ink-50/40 py-10 sm:py-14">
      <Container className="max-w-3xl">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
          {RETURNS_LABELS.title}
        </h1>
        <p className="mt-1 text-sm text-ink-500">{RETURNS_LABELS.subtitle}</p>

        <div className="mt-8 rounded-xl border border-ink-100 bg-white p-6 shadow-soft-xs sm:p-7">
          <h3 className="mb-5 font-display text-[15px] font-semibold text-ink-900">{RETURNS_LABELS.formTitle}</h3>

          <AnimatePresence>
            {submitError && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4">
                <Alert variant="error">{submitError}</Alert>
              </motion.div>
            )}
            {submitSuccess && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4">
                <Alert variant="success">{submitSuccess}</Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {loadingOrders ? (
            <Skeleton className="h-4 w-3/5" />
          ) : eligibleOrders.length === 0 ? (
            <p className="text-sm text-ink-400">{RETURNS_LABELS.noEligibleOrders}</p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="orderSelect">{RETURNS_LABELS.orderLabel}</Label>
                <Select
                  id="orderSelect"
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
                </Select>
              </div>

              {selectedOrderId && (
                <div>
                  <Label htmlFor="productSelect">{RETURNS_LABELS.productLabel}</Label>
                  <Select
                    id="productSelect"
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
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="qty">{RETURNS_LABELS.quantityLabel}</Label>
                <Input
                  id="qty"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div>
                <Label>{RETURNS_LABELS.typeLabel}</Label>
                <div className="mt-1 flex gap-5">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
                    <input
                      type="radio"
                      name="return_type"
                      checked={returnType === 'refund'}
                      onChange={() => setReturnType('refund')}
                      disabled={submitting}
                      className="h-4 w-4 accent-brand-600"
                    />
                    {RETURNS_LABELS.refundOption}
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
                    <input
                      type="radio"
                      name="return_type"
                      checked={returnType === 'replacement'}
                      onChange={() => setReturnType('replacement')}
                      disabled={submitting}
                      className="h-4 w-4 accent-brand-600"
                    />
                    {RETURNS_LABELS.replacementOption}
                  </label>
                </div>
              </div>

              <div>
                <Label htmlFor="reasonSelect">{RETURNS_LABELS.reasonLabel}</Label>
                {loadingReasons ? (
                  <p className="py-2 text-[13px] text-ink-400">{RETURNS_LABELS.loadingReasons}</p>
                ) : reasonsError ? (
                  <p className="py-2 text-[13px] text-red-700">{reasonsError}</p>
                ) : (
                  <Select
                    id="reasonSelect"
                    value={reasonCategoryId}
                    onChange={(e) => setReasonCategoryId(e.target.value)}
                    disabled={submitting}
                    required
                  >
                    <option value="">{RETURNS_LABELS.reasonPlaceholder}</option>
                    {returnReasons.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </Select>
                )}
              </div>

              <div>
                <Label htmlFor="reasonDetail">{RETURNS_LABELS.reasonDetailLabel}</Label>
                <Textarea
                  id="reasonDetail"
                  rows={3}
                  value={reasonDetail}
                  onChange={(e) => setReasonDetail(e.target.value)}
                  placeholder={RETURNS_LABELS.reasonDetailPlaceholder}
                  disabled={submitting}
                />
              </div>

              <Button type="submit" variant="brand" size="lg" disabled={submitting} className="mt-1 w-full sm:w-auto">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? RETURNS_LABELS.submitting : RETURNS_LABELS.submitButton}
              </Button>
            </form>
          )}
        </div>

        <div className="mt-10">
          <h3 className="mb-4 font-display text-[15px] font-semibold text-ink-900">{RETURNS_LABELS.historyTitle}</h3>

          {loadingReturns ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : returns.length === 0 ? (
            <div className="rounded-xl border border-ink-100 bg-white p-8 text-center">
              <PackageOpen className="mx-auto mb-3 h-7 w-7 text-ink-300" />
              <p className="text-sm text-ink-500">{RETURNS_LABELS.noReturns}</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-soft-xs">
              <div className="-mx-px overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-ink-100 bg-ink-50/60 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                      <th className="px-4 py-3">{RETURNS_LABELS.tableName}</th>
                      <th className="px-4 py-3">{RETURNS_LABELS.tableProduct}</th>
                      <th className="px-4 py-3">{RETURNS_LABELS.tableQty}</th>
                      <th className="px-4 py-3">{RETURNS_LABELS.tableReason}</th>
                      <th className="px-4 py-3">{RETURNS_LABELS.tableType}</th>
                      <th className="px-4 py-3">{RETURNS_LABELS.tableStatus}</th>
                      <th className="px-4 py-3">{RETURNS_LABELS.tableDate}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returns.map((r) => {
                      const statusConfig = RETURN_STATUS_MAP[r.state] || { label: r.state, bg: '#f1f5f9', text: '#475569' };
                      return (
                        <tr key={r.id} className="border-b border-ink-100 last:border-b-0 hover:bg-ink-50/40">
                          <td className="px-4 py-3 font-data font-medium text-ink-900">{r.name}</td>
                          <td className="px-4 py-3 text-ink-600">{r.product_name}</td>
                          <td className="px-4 py-3 text-ink-600">{r.quantity}</td>
                          <td className="px-4 py-3 text-ink-600">{r.reason_category || '—'}</td>
                          <td className="px-4 py-3 capitalize text-ink-600">{r.return_type}</td>
                          <td className="px-4 py-3">
                            <StatusBadge config={statusConfig} />
                          </td>
                          <td className="px-4 py-3 text-ink-500">{new Date(r.request_date).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
