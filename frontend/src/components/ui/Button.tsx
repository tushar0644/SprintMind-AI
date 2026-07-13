import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "ai";
  size?: "sm" | "md" | "lg";
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-stitch transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-stitch-primary/30 disabled:opacity-50 disabled:pointer-events-none select-none";
  
  const variants = {
    primary: "bg-stitch-primary hover:bg-stitch-primary-container text-white border border-transparent shadow-sm",
    secondary: "bg-white hover:bg-stitch-surface-container text-stitch-on-surface border border-stitch-outline-variant shadow-sm",
    ghost: "bg-transparent hover:bg-stitch-surface-container text-stitch-on-surface-variant hover:text-stitch-on-surface border border-transparent",
    danger: "bg-stitch-error hover:bg-red-700 text-white border border-transparent shadow-sm",
    ai: "bg-gradient-to-r from-stitch-primary to-stitch-secondary hover:brightness-110 text-white border border-transparent shadow-sm shadow-stitch-secondary/10",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
