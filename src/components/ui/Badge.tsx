
import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants = {
  default: 'bg-brand-primary text-white dark:bg-gray-200 dark:text-gray-900',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  outline: 'border border-gray-200 text-gray-600 dark:border-gray-600 dark:text-gray-400',
  secondary: 'bg-brand-light text-brand-primary dark:bg-gray-700 dark:text-gray-300'
};

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
