
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "./ui/input-otp"

interface OTPInputProps {
  onVerify: () => void;
  onBack: () => void;
}

export const OTPInput: React.FC<OTPInputProps> = ({ onVerify, onBack }) => {
  const [value, setValue] = useState("");
  const [resendDisabled, setResendDisabled] = useState(true);
  const [timer, setTimer] = useState(30);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.length === 6) {
      onVerify();
    }
  };

  // Auto submit on complete
  useEffect(() => {
    if (value.length === 6) {
      // Small delay for visual feedback
      const timer = setTimeout(() => {
        onVerify();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [value, onVerify]);

  // Resend Timer
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    } else {
      setResendDisabled(false);
    }
  }, [timer]);

  const handleResend = () => {
    setResendDisabled(true);
    setTimer(30);
    // Mock resend logic
    alert("Code resent!");
  };

  return (
    <div className="flex flex-col h-full p-8 md:p-12 lg:p-16 overflow-y-auto scrollbar-hide animate-in fade-in slide-in-from-right-8 duration-500">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors group self-start"
        title="Go back"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Back to Login
      </button>

      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-6 text-brand-primary border-2 border-brand-primary/10">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Verification</h1>
          <p className="text-gray-500 text-sm">
            Enter the 6-digit code sent to your authorized device.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 flex flex-col items-center">
          <InputOTP maxLength={6} value={value} onChange={setValue}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          <button 
            type="submit"
            className="w-full bg-brand-primary hover:bg-[#5a5752] text-white font-semibold py-3.5 rounded-lg transition-all duration-300 shadow-lg shadow-brand-primary/20 active:transform active:scale-[0.98]"
            title="Verify Code"
          >
            Verify Identity
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400 mb-2">Didn't receive the code?</p>
          <button 
            onClick={handleResend}
            disabled={resendDisabled}
            className={`text-sm font-medium transition-colors ${resendDisabled ? 'text-gray-300 cursor-not-allowed' : 'text-brand-accent hover:underline cursor-pointer'}`}
            title="Resend Verification Code"
          >
            {resendDisabled ? `Resend code in ${timer}s` : 'Resend Code'}
          </button>
        </div>
      </div>
    </div>
  );
};
