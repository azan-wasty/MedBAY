'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FileText,
  CheckCircle2,
  PackageCheck,
  DollarSign,
  ArrowRight,
  ShoppingBag,
  RotateCcw,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';

import { BUYER_OVERVIEW_LABELS } from '@/lib/constants';
import type { RFQItem } from '@/lib/odooClient';
import { cn, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const COLORS = {
  draft: '#F59E0B', // Amber (Under Review)
  sent: '#0F7A6C', // Teal/Brand (Quoted / Action Required)
  sale: '#059669', // Emerald (Confirmed / Order Placed)
  cancel: '#94A3B8', // Slate (Cancelled)
  brand: '#0F7A6C',
};

function KpiCard({
  icon: Icon,
  value,
  label,
  subStat,
  subTone = 'neutral',
  delay = 0,
  onClick,
  href,
}: {
  icon: React.ElementType;
  value: React.ReactNode;
  label: string;
  subStat?: string;
  subTone?: 'neutral' | 'warning' | 'positive' | 'brand';
  delay?: number;
  onClick?: () => void;
  href?: string;
}) {
  const classes = cn(
    'rounded-xl border border-ink-100 bg-white p-5 shadow-soft-xs text-left transition-all',
    (onClick || href) && 'cursor-pointer hover:border-brand-300 hover:shadow-soft-sm hover:-translate-y-0.5'
  );

  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
        </span>
        {subStat && (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-semibold',
              subTone === 'warning' && 'bg-amber-50 text-amber-800 animate-pulse',
              subTone === 'positive' && 'bg-emerald-50 text-emerald-700',
              subTone === 'brand' && 'bg-brand-50 text-brand-800',
              subTone === 'neutral' && 'bg-ink-50 text-ink-500'
            )}
          >
            {subStat}
          </span>
        )}
      </div>
      <div className="mt-3 font-display text-[1.7rem] font-semibold leading-none text-ink-900">{value}</div>
      <div className="mt-1 text-[12.5px] font-medium text-ink-500">{label}</div>
    </>
  );

  if (href) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay, ease: [0.4, 0, 0.2, 1] }}
      >
        <a href={href} className={classes}>
          {inner}
        </a>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.4, 0, 0.2, 1] }}
      onClick={onClick}
      className={classes}
    >
      {inner}
    </motion.div>
  );
}

