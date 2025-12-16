import React from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, checked, onChange }) => {
  return (
    <div 
      className="flex items-center gap-2 cursor-pointer group"
      onClick={() => onChange(!checked)}
    >
      <div 
        className={`
          w-5 h-5 rounded border flex items-center justify-center transition-colors
          ${checked ? 'bg-brand-primary border-brand-primary' : 'bg-white border-gray-300 group-hover:border-brand-primary'}
        `}
      >
        {checked && <Check size={14} className="text-white" strokeWidth={3} />}
      </div>
      <span className="text-sm text-gray-600 select-none group-hover:text-gray-900">{label}</span>
    </div>
  );
};