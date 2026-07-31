'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Building2, ShieldCheck, RotateCcw, Truck, ArrowUpRight,
    DollarSign, PackageCheck, Receipt, Hourglass,
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

import { DateFilterBar, DateFilterState } from '@/components/admin/DateFilterBar';
import { ADMIN_OVERVIEW_LABELS } from '@/lib/constants';
import type {
    CompanyPartner, AdminReturnRequest, AdminOrder, AdminTopProduct, AdminAnalyticsSummary,
} from '@/lib/odooClient';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

type TabValue = 'companies' | 'rfqs' | 'returns' | 'tracking';

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
    subTone?: 'neutral' | 'warning' | 'positive' | 'negative';
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
                            subTone === 'negative' && 'bg-red-50 text-red-700',
                            subTone === 'neutral' && 'bg-ink-50 text-ink-600'
                        )}
                    >
                        {subStat}
                    </span>
                )}
            </div>
            <div className="mt-3 font-display text-[1.65rem] font-semibold leading-none tracking-tight text-ink-900">
                {value}
            </div>
            <div className="mt-1.5 text-[12.5px] font-medium text-ink-500">{label}</div>
        </motion.div>
    );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <div className="mb-3.5">
            <h3 className="font-display text-[14.5px] font-semibold text-ink-900">{title}</h3>
            {subtitle && <p className="text-[12px] text-ink-500">{subtitle}</p>}
        </div>
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
        <div className="flex flex-col justify-between rounded-xl border border-ink-100 bg-white p-5 shadow-soft-xs">
            <div>
                <div className="mb-3.5 flex items-center justify-between">
                    <h4 className="text-[13px] font-semibold text-ink-900">{title}</h4>
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
                <div>{children}</div>
            </div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex h-[150px] items-center justify-center text-[12.5px] text-ink-400">
            {message}
        </div>
    );
}

