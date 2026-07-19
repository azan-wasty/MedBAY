"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/** One stylised EKG beat: flat → P wave → QRS spike → T wave → flat. */
const BEAT_PATH =
  "M0,44 L66,44 C74,44 78,34 84,34 C90,34 94,44 102,44 L114,44 L120,50 L128,8 L136,58 L144,44 L158,44 C168,44 174,28 186,28 C198,28 204,44 214,44 L320,44";

/**
 * MedBAY's signature graphic: a heart-monitor pulse line. Used as a section
 * divider (thin, quiet) and, at a larger size, as the hero's proof-of-life
 * accent. Draws itself in once on scroll — never loops, so it reads as a
 * considered moment rather than decoration.
 */
function PulseLine({
  className,
  strokeClassName = "stroke-brand-600",
  width = 220,
  strokeWidth = 2.5,
  delay = 0,
}: {
  className?: string;
  strokeClassName?: string;
  width?: number;
  strokeWidth?: number;
  delay?: number;
}) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <svg
      viewBox="0 0 320 64"
      width={width}
      height={(width / 320) * 64}
      fill="none"
      className={cn("overflow-visible", className)}
      aria-hidden="true"
    >
      <motion.path
        d={BEAT_PATH}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={strokeClassName}
        initial={shouldReduceMotion ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: shouldReduceMotion ? 0 : 1.1, delay, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}

/** Full-width section divider: hairline — EKG blip — hairline. */
function PulseDivider({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  return (
    <div className={cn("flex w-full items-center gap-4 sm:gap-6", className)}>
      <span className={cn("h-px flex-1", tone === "light" ? "bg-ink-100" : "bg-white/10")} />
      <PulseLine
        width={168}
        strokeWidth={2}
        strokeClassName={tone === "light" ? "stroke-brand-500" : "stroke-brand-400"}
        className="shrink-0 opacity-90"
      />
      <span className={cn("h-px flex-1", tone === "light" ? "bg-ink-100" : "bg-white/10")} />
    </div>
  );
}

export { PulseLine, PulseDivider };
