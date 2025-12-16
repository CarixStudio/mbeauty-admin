
import React, { useEffect, useState } from 'react';
import { Mail, CheckCircle } from 'lucide-react';

interface CheckEmailProps {
  onVerified: () => void;
}

export const CheckEmail: React.FC<CheckEmailProps> = ({ onVerified }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Sequence the animation steps
    const t1 = setTimeout(() => setStep(1), 500); // Show Icon
    const t2 = setTimeout(() => setStep(2), 2500); // Show Success Tick
    const t3 = setTimeout(() => onVerified(), 4000); // Complete

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onVerified]);

  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md w-full text-center transform transition-all duration-500">
        
        {/* Animated Icon Container */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className={`absolute inset-0 bg-brand-accent/20 rounded-full animate-pulse ${step >= 1 ? 'opacity-100' : 'opacity-0'}`}></div>
          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 transform ${step === 2 ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}>
             <Mail size={40} className="text-brand-accent" />
          </div>
          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 transform ${step === 2 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
             <CheckCircle size={48} className="text-green-500" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-brand-primary mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {step === 2 ? "Verified!" : "Check your email"}
        </h2>
        
        <p className="text-gray-500 mb-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
          {step === 2 
            ? "Redirecting you to the dashboard..." 
            : "We've sent a secure login code to your inbox. Please verify to continue."}
        </p>

        {/* Loading Bar */}
        <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
           <div className="h-full bg-brand-primary animate-[loading_3.5s_ease-in-out_forwards]"></div>
        </div>

        <style>{`
          @keyframes loading {
            0% { width: 0%; }
            100% { width: 100%; }
          }
        `}</style>
      </div>
    </div>
  );
};