/** SVG Area Trend Chart for Revenue over time */
function RevenueTrendChart({ trend }: { trend: { month: string; revenue: number; orders: number }[] }) {
    if (!trend || trend.length === 0) {
        return <EmptyState message="No revenue trend data available." />;
    }

    const maxRev = Math.max(...trend.map((t) => t.revenue), 1000);
    const chartHeight = 130;
    const chartWidth = 400;

    const points = trend.map((t, index) => {
        const x = (index / (trend.length - 1 || 1)) * (chartWidth - 40) + 20;
        const y = chartHeight - (t.revenue / maxRev) * (chartHeight - 30) - 10;
        return { x, y, ...t };
    });

    const pathD = points.reduce((acc, point, i) => {
        return i === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`;
    }, '');

    const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

    return (
        <div className="w-full">
            <div className="relative h-[150px] w-full">
                <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="h-full w-full overflow-visible"
                    preserveAspectRatio="none"
                >
                    <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0F766E" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#0F766E" stopOpacity="0.0" />
                        </linearGradient>
                    </defs>

                    {/* Horizontal gridlines */}
                    {[0, 0.5, 1].map((ratio, idx) => (
                        <line
                            key={idx}
                            x1="0"
                            y1={chartHeight * ratio}
                            x2={chartWidth}
                            y2={chartHeight * ratio}
                            stroke="#E2E8F0"
                            strokeDasharray="4 4"
                        />
                    ))}

                    {/* Area fill */}
                    <path d={areaD} fill="url(#revenueGrad)" />

                    {/* Line path */}
                    <path d={pathD} fill="none" stroke="#0F766E" strokeWidth="2.5" strokeLinecap="round" />

                    {/* Data Points */}
                    {points.map((p, idx) => (
                        <g key={idx} className="group cursor-pointer">
                            <circle cx={p.x} cy={p.y} r="4" className="fill-brand-700 stroke-white stroke-2" />
                        </g>
                    ))}
                </svg>
            </div>

            {/* X-axis labels */}
            <div className="mt-2 flex justify-between border-t border-ink-100 pt-2 text-[11px] font-medium text-ink-500">
                {trend.map((t, idx) => (
                    <div key={idx} className="text-center">
                        <div>{t.month}</div>
                        <div className="font-data font-semibold text-ink-900">{formatCurrency(t.revenue)}</div>
                    </div>
                ))}
            </div>
        </div>
    );
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

        const [analyticsData, quotationsData, topProductsData] = await Promise.all([
            safeFetchJson(`/api/admin/analytics?${params.toString()}`),
            safeFetchJson('/api/admin/rfq?limit=5').catch(() => []),
            safeFetchJson('/api/admin/products/top?limit=5').catch(() => []),
        ]);

        if (cancelled) return;

        setAnalytics(analyticsData);
        setQuotations(Array.isArray(quotationsData) ? quotationsData : []);
        setTopProducts(Array.isArray(topProductsData) ? topProductsData : []);
    } catch (err: any) {
        console.error('Error loading admin analytics:', err);
        if (!cancelled) {
            setErrorMsg(err.message || 'Failed to load dashboard analytics');
        }
    } finally {
        if (!cancelled) setLoading(false);
    }
};

loadData();
return () => {
    cancelled = true;
};
  }, [refreshSignal, dateFilter]);

if (loading) {
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-[260px] rounded-xl" />
          ))}
        </div>
      </div >
    );
}

const kpis = analytics?.kpis || {
    total_sales: 0,
    aov: 0,
    total_orders: 0,
    total_rfqs: 0,
    conversion_rate: 0,
    sales_growth_mom: 0,
    orders_growth_mom: 0,
    verified_pct: 0,
    active_returns: 0,
};

const orderBreakdown = analytics?.order_breakdown || {
    draft: 0,
    sent: 0,
    sale: 0,
    done: 0,
    cancel: 0,
    total: 0,
};

const companyBreakdown = analytics?.company_breakdown || {
    total: 0,
    verified: 0,
    pending: 0,
    rejected: 0,
    verified_pct: 0,
};

return (
    <div className="mb-12 space-y-8">
        {/* TIME & DATE FILTER CONTROL */}
        <DateFilterBar
            value={dateFilter}
            onChange={setDateFilter}
            activeRangeLabel={analytics?.active_range_label}
        />

        {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                <strong>Analytics Error:</strong> {errorMsg}
            </div>
        )}

        {/* SECTION 1: EXECUTIVE SALES & GROWTH KPIS */}
        <div>
            <SectionHeader
                title="Executive Performance & Growth"
                subtitle="Real-time sales, average order value, conversion rate, and revenue growth metrics"
            />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                    icon={DollarSign}
                    value={formatCurrency(kpis.total_sales)}
                    label="Total Sales Revenue"
                    subStat={`${kpis.sales_growth_mom >= 0 ? '+' : ''}${kpis.sales_growth_mom}% MoM`}
                    subTone={kpis.sales_growth_mom >= 0 ? 'positive' : 'negative'}
                    delay={0}
                />
                <KpiCard
                    icon={ShoppingBag}
                    value={formatCurrency(kpis.aov)}
                    label="Average Order Value (AOV)"
                    subStat={`${kpis.total_orders} Confirmed Orders`}
                    subTone="neutral"
                    delay={0.05}
                />
                <KpiCard
                    icon={Percent}
                    value={`${kpis.conversion_rate}%`}
                    label="RFQ Conversion Rate"
                    subStat={`${kpis.total_orders} / ${kpis.total_rfqs} Converted`}
                    subTone="positive"
                    delay={0.1}
                />
                <button className="text-left" onClick={() => onNavigate('returns', 'requested')}>
                    <KpiCard
                        icon={RotateCcw}
                        value={kpis.active_returns}
                        label="Active Returns Under Review"
                        subStat={kpis.active_returns > 0 ? 'Action Required' : 'All Clear'}
                        subTone={kpis.active_returns > 0 ? 'warning' : 'neutral'}
                        delay={0.15}
                    />
                </button>
            </div>
        </div>

        {/* SECTION 2: REVENUE TREND & CUSTOMER INTELLIGENCE */}
        <div>
            <SectionHeader
                title="Revenue Trends & Customer Spend"
                subtitle="Historical monthly revenue accumulation and top spending customer accounts"
            />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* Revenue Trend Chart */}
                <PanelCard title="Revenue Trend over Time (USD)">
                    <RevenueTrendChart trend={analytics?.revenue_trend || []} />
                </PanelCard>

                {/* Top Customers Table */}
                <PanelCard
                    title="Top Customer Companies by Spend"
                    onExplore={() => onNavigate('companies')}
                    exploreLabel="Manage Companies"
                    empty={!analytics?.top_customers || analytics.top_customers.length === 0}
                >
                    {!analytics?.top_customers || analytics.top_customers.length === 0 ? (
                        <EmptyState message="No customer spend recorded yet." />
                    ) : (
                        <table className="w-full text-left text-[12.5px]">
                            <thead>
                                <tr className="border-b border-ink-100 pb-2 text-[11px] uppercase tracking-wide text-ink-400">
                                    <th className="pb-2 font-medium">Company Name</th>
                                    <th className="pb-2 text-center font-medium">Orders</th>
                                    <th className="pb-2 text-right font-medium">Total Spend</th>
                                    <th className="pb-2 text-right font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analytics.top_customers.map((c) => (
                                    <tr key={c.partner_id} className="border-t border-ink-50">
                                        <td className="py-2.5 font-medium text-ink-900">{c.name}</td>
                                        <td className="py-2.5 text-center font-data text-ink-600">{c.order_count}</td>
                                        <td className="py-2.5 text-right font-data font-semibold text-ink-900">
                                            {formatCurrency(c.total_spend)}
                                        </td>
                                        <td className="py-2.5 text-right">
                                            <span
                                                className={cn(
                                                    'rounded-full px-2 py-0.5 text-[10.5px] font-semibold',
                                                    c.verification_status === 'verified' && 'bg-emerald-50 text-emerald-700',
                                                    c.verification_status === 'pending' && 'bg-amber-50 text-amber-800',
                                                    c.verification_status === 'rejected' && 'bg-red-50 text-red-700'
                                                )}
                                            >
                                                {c.verification_status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </PanelCard>
            </div>
        </div>

        {/* SECTION 3: PIPELINE & PRODUCT PERFORMANCE */}
        <div>
            <SectionHeader
                title="Quote Pipeline & Top Products"
                subtitle="Order lifecycle distribution and best-selling medical equipment items"
            />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* Order Lifecycle Progress */}
                <PanelCard
                    title="Order & Quotation Pipeline Breakdown"
                    onExplore={() => onNavigate('rfqs')}
                    exploreLabel="View RFQs"
                >
                    <div className="space-y-3.5">
                        <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-ink-100">
                            <div
                                style={{ width: `${(orderBreakdown.draft / (orderBreakdown.total || 1)) * 100}%` }}
                                className="bg-ink-400"
                                title={`Draft: ${orderBreakdown.draft}`}
                            />
                            <div
                                style={{ width: `${(orderBreakdown.sent / (orderBreakdown.total || 1)) * 100}%` }}
                                className="bg-amber-400"
                                title={`Quoted: ${orderBreakdown.sent}`}
                            />
                            <div
                                style={{ width: `${(orderBreakdown.sale / (orderBreakdown.total || 1)) * 100}%` }}
                                className="bg-brand-600"
                                title={`Confirmed: ${orderBreakdown.sale}`}
                            />
                            <div
                                style={{ width: `${(orderBreakdown.done / (orderBreakdown.total || 1)) * 100}%` }}
                                className="bg-emerald-500"
                                title={`Done: ${orderBreakdown.done}`}
                            />
                            <div
                                style={{ width: `${(orderBreakdown.cancel / (orderBreakdown.total || 1)) * 100}%` }}
                                className="bg-red-400"
                                title={`Cancelled: ${orderBreakdown.cancel}`}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-[12px] sm:grid-cols-3">
                            <div className="rounded-lg bg-ink-50 p-2.5">
                                <div className="text-ink-500">Draft (Pending)</div>
                                <div className="mt-1 font-display font-semibold text-ink-900">{orderBreakdown.draft}</div>
                            </div>
                            <div className="rounded-lg bg-amber-50 p-2.5">
                                <div className="text-amber-800">Quoted</div>
                                <div className="mt-1 font-display font-semibold text-amber-900">{orderBreakdown.sent}</div>
                            </div>
                            <div className="rounded-lg bg-brand-50 p-2.5">
                                <div className="text-brand-800">Confirmed</div>
                                <div className="mt-1 font-display font-semibold text-brand-900">{orderBreakdown.sale}</div>
                            </div>
                            <div className="rounded-lg bg-emerald-50 p-2.5">
                                <div className="text-emerald-800">Completed</div>
                                <div className="mt-1 font-display font-semibold text-emerald-900">{orderBreakdown.done}</div>
                            </div>
                            <div className="rounded-lg bg-red-50 p-2.5">
                                <div className="text-red-800">Cancelled</div>
                                <div className="mt-1 font-display font-semibold text-red-900">{orderBreakdown.cancel}</div>
                            </div>
                            <div className="rounded-lg bg-white border border-ink-100 p-2.5">
                                <div className="text-ink-500">Total RFQs</div>
                                <div className="mt-1 font-display font-semibold text-ink-900">{orderBreakdown.total}</div>
                            </div>
                        </div>
                    </div>
                </PanelCard>

                {/* Top Products Table */}
                <PanelCard title={ADMIN_OVERVIEW_LABELS.topProductsTitle} empty={topProducts.length === 0}>
                    {topProducts.length === 0 ? (
                        <EmptyState message={ADMIN_OVERVIEW_LABELS.noTopProductData} />
                    ) : (
                        <table className="w-full text-left text-[12.5px]">
                            <thead>
                                <tr className="border-b border-ink-100 pb-2 text-[11px] uppercase tracking-wide text-ink-400">
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
                                        <td className="py-2.5 text-right font-data font-semibold text-ink-900">
                                            {formatCurrency(p.revenue)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </PanelCard>
            </div>
        </div>

        {/* SECTION 4: MARKETPLACE OPERATIONS & RECENT ACTIVITY */}
        <div>
            <SectionHeader
                title="Marketplace Operations & Activity"
                subtitle="Verification stats and real-time audit feed of user actions"
            />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* Company Verification Breakdown */}
                <PanelCard
                    title="Buyer Company Verification Overview"
                    onExplore={() => onNavigate('companies', 'pending')}
                    exploreLabel="Review Pending"
                >
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-[13px]">
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-brand-700" />
                                <span className="font-semibold text-ink-900">Total Registered Companies</span>
                            </div>
                            <span className="font-display font-bold text-ink-900">{companyBreakdown.total}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-center text-[12px]">
                            <div className="rounded-lg bg-emerald-50 p-3">
                                <div className="font-medium text-emerald-800">Verified</div>
                                <div className="mt-1 font-display text-lg font-bold text-emerald-900">
                                    {companyBreakdown.verified}
                                </div>
                                <div className="text-[10px] text-emerald-700">{companyBreakdown.verified_pct}% of total</div>
                            </div>
                            <div className="rounded-lg bg-amber-50 p-3">
                                <div className="font-medium text-amber-800">Pending</div>
                                <div className="mt-1 font-display text-lg font-bold text-amber-900">
                                    {companyBreakdown.pending}
                                </div>
                                <div className="text-[10px] text-amber-700">Needs review</div>
                            </div>
                            <div className="rounded-lg bg-red-50 p-3">
                                <div className="font-medium text-red-800">Rejected</div>
                                <div className="mt-1 font-display text-lg font-bold text-red-900">
                                    {companyBreakdown.rejected}
                                </div>
                                <div className="text-[10px] text-red-700">Declined</div>
                            </div>
                        </div>
                    </div>
                </PanelCard>

                {/* Recent Activity Feed */}
                <PanelCard title="Recent Marketplace Activity Stream" empty={!analytics?.recent_activity?.length}>
                    {!analytics?.recent_activity?.length ? (
                        <EmptyState message="No recent activity recorded." />
                    ) : (
                        <div className="max-h-[220px] space-y-3 overflow-y-auto pr-1">
                            {analytics.recent_activity.map((item) => (
                                <div key={item.id} className="flex items-start justify-between border-b border-ink-50 pb-2 text-[12px]">
                                    <div className="flex items-start gap-2">
                                        <span className="mt-0.5 rounded-md bg-ink-100 p-1 text-ink-700">
                                            {item.type === 'rfq' && <FileText className="h-3.5 w-3.5" />}
                                            {item.type === 'company' && <UserCheck className="h-3.5 w-3.5" />}
                                            {item.type === 'return' && <RotateCcw className="h-3.5 w-3.5" />}
                                        </span>
                                        <div>
                                            <div className="font-medium text-ink-900">{item.title}</div>
                                            <div className="text-[11px] text-ink-500">{item.description}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span
                                            className={cn(
                                                'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                                QUOTATION_STATE_STYLES[item.status] || 'bg-ink-50 text-ink-600'
                                            )}
                                        >
                                            {QUOTATION_STATE_LABELS[item.status] || item.status}
                                        </span>
                                        {item.date && (
                                            <div className="mt-0.5 text-[10.5px] text-ink-400">
                                                {formatDate(item.date)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </PanelCard>
            </div>
        </div>
    </div>
);
}