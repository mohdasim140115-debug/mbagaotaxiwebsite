import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 text-center rounded-[10px] font-semibold transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-[var(--ease-out)] disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:size-[1.1em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "btn-shine relative overflow-hidden bg-gradient-to-b from-[#d2450d] to-[#bd3f0b] text-white shadow-[0_8px_20px_-10px_rgba(194,65,12,0.9)] hover:from-[#e0500f] hover:to-[#c8440c]",
        secondary: "border border-ocean-800/70 text-ocean-800 bg-transparent hover:bg-ocean-800 hover:text-white",
        ink: "bg-ocean-800 text-white hover:bg-ocean-900",
        ghost: "text-ink-900 hover:bg-sand-100",
        whatsapp: "bg-whatsapp text-white hover:bg-[#156a39]",
        call: "border border-ink-900/20 bg-paper-raised text-ink-900 hover:border-ink-900/40",
        light: "bg-white text-ocean-900 hover:bg-sand-100",
        outlineLight: "border border-white/50 text-white backdrop-blur-sm hover:bg-white/15",
        danger: "bg-danger text-white hover:bg-[#912018]",
      },
      size: {
        sm: "min-h-9 px-3.5 py-1.5 text-sm",
        md: "min-h-11 px-5 py-2 text-[0.9375rem]",
        lg: "min-h-[52px] px-6 py-2.5 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & ButtonVariantProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
