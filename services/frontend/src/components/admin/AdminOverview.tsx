'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Building2, ShieldCheck, RotateCcw, Truck, ArrowUpRight,
    DollarSign, PackageCheck, Receipt, Hourglass,
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

import { ADMIN_OVERVIEW_LABELS } from '@/lib/constants';
import type {
    CompanyPartner, AdminReturnRequest, AdminOrder, AdminTopProduct, AdminAnalyticsSummary,
} from '@/lib/odooClient';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

type TabValue = 'companies' | 'returns' | 'tracking';

function KpiCard({
    icon: Icon,
    value,
    label,
    subStat,
    subTone = 'neutral',
    delay = 0,
}: {
    icon: React.ElementType;
    value: React.ReactNode;
    label: string;
    subStat?: string;
    subTone?: 'neutral' | 'warning' | 'positive';
    delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay, ease: [0.4, 0, 0.2, 1] }}
            className="rounded-xl border border-ink-100 bg-white p-5 shadow-soft-xs"
        >
            <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
                </span>
                {subStat && (
                    <span
                        className={cn(
                            'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                            subTone === 'warning' && 'bg-amber-50 text-amber-800',
                            subTone === 'positive' && 'bg-emerald-50 text-emerald-700',
                            subTone === 'neutral' && 'bg-ink-50 text-ink-500'
                        )}
                    >
                        {subStat}
                    </span>
                )}
            </div>
            <div className="mt-3 font-display text-[1.7rem] font-semibold leading-none text-ink-900">{value}</div>
            <div className="mt-1 text-[12.5px] font-medium text-ink-500">{label}</div>
        </motion.div>
    );
}

function PanelCard({
    title,
    onExplore,
    exploreLabel,
    empty,
    children,
}: {
    title: string;
    onExplore?: () => void;
    exploreLabel?: string;
    empty?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-soft-xs">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-ink-900">{title}</h3>
                {onExplore && !empty && (
                    <button
                        type="button"
                        onClick={onExplore}
                        className="flex items-center gap-0.5 text-[11px] font-medium text-ink-400 transition-colors hover:text-brand-700"
                    >
                        {exploreLabel || ADMIN_OVERVIEW_LABELS.viewAll}
                        <ArrowUpRight className="h-3 w-3" />
                    </button>
                )}
            </div>
            <div className={empty ? 'h-[160px]' : ''}>{children}</div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return <div className="flex h-full items-center justify-center text-[12.5px] text-ink-400">{message}</div>;
}

function RevenueTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    const revenue = payload.find((p: any) => p.dataKey === 'revenue')?.value ?? 0;
    const orders = payload.find((p: any) => p.dataKey === 'orders')?.value ?? 0;
    return (
        <div className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-[12.5px] shadow-soft-lg">
            <div className="font-medium text-ink-900">{formatDate(label, { month: 'short', day: 'numeric' })}</div>
            <div className="mt-0.5 font-data font-semibold text-brand-700">{formatCurrency(revenue)}</div>
            <div className="text-[11px] text-ink-400">{orders} {orders === 1 ? 'order' : 'orders'}</div>
        </div>
    );
}

