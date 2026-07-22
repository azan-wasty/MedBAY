'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Building2, ShieldCheck, RotateCcw, Truck, ArrowUpRight } from 'lucide-react';

import { ADMIN_OVERVIEW_LABELS } from '@/lib/constants';
import type { CompanyPartner, AdminReturnRequest, AdminOrder } from '@/lib/odooClient';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

type TabValue = 'companies' | 'returns' | 'tracking';

const COLORS = {
    amber: '#F59E0B',
    emerald: '#059669',
    red: '#EF4444',
    slate: '#94A3B8',
    brand: '#0F7A6C',
    azure: '#1D5FA6',
};

function ChartTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const item = payload[0];
    return (
        <div className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-[12.5px] shadow-soft-lg">
            <span className="font-medium text-ink-900">{item.name}</span>
            <span className="ml-2 font-data font-semibold text-ink-600">{item.value}</span>
        </div>
    );
}

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

function ChartCard({
    title,
    onExplore,
    empty,
    children,
}: {
    title: string;
    onExplore?: () => void;
    empty?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-soft-xs">
            <div className="mb-1 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-ink-900">{title}</h3>
                {onExplore && !empty && (
                    <button
                        type="button"
                        onClick={onExplore}
                        className="flex items-center gap-0.5 text-[11px] font-medium text-ink-400 transition-colors hover:text-brand-700"
                    >
                        {ADMIN_OVERVIEW_LABELS.clickToFilter}
                        <ArrowUpRight className="h-3 w-3" />
                    </button>
                )}
            </div>
            <div className="h-[180px]">{children}</div>
        </div>
    );
}

function EmptyChart({ message }: { message: string }) {
    return <div className="flex h-full items-center justify-center text-[12.5px] text-ink-400">{message}</div>;
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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const loadAll = async () => {
            try {
                setLoading(true);
                const [companiesRes, returnsRes, ordersRes] = await Promise.all([
                    fetch('/api/admin/companies'),
                    fetch('/api/admin/returns'),
                    fetch('/api/rfq?state=sale'),
                ]);
                const [companiesData, returnsData, ordersData] = await Promise.all([
                    companiesRes.json(),
                    returnsRes.json(),
                    ordersRes.json(),
                ]);
                if (cancelled) return;
                setCompanies(Array.isArray(companiesData) ? companiesData : []);
                setReturns(Array.isArray(returnsData?.returns) ? returnsData.returns : []);
                setOrders(Array.isArray(ordersData) ? ordersData.filter((o: any) => o.state === 'sale') : []);
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
        const refund = returns.filter((r) => r.return_type === 'refund').length;
        const replacement = returns.filter((r) => r.return_type === 'replacement').length;

        const reasonCounts = new Map<string, number>();
        returns.forEach((r) => {
            const key = r.reason_category || 'Uncategorized';
            reasonCounts.set(key, (reasonCounts.get(key) || 0) + 1);
        });
        const byReason = Array.from(reasonCounts.entries())
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6);

        return { total, active, approved, rejected, refund, replacement, byReason };
    }, [returns]);

    const orderStats = useMemo(() => {
        const total = orders.length;
        const shipped = orders.filter((o) => !!o.tracking_reference).length;
        const awaiting = total - shipped;
        const totalValue = orders.reduce((sum, o) => sum + (o.amount_total || 0), 0);
        return { total, shipped, awaiting, totalValue };
    }, [orders]);

    const verificationData = useMemo(
        () =>
            [
                { name: 'Verified', value: companyStats.verified, color: COLORS.emerald, filter: 'verified' },
                { name: 'Pending', value: companyStats.pending, color: COLORS.amber, filter: 'pending' },
                { name: 'Rejected', value: companyStats.rejected, color: COLORS.red, filter: 'rejected' },
            ].filter((d) => d.value > 0),
        [companyStats]
    );

    const resolutionData = useMemo(
        () =>
            [
                { name: 'Refund', value: returnStats.refund, color: COLORS.brand },
                { name: 'Replacement', value: returnStats.replacement, color: COLORS.azure },
            ].filter((d) => d.value > 0),
        [returnStats]
    );

    if (loading) {
        return (
            <div className="mb-8">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-[110px] rounded-xl" />
                    ))}
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
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

            {/* Charts */}
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <ChartCard
                    title={ADMIN_OVERVIEW_LABELS.verificationChartTitle}
                    onExplore={() => onNavigate('companies')}
                    empty={verificationData.length === 0}
                >
                    {verificationData.length === 0 ? (
                        <EmptyChart message={ADMIN_OVERVIEW_LABELS.noCompanyData} />
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={verificationData}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius={45}
                                    outerRadius={70}
                                    paddingAngle={3}
                                    strokeWidth={0}
                                    onClick={(d: any) => onNavigate('companies', d.filter)}
                                    className="cursor-pointer outline-none"
                                >
                                    {verificationData.map((entry) => (
                                        <Cell key={entry.name} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<ChartTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>

                <ChartCard title={ADMIN_OVERVIEW_LABELS.reasonChartTitle} empty={returnStats.byReason.length === 0}>
                    {returnStats.byReason.length === 0 ? (
                        <EmptyChart message={ADMIN_OVERVIEW_LABELS.noReturnData} />
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={returnStats.byReason} layout="vertical" margin={{ left: 8, right: 12, top: 4, bottom: 4 }}>
                                <CartesianGrid horizontal={false} stroke="#EEF1F5" />
                                <XAxis type="number" hide />
                                <YAxis
                                    type="category"
                                    dataKey="reason"
                                    width={104}
                                    tick={{ fontSize: 11, fill: '#4C5F7C' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F4F6F9' }} />
                                <Bar dataKey="count" fill={COLORS.brand} radius={[0, 4, 4, 0]} barSize={14} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>

                <ChartCard
                    title={ADMIN_OVERVIEW_LABELS.resolutionChartTitle}
                    onExplore={() => onNavigate('returns')}
                    empty={resolutionData.length === 0}
                >
                    {resolutionData.length === 0 ? (
                        <EmptyChart message={ADMIN_OVERVIEW_LABELS.noReturnData} />
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={resolutionData}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius={45}
                                    outerRadius={70}
                                    paddingAngle={3}
                                    strokeWidth={0}
                                    onClick={() => onNavigate('returns')}
                                    className="cursor-pointer outline-none"
                                >
                                    {resolutionData.map((entry) => (
                                        <Cell key={entry.name} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<ChartTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
            </div>
        </div>
    );
}