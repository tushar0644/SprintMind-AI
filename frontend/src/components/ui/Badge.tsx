import React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "danger" | "neutral";
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "neutral",
  className = "",
  children,
  ...props
}) => {
  const baseStyles = "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold select-none tracking-wide uppercase";
  
  const variants = {
    primary: "bg-stitch-primary/10 text-stitch-primary border border-stitch-primary/15",
    secondary: "bg-stitch-secondary/10 text-stitch-secondary border border-stitch-secondary/15",
    success: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/15",
    warning: "bg-amber-500/10 text-amber-600 border border-amber-500/15",
    danger: "bg-stitch-error/10 text-stitch-error border border-stitch-error/15",
    neutral: "bg-stitch-surface-container text-stitch-on-surface-variant border border-stitch-outline-variant",
  };

  return (
    <span
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
