import { cn } from "@/lib/utils";
import { BRAND_CONFIG } from "@/lib/constants";

/**
 * MedBAY wordmark + geometric mark. The mark is a rounded square carrying a
 * cross-into-pulse notch — echoes the EKG signature used across the site
 * (PulseLine) while doubling as a medical cross at a glance.
 */
function Logo({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-brand-500 to-brand-700 shadow-soft-sm">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3v7M12 14v7M3 12h7M14 12h7" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </span>
      <span
        className={cn(
          "font-display text-[18px] font-bold tracking-tight",
          tone === "light" ? "text-ink-900" : "text-white"
        )}
      >
        {BRAND_CONFIG.name}
      </span>
    </span>
  );
}

export { Logo };
