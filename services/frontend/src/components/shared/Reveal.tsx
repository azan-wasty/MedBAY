"use client";

import * as React from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number];

/**
 * Fades + slides an element in once it scrolls into view. When the user
 * prefers reduced motion, it renders with a plain opacity fade only (no
 * movement) — never skipped outright, so content still appears, just calmly.
 */
function Reveal({
  children,
  delay = 0,
  y = 16,
  duration = 0.5,
  className,
  as = "div",
  once = true,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  duration?: number;
  className?: string;
  as?: React.ElementType;
  once?: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();
  const MotionTag = motion(as as any);

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration: shouldReduceMotion ? 0.25 : duration, delay: shouldReduceMotion ? 0 : delay, ease: EASE_OUT }}
    >
      {children}
    </MotionTag>
  );
}

const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};

/** Wrap a grid/list with <Stagger> and each child with <StaggerItem> for a cascading reveal. */
function Stagger({ children, className, once = true }: { children: React.ReactNode; className?: string; once?: boolean }) {
  const shouldReduceMotion = useReducedMotion();
  if (shouldReduceMotion) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-60px" }}
    >
      {children}
    </motion.div>
  );
}

function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  const shouldReduceMotion = useReducedMotion();
  if (shouldReduceMotion) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  );
}

export { Reveal, Stagger, StaggerItem, EASE_OUT };
