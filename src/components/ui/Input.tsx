import React, { type InputHTMLAttributes, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { ElementType } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: ElementType;
  isPassword?: boolean;
}

export const Input: React.FC<InputProps> = ({ label, icon: Icon, isPassword, className, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const togglePassword = () => setShowPassword(!showPassword);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
        {label} <span className="text-brand-accent">*</span>
      </label>
      <div 
        className={`
          relative flex items-center bg-white rounded-lg border transition-all duration-200
          ${isFocused ? 'border-brand-accent ring-1 ring-brand-accent/20' : 'border-gray-200'}
        `}
      >
        <div className="absolute left-3 text-gray-400">
          <Icon size={18} />
        </div>
        
        <input
          type={isPassword && !showPassword ? 'password' : 'text'}
          className="w-full py-3 pl-10 pr-10 bg-transparent outline-none text-gray-800 placeholder-gray-400 text-sm"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={togglePassword}
            className="absolute right-3 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
};