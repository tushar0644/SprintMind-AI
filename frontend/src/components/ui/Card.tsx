import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  hoverable = false,
  className = "",
  children,
  ...props
}) => {
  return (
    <div
      className={`bg-white border border-stitch-outline-variant rounded-stitch p-6 shadow-sm transition-all duration-200 ${
        hoverable ? "hover:shadow-md hover:border-stitch-outline" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = "",
  children,
  ...props
}) => (
  <div className={`border-b border-stitch-outline-variant/60 pb-4 mb-4 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className = "",
  children,
  ...props
}) => (
  <h3 className={`text-base font-semibold text-stitch-on-surface tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = "",
  children,
  ...props
}) => (
  <div className={className} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = "",
  children,
  ...props
}) => (
  <div className={`border-t border-stitch-outline-variant/60 pt-4 mt-4 flex items-center justify-end gap-3 ${className}`} {...props}>
    {children}
  </div>
);