export function AdminOverview({
    refreshSignal,
    onNavigate,
}: {
    refreshSignal: number;
    onNavigate: (tab: TabValue, filter?: string) => void;
}) {
    const [companies, setCompanies] = useState<CompanyPartner[]>([]);
    const [returns, setReturns] = useState<AdminReturnRequest[]>([]);
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [topProducts, setTopProducts] = useState<AdminTopProduct[]>([]);
    const [analytics, setAnalytics] = useState<AdminAnalyticsSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const loadAll = async () => {
            try {
                setLoading(true);
                const [companiesRes, returnsRes, ordersRes, topProductsRes, analyticsRes] = await Promise.all([
                    fetch('/api/admin/companies', { cache: 'no-store' }),
                    fetch('/api/admin/returns', { cache: 'no-store' }),
                    fetch('/api/rfq?state=sale', { cache: 'no-store' }),
                    fetch('/api/admin/products/top?limit=5', { cache: 'no-store' }),
                    fetch('/api/admin/analytics/summary?days=30', { cache: 'no-store' }),
                ]);
                const [companiesData, returnsData, ordersData, topProductsData, analyticsData] = await Promise.all([
                    companiesRes.json(),
                    returnsRes.json(),
                    ordersRes.json(),
                    topProductsRes.json(),
                    analyticsRes.json(),
                ]);
                if (cancelled) return;
                setCompanies(Array.isArray(companiesData) ? companiesData : []);
                setReturns(Array.isArray(returnsData?.returns) ? returnsData.returns : []);
                setOrders(Array.isArray(ordersData) ? ordersData.filter((o: any) => o.state === 'sale') : []);
                setTopProducts(Array.isArray(topProductsData) ? topProductsData : []);
                setAnalytics(analyticsData && !analyticsData.error ? analyticsData : null);
            } catch (err) {
                console.error('Error loading admin overview:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        loadAll();
        return () => {
            cancelled = true;
        };
    }, [refreshSignal]);

    const companyStats = useMemo(() => {
        const total = companies.length;
        const pending = companies.filter((c) => c.verification_status === 'pending').length;
        const verified = companies.filter((c) => c.verification_status === 'verified').length;
        const rejected = companies.filter((c) => c.verification_status === 'rejected').length;
        return { total, pending, verified, rejected };
    }, [companies]);

    const returnStats = useMemo(() => {
        const total = returns.length;
        const active = returns.filter((r) => r.state === 'requested').length;
        const approved = returns.filter((r) => r.state === 'approved' || r.state === 'refunded' || r.state === 'replaced').length;
        const rejected = returns.filter((r) => r.state === 'rejected').length;
        return { total, active, approved, rejected };
    }, [returns]);

    const orderStats = useMemo(() => {
        const total = orders.length;
        const shipped = orders.filter((o) => !!o.tracking_reference).length;
        const awaiting = total - shipped;
        const totalValue = orders.reduce((sum, o) => sum + (o.amount_total || 0), 0);
        return { total, shipped, awaiting, totalValue };
    }, [orders]);

    if (loading) {
        return (
            <div className="mb-8">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-[110px] rounded-xl" />
                    ))}
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-[240px] rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="mb-10">
            <div className="mb-5">
                <h2 className="font-display text-[15px] font-semibold text-ink-900">{ADMIN_OVERVIEW_LABELS.title}</h2>
                <p className="text-[13px] text-ink-500">{ADMIN_OVERVIEW_LABELS.subtitle}</p>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <button className="text-left" onClick={() => onNavigate('companies')}>
                    <KpiCard
                        icon={Building2}
                        value={companyStats.total}
                        label={ADMIN_OVERVIEW_LABELS.totalCompanies}
                        subStat={companyStats.pending > 0 ? `${companyStats.pending} ${ADMIN_OVERVIEW_LABELS.pendingReview}` : undefined}
                        subTone="warning"
                        delay={0}
                    />
                </button>
                <button className="text-left" onClick={() => onNavigate('companies', 'verified')}>
                    <KpiCard
                        icon={ShieldCheck}
                        value={companyStats.verified}
                        label={ADMIN_OVERVIEW_LABELS.verifiedSuppliers}
                        subStat={
                            companyStats.total > 0
                                ? `${Math.round((companyStats.verified / companyStats.total) * 100)}% ${ADMIN_OVERVIEW_LABELS.ofTotal}`
                                : undefined
                        }
                        subTone="positive"
                        delay={0.05}
                    />
                </button>
                <button className="text-left" onClick={() => onNavigate('returns', 'requested')}>
                    <KpiCard
                        icon={RotateCcw}
                        value={returnStats.active}
                        label={ADMIN_OVERVIEW_LABELS.activeReturns}
                        subStat={returnStats.active > 0 ? ADMIN_OVERVIEW_LABELS.awaitingAction : undefined}
                        subTone="warning"
                        delay={0.1}
                    />
                </button>
                <button className="text-left" onClick={() => onNavigate('tracking')}>
                    <KpiCard
                        icon={Truck}
                        value={orderStats.awaiting}
                        label={ADMIN_OVERVIEW_LABELS.awaitingShipment}
                        subStat={`${orderStats.total} ${ADMIN_OVERVIEW_LABELS.ordersConfirmed}`}
                        subTone="neutral"
                        delay={0.15}
                    />
                </button>
            </div>

            {/* Earnings & sales KPIs */}
            <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <KpiCard
                    icon={DollarSign}
                    value={formatCurrency(analytics?.lifetime_revenue ?? 0)}
                    label={ADMIN_OVERVIEW_LABELS.totalEarnings}
                    subStat={ADMIN_OVERVIEW_LABELS.allTimeRevenue}
                    subTone="positive"
                    delay={0.2}
                />
                <KpiCard
                    icon={PackageCheck}
                    value={Math.round(analytics?.lifetime_items_sold ?? 0).toLocaleString()}
                    label={ADMIN_OVERVIEW_LABELS.itemsSold}
                    subStat={ADMIN_OVERVIEW_LABELS.unitsAcrossOrders}
                    subTone="neutral"
                    delay={0.25}
                />
                <KpiCard
                    icon={Receipt}
                    value={formatCurrency(analytics?.avg_order_value ?? 0)}
                    label={ADMIN_OVERVIEW_LABELS.avgOrderValue}
                    subStat={ADMIN_OVERVIEW_LABELS.perConfirmedOrder}
                    subTone="neutral"
                    delay={0.3}
                />
                <button className="text-left" onClick={() => onNavigate('companies')}>
                    <KpiCard
                        icon={Hourglass}
                        value={formatCurrency(analytics?.pending_value ?? 0)}
                        label={ADMIN_OVERVIEW_LABELS.pipelineValue}
                        subStat={analytics?.pending_count ? `${analytics.pending_count} ${ADMIN_OVERVIEW_LABELS.quotesAwaitingConfirmation}` : undefined}
                        subTone="warning"
                        delay={0.35}
                    />
                </button>
            </div>

            {/* Revenue over time */}
            <div className="mt-4">
                <PanelCard title={`${ADMIN_OVERVIEW_LABELS.revenueChartTitle}`} empty={!analytics?.revenue_series?.length}>
                    {!analytics?.revenue_series?.length ? (
                        <EmptyState message={ADMIN_OVERVIEW_LABELS.noRevenueData} />
                    ) : (
                        <div className="h-[220px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analytics.revenue_series} margin={{ left: -16, right: 8, top: 8, bottom: 4 }}>
                                    <defs>
                                        <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#0F7A6C" stopOpacity={0.35} />
                                            <stop offset="100%" stopColor="#0F7A6C" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF1F0" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 11, fill: '#94A3A0' }}
                                        tickFormatter={(v) => formatDate(v, { month: 'short', day: 'numeric' })}
                                        interval={Math.max(0, Math.ceil(analytics.revenue_series.length / 8) - 1)}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11, fill: '#94A3A0' }}
                                        tickFormatter={(v) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)}
                                        axisLine={false}
                                        tickLine={false}
                                        width={48}
                                    />
                                    <Tooltip content={<RevenueTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#0F7A6C"
                                        strokeWidth={2}
                                        fill="url(#revenueFill)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </PanelCard>
            </div>

            {/* Top Products */}
            <div className="mt-4">
                <PanelCard title={ADMIN_OVERVIEW_LABELS.topProductsTitle} empty={topProducts.length === 0}>
                    {topProducts.length === 0 ? (
                        <EmptyState message={ADMIN_OVERVIEW_LABELS.noTopProductData} />
                    ) : (
                        <table className="w-full text-left text-[12.5px]">
                            <thead>
                                <tr className="text-[11px] uppercase tracking-wide text-ink-400">
                                    <th className="pb-2 font-medium">{ADMIN_OVERVIEW_LABELS.topProductNameHeader}</th>
                                    <th className="pb-2 text-right font-medium">{ADMIN_OVERVIEW_LABELS.topProductQtyHeader}</th>
                                    <th className="pb-2 text-right font-medium">{ADMIN_OVERVIEW_LABELS.topProductRevenueHeader}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topProducts.map((p) => (
                                    <tr key={p.product_id} className="border-t border-ink-50">
                                        <td className="py-2.5 font-medium text-ink-900">{p.product_name}</td>
                                        <td className="py-2.5 text-right font-data text-ink-600">{p.quantity_sold}</td>
                                        <td className="py-2.5 text-right font-data text-ink-600">{formatCurrency(p.revenue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </PanelCard>
            </div>
        </div>
    );
}