"use client";

import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  tone = "light",
  className,
  titleClassName,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  align?: "center" | "left";
  tone?: "light" | "dark";
  className?: string;
  titleClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className
      )}
    >
      {eyebrow && (
        <Reveal>
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]",
              tone === "light"
                ? "border-brand-200 bg-brand-50 text-brand-700"
                : "border-white/15 bg-white/5 text-white/80"
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", tone === "light" ? "bg-brand-600" : "bg-brand-400")} />
            {eyebrow}
          </span>
        </Reveal>
      )}
      <Reveal delay={0.06}>
        <h2
          className={cn(
            "text-balance font-display text-[2rem] font-semibold leading-[1.12] tracking-tight sm:text-4xl md:text-[2.75rem]",
            tone === "light" ? "text-ink-900" : "text-white",
            titleClassName
          )}
        >
          {title}
        </h2>
      </Reveal>
      {subtitle && (
        <Reveal delay={0.12}>
          <p
            className={cn(
              "max-w-2xl text-balance text-[15px] leading-relaxed sm:text-base",
              tone === "light" ? "text-ink-500" : "text-ink-200"
            )}
          >
            {subtitle}
          </p>
        </Reveal>
      )}
    </div>
  );
}

export { SectionHeading };
