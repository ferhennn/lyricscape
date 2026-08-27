"use client";

import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "line";

interface Props extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: Variant;
}

const base =
  "group relative inline-flex items-center justify-center gap-2.5 select-none label tracking-[0.22em]! px-6 py-3 transition-colors duration-300";

const variants: Record<Variant, string> = {
  primary:
    "text-void bg-ink hover:bg-[color-mix(in_srgb,var(--accent)_88%,white)] rounded-full",
  ghost: "text-ink/70 hover:text-ink",
  line: "text-ink/80 hover:text-ink border border-line hover:border-white/25 rounded-full",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "line", className, children, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 26 }}
      className={cn(base, variants[variant], className)}
      {...rest}
    >
      {children}
    </motion.button>
  );
});
