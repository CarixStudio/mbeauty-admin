
import React from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  children,
  disabled,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

  const variants = {
    primary: "bg-brand-primary text-white hover:bg-[#5a5752] focus:ring-brand-primary dark:bg-brand-primary dark:text-gray-900 dark:hover:bg-gray-200 shadow-sm hover:shadow",
    secondary: "bg-brand-light text-brand-primary hover:bg-[#e6e4df] focus:ring-brand-primary dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600",
    outline: "border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 focus:ring-gray-200 dark:bg-transparent dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800",
    ghost: "hover:bg-brand-light text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-600 dark:bg-red-700 dark:hover:bg-red-600 shadow-sm"
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 py-2 text-sm",
    lg: "h-12 px-8 text-base"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
};
