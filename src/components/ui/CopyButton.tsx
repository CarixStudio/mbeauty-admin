
import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { SimpleTooltip } from './Tooltip';

interface CopyButtonProps {
  text: string;
  className?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ text, className }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SimpleTooltip content={copied ? "Copied!" : "Copy to clipboard"}>
        <button
        onClick={handleCopy}
        className={`inline-flex items-center justify-center p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${className}`}
        >
        {copied ? (
            <Check size={14} className="text-green-500" />
        ) : (
            <Copy size={14} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
        )}
        </button>
    </SimpleTooltip>
  );
};
