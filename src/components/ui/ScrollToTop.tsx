
import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { SimpleTooltip } from './Tooltip';

export const ScrollToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const mainContent = document.querySelector('main');
    if (!mainContent) return;

    const toggleVisibility = () => {
      if (mainContent.scrollTop > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    mainContent.addEventListener('scroll', toggleVisibility);
    return () => mainContent.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    const mainContent = document.querySelector('main');
    mainContent?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-20 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <SimpleTooltip content="Scroll to top" side="left">
            <button
                onClick={scrollToTop}
                className="bg-brand-primary text-white p-3 rounded-full shadow-lg hover:bg-brand-accent transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
            >
                <ArrowUp size={20} />
            </button>
        </SimpleTooltip>
    </div>
  );
};
