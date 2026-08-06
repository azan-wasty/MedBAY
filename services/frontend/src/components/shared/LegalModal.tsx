"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Scale, Shield, ClipboardCheck, ArrowUpRight } from "lucide-react";

import { LEGAL_CONTENT, type LegalDocId } from "@/lib/legalContent";
import { BRAND_CONFIG } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Icon map — one icon per doc type
// ---------------------------------------------------------------------------

const DOC_ICONS: Record<LegalDocId, React.ReactNode> = {
  terms: <Scale className="h-4 w-4" />,
  privacy: <Shield className="h-4 w-4" />,
  compliance: <ClipboardCheck className="h-4 w-4" />,
};

// ---------------------------------------------------------------------------
// useLegalModal — manages open/close state and trigger-ref focus restoration
// ---------------------------------------------------------------------------

export function useLegalModal() {
  const [openDocId, setOpenDocId] = React.useState<LegalDocId | null>(null);
  // Keyed by doc id so each footer button gets its own ref slot
  const triggerRefs = React.useRef<Partial<Record<LegalDocId, HTMLButtonElement | null>>>({});

  const openModal = React.useCallback((id: LegalDocId) => {
    setOpenDocId(id);
  }, []);

  const closeModal = React.useCallback(() => {
    const id = openDocId;
    setOpenDocId(null);
    // Restore focus to the button that opened the modal after the exit animation
    if (id) {
      setTimeout(() => {
        triggerRefs.current[id]?.focus();
      }, 80);
    }
  }, [openDocId]);

  return { openDocId, triggerRefs, openModal, closeModal };
}

// ---------------------------------------------------------------------------
// LegalModal — the rendered overlay
// ---------------------------------------------------------------------------

export interface LegalModalProps {
  docId: LegalDocId | null;
  onClose: () => void;
}

export function LegalModal({ docId, onClose }: LegalModalProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);

  const isOpen = docId !== null;
  const doc = docId ? LEGAL_CONTENT[docId] : null;
  const headingId = `legal-modal-heading`;

  // ── Focus trap + Escape + body scroll lock ────────────────────────────────
  React.useEffect(() => {
    if (!isOpen) return;

    // Focus the close button on open (deferred to after animation frame)
    requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const FOCUSABLE =
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const panel = panelRef.current;
        if (!panel) return;
        const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && doc && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          {/* ── Backdrop ──────────────────────────────────────────────── */}
          <motion.div
            key="legal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* ── Modal panel ───────────────────────────────────────────── */}
          <motion.div
            key={`legal-panel-${docId}`}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_32px_80px_-12px_rgba(0,0,0,0.28)] sm:max-h-[85vh] sm:max-w-2xl sm:rounded-2xl"
          >
            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-ink-100 bg-brand-50/70 px-6 py-5">
              <div className="flex items-center gap-3">
                {/* Doc icon badge */}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand-200 bg-brand-100 text-brand-700">
                  {DOC_ICONS[docId]}
                </span>
                <div>
                  <h2
                    id={headingId}
                    className="font-display text-[1.05rem] font-semibold text-ink-900"
                  >
                    {doc.title}
                  </h2>
                  <p className="mt-0.5 text-[11px] font-medium text-ink-400">
                    Effective {doc.effectiveDate}
                  </p>
                </div>
              </div>

              {/* Close — subtle icon-only, larger touch target on mobile */}
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 sm:h-8 sm:w-8"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ── Body (scrollable) ────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-2">
              <div className="divide-y divide-ink-100">
                {doc.sections.map((section, i) => (
                  <div key={i} className="py-5 first:pt-4 last:pb-6">
                    <h3 className="font-display text-[14px] font-semibold text-ink-800">
                      {section.heading}
                    </h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-ink-500">
                      {section.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Footer ──────────────────────────────────────────────── */}
            <div className="flex shrink-0 items-center justify-between border-t border-ink-100 bg-ink-50/60 px-6 py-4">
              <p className="text-[11px] text-ink-400">
                MedBAY Medical Marketplace
              </p>
              <a
                href={`mailto:${BRAND_CONFIG?.contactEmail ?? "procurement@medbay.io"}`}
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand-600 transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:underline focus-visible:underline-offset-2"
              >
                Questions? Talk to procurement
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
