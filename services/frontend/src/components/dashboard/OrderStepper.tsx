"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";

import { ORDER_STAGE_KEYS, BUYER_STAGE_MAP, TRACKING_LABELS } from "@/lib/constants";
import type { OrderTracking } from "@/lib/odooClient";
import { cn } from "@/lib/utils";

export function OrderStepper({ tracking }: { tracking: OrderTracking }) {
  const { buyer_stage, stages, carrier, tracking_reference, tracking_url } = tracking;
  const mainStages = stages.filter((s) => ORDER_STAGE_KEYS.includes(s.key));
  const currentIdx = ORDER_STAGE_KEYS.indexOf(buyer_stage);

  const isBranchStage = !ORDER_STAGE_KEYS.includes(buyer_stage);
  const branchConfig = BUYER_STAGE_MAP[buyer_stage];

  const showCarrierInfo =
    (buyer_stage === "out_for_delivery" || buyer_stage === "delivered" || buyer_stage === "completed") &&
    carrier &&
    tracking_reference;

  return (
    <div className="mb-6">
      <h5 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{TRACKING_LABELS.title}</h5>

      {isBranchStage && branchConfig ? (
        <span
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-semibold"
          style={{ backgroundColor: branchConfig.bg, color: branchConfig.text }}
        >
          {branchConfig.label}
        </span>
      ) : (
        <div className="flex flex-col gap-0 sm:flex-row sm:items-start sm:gap-0">
          {mainStages.map((stage, idx) => {
            const isCompleted = currentIdx > idx || (buyer_stage === "completed" && stage.key === "completed");
            const isActive = buyer_stage === stage.key && !isCompleted;
            const isLast = idx === mainStages.length - 1;
            return (
              <div key={stage.key} className={cn("relative flex flex-1 sm:flex-col sm:items-center")}>
                <div className="flex items-center gap-3 sm:flex-col sm:gap-2">
                  <div className="relative flex flex-col items-center">
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        isCompleted
                          ? "border-brand-600 bg-brand-600 text-white"
                          : isActive
                          ? "border-brand-600 bg-white text-brand-600"
                          : "border-ink-200 bg-white text-ink-300"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      ) : (
                        <span className={cn("h-1.5 w-1.5 rounded-full", isActive ? "bg-brand-600" : "bg-ink-300")} />
                      )}
                    </span>
                    {!isLast && (
                      <span
                        className={cn(
                          "hidden sm:block sm:absolute sm:left-1/2 sm:top-3 sm:h-px sm:w-[calc(100%+0.5rem)]",
                          isCompleted ? "bg-brand-600" : "bg-ink-200"
                        )}
                      />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[12.5px] font-medium sm:mt-1 sm:text-center",
                      isCompleted || isActive ? "text-ink-900" : "text-ink-400"
                    )}
                  >
                    {stage.label}
                  </span>
                </div>
                {!isLast && (
                  <span
                    className={cn("ml-3 mt-1 block h-6 w-px sm:hidden", isCompleted ? "bg-brand-600" : "bg-ink-200")}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCarrierInfo && (
        <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-[13px]">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium text-ink-600">{TRACKING_LABELS.carrierLabel}:</span>
            <span className="font-semibold text-ink-900">{carrier && carrier.name}</span>
            <span className="text-ink-300">·</span>
            <span className="font-medium text-ink-600">{TRACKING_LABELS.trackingRefLabel}:</span>
            {tracking_url ? (
              <a
                href={tracking_url as string}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
              >
                {tracking_reference} {TRACKING_LABELS.trackingLinkLabel}
              </a>
            ) : (
              <span className="font-semibold text-ink-900">{tracking_reference}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
