
import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <nav className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
      <button 
        className="hover:text-brand-primary dark:hover:text-white transition-colors"
        onClick={items[0]?.onClick}
      >
        <Home size={14} />
      </button>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight size={14} className="mx-2 text-gray-300" />
          <button
            onClick={item.onClick}
            className={`transition-colors ${
              index === items.length - 1
                ? 'font-semibold text-gray-900 dark:text-white pointer-events-none'
                : 'hover:text-brand-primary dark:hover:text-white'
            }`}
          >
            {item.label}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};
