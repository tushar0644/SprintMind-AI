import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", type = "text", ...props }, ref) => {
    return (
      <div className="flex flex-col space-y-1.5 w-full">
        {label && (
          <label className="text-xs font-semibold text-stitch-on-surface-variant select-none">
            {label}
          </label>
        )}
        <input
          type={type}
          ref={ref}
          className={`px-3 py-2 bg-white border border-stitch-outline-variant rounded-stitch text-sm text-stitch-on-surface placeholder-stitch-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-stitch-primary/30 focus:border-stitch-primary transition-all duration-200 disabled:opacity-50 disabled:bg-stitch-surface-container-low ${
            error ? "border-stitch-error focus:ring-stitch-error/30" : ""
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="text-[11px] font-medium text-stitch-error">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