function ChartCard({
  title,
  empty,
  children,
}: {
  title: string;
  empty?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-soft-xs">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-ink-900">{title}</h3>
      </div>
      <div className="h-[180px]">{children}</div>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return <div className="flex h-full items-center justify-center text-[12.5px] text-ink-400">{message}</div>;
}

export function BuyerOverview({
  rfqItems,
  onSelectRFQ,
}: {
  rfqItems: RFQItem[];
  onSelectRFQ?: (rfq: RFQItem) => void;
}) {
  const stats = useMemo(() => {
    const total = rfqItems.length;
    const sentQuotes = rfqItems.filter((r) => r.state === 'sent');
    const draftQuotes = rfqItems.filter((r) => r.state === 'draft');
    const confirmedOrders = rfqItems.filter((r) => r.state === 'sale' || r.state === 'done');
    const cancelledQuotes = rfqItems.filter((r) => r.state === 'cancel');

    const totalQuotedValue = rfqItems.reduce((acc, curr) => acc + (curr.amount_total || 0), 0);
    const confirmedValue = confirmedOrders.reduce((acc, curr) => acc + (curr.amount_total || 0), 0);

    return {
      total,
      sent: sentQuotes.length,
      draft: draftQuotes.length,
      confirmed: confirmedOrders.length,
      cancelled: cancelledQuotes.length,
      sentQuotes,
      totalQuotedValue,
      confirmedValue,
    };
  }, [rfqItems]);

  const statusData = useMemo(() => {
    return [
      { name: 'Quoted (Ready)', count: stats.sent, color: COLORS.sent },
      { name: 'Pending Review', count: stats.draft, color: COLORS.draft },
      { name: 'Orders', count: stats.confirmed, color: COLORS.sale },
      { name: 'Rejected', count: stats.cancelled, color: COLORS.cancel },
    ];
  }, [stats]);

  const barChartData = useMemo(() => {
    return rfqItems
      .slice(0, 6)
      .reverse()
      .map((item) => ({
        name: item.name,
        amount: item.amount_total || 0,
      }));
  }, [rfqItems]);

  const maxBarAmount = useMemo(() => {
    return Math.max(...barChartData.map((d) => d.amount), 100);
  }, [barChartData]);

  return (
    <div className="mb-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-[15px] font-semibold text-ink-900">{BUYER_OVERVIEW_LABELS.title}</h2>
          <p className="text-[13px] text-ink-500">{BUYER_OVERVIEW_LABELS.subtitle}</p>
        </div>
        {stats.sent > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-900 shadow-soft-xs"
          >
            <AlertCircle className="h-4 w-4 text-amber-600 animate-pulse" />
            <span>{stats.sent} quotation{stats.sent === 1 ? '' : 's'} ready for your review!</span>
            {stats.sentQuotes.length > 0 && onSelectRFQ && (
              <Button
                size="sm"
                variant="brand"
                className="ml-1 h-7 text-[11px] px-2.5"
                onClick={() => onSelectRFQ(stats.sentQuotes[0])}
              >
                Review Now <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            )}
          </motion.div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          icon={FileText}
          value={stats.total}
          label={BUYER_OVERVIEW_LABELS.totalRfqs}
          subStat={stats.draft > 0 ? `${stats.draft} pending review` : undefined}
          subTone="neutral"
          delay={0}
          href="#rfq-list"
        />
        <KpiCard
          icon={CheckCircle2}
          value={stats.sent}
          label={BUYER_OVERVIEW_LABELS.readyForApproval}
          subStat={stats.sent > 0 ? BUYER_OVERVIEW_LABELS.quotesToApprove : 'All up to date'}
          subTone={stats.sent > 0 ? 'warning' : 'positive'}
          delay={0.05}
          onClick={stats.sentQuotes.length > 0 && onSelectRFQ ? () => onSelectRFQ(stats.sentQuotes[0]) : undefined}
        />
        <KpiCard
          icon={PackageCheck}
          value={stats.confirmed}
          label={BUYER_OVERVIEW_LABELS.confirmedOrders}
          subStat={stats.confirmed > 0 ? BUYER_OVERVIEW_LABELS.activeProcurement : undefined}
          subTone="positive"
          delay={0.1}
          href="#orders-list"
        />
        <KpiCard
          icon={DollarSign}
          value={stats.confirmedValue > 0 ? formatCurrency(stats.confirmedValue) : '$0.00'}
          label={BUYER_OVERVIEW_LABELS.totalSpend}
          subStat={stats.totalQuotedValue > 0 ? `${formatCurrency(stats.totalQuotedValue)} ${BUYER_OVERVIEW_LABELS.totalSpendSub}` : undefined}
          subTone="brand"
          delay={0.15}
          href="#orders-list"
        />
      </div>

      {/* Charts & Shortcuts */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Status Breakdown */}
        <ChartCard title={BUYER_OVERVIEW_LABELS.statusChartTitle} empty={stats.total === 0}>
          {stats.total === 0 ? (
            <EmptyChart message={BUYER_OVERVIEW_LABELS.noRfqData} />
          ) : (
            <div className="flex h-full flex-col justify-center space-y-3 pt-2">
              <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-ink-100">
                {statusData.map((d) => (
                  <div
                    key={d.name}
                    style={{
                      width: `${(d.count / stats.total) * 100}%`,
                      backgroundColor: d.color,
                    }}
                    title={`${d.name}: ${d.count}`}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                {statusData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between rounded-md bg-ink-50 px-2.5 py-1">
                    <span className="flex items-center gap-1.5 font-medium text-ink-700">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </span>
                    <span className="font-data font-semibold text-ink-900">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>

        {/* Order Spend Bar Chart */}
        <ChartCard title={BUYER_OVERVIEW_LABELS.spendChartTitle} empty={barChartData.length === 0}>
          {barChartData.length === 0 ? (
            <EmptyChart message={BUYER_OVERVIEW_LABELS.noSpendData} />
          ) : (
            <div className="flex h-full items-end justify-between gap-2 pb-2 pt-4">
              {barChartData.map((d, idx) => {
                const heightPct = Math.max((d.amount / maxBarAmount) * 100, 8);
                return (
                  <div key={idx} className="flex flex-1 flex-col items-center gap-1">
                    <div className="font-data text-[10px] font-medium text-ink-500">
                      ${Math.round(d.amount)}
                    </div>
                    <div
                      className="w-full max-w-[28px] rounded-t bg-brand-700 transition-all hover:bg-brand-600"
                      style={{ height: `${heightPct}%` }}
                      title={`${d.name}: ${formatCurrency(d.amount)}`}
                    />
                    <div className="truncate text-[10px] font-medium text-ink-600 max-w-[45px]">
                      {d.name.replace('SO', '')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>

        {/* Procurement Shortcuts Card */}
        <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-soft-xs flex flex-col justify-between">
          <div>
            <h3 className="text-[13px] font-semibold text-ink-900 mb-3">{BUYER_OVERVIEW_LABELS.quickActionsTitle}</h3>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/"
                className="flex items-center gap-2 rounded-lg border border-ink-100 bg-ink-50/50 p-2.5 text-[12.5px] font-medium text-ink-700 transition-colors hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-800"
              >
                <ShoppingBag className="h-4 w-4 text-brand-700" />
                <span>Browse Products</span>
              </Link>
              <Link
                href="/cart"
                className="flex items-center gap-2 rounded-lg border border-ink-100 bg-ink-50/50 p-2.5 text-[12.5px] font-medium text-ink-700 transition-colors hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-800"
              >
                <FileText className="h-4 w-4 text-brand-700" />
                <span>Submit RFQ</span>
              </Link>
              <Link
                href="/returns"
                className="flex items-center gap-2 rounded-lg border border-ink-100 bg-ink-50/50 p-2.5 text-[12.5px] font-medium text-ink-700 transition-colors hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-800"
              >
                <RotateCcw className="h-4 w-4 text-brand-700" />
                <span>Request Return</span>
              </Link>
              <Link
                href="/#faq"
                className="flex items-center gap-2 rounded-lg border border-ink-100 bg-ink-50/50 p-2.5 text-[12.5px] font-medium text-ink-700 transition-colors hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-800"
              >
                <HelpCircle className="h-4 w-4 text-brand-700" />
                <span>Help &amp; FAQ</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
