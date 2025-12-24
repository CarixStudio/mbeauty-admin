import React, { useState, useRef, useEffect } from 'react';
import { Shield, ArrowLeft, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './ui/Toast';

interface MFAChallengeFormProps {
  factorId: string;
  onSuccess: () => void;
  onBack: () => void;
}

/**
 * Form for entering the TOTP code during login when 2FA is enabled.
 * Shows after successful password authentication.
 */
export const MFAChallengeForm: React.FC<MFAChallengeFormProps> = ({
  factorId,
  onSuccess,
  onBack
}) => {
  const { addToast } = useToast();
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [challengeId, setChallengeId] = useState<string>('');
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Create challenge on mount
  useEffect(() => {
    const createChallenge = async () => {
      try {
        const { data, error } = await supabase.auth.mfa.challenge({ factorId });
        if (error) throw error;
        setChallengeId(data.id);
      } catch (err: any) {
        setError('Failed to initialize verification. Please try again.');
      }
    };
    createChallenge();
  }, [factorId]);

  // Handle code input
  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (digit && index === 5) {
      const fullCode = [...newCode.slice(0, 5), digit].join('');
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = ['', '', '', '', '', ''];
    pasted.split('').forEach((char, i) => {
      if (i < 6) newCode[i] = char;
    });
    setCode(newCode);
    
    if (pasted.length === 6) {
      handleVerify(pasted);
    }
  };

  // Verify the code
  const handleVerify = async (codeStr?: string) => {
    const verifyCode = codeStr || code.join('');
    if (verifyCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    if (!challengeId) {
      setError('Verification not initialized. Please try again.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: verifyCode
      });

      if (error) throw error;

      addToast('Verified successfully', 'success');
      onSuccess();

    } catch (err: any) {
      console.error('MFA verify error:', err);
      setError(err.message || 'Invalid code. Please try again.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      
      // Refresh challenge for next attempt
      try {
        const { data } = await supabase.auth.mfa.challenge({ factorId });
        if (data) setChallengeId(data.id);
      } catch (e) {
        // Ignore refresh errors
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh challenge
  const handleRefresh = async () => {
    setError('');
    setCode(['', '', '', '', '', '']);
    try {
      const { data, error } = await supabase.auth.mfa.challenge({ factorId });
      if (error) throw error;
      setChallengeId(data.id);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError('Failed to refresh. Please try again.');
    }
  };

  return (
    <div className="flex flex-col h-full p-8 md:p-12 lg:p-16 justify-center animate-in fade-in slide-in-from-right-8 duration-500">
      {/* Back Button */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors group self-start"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Back to Login
      </button>

      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-4 text-brand-primary">
          <Shield size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Two-Factor Authentication</h1>
        <p className="text-gray-500 text-sm max-w-sm mx-auto">
          Enter the 6-digit code from your authenticator app to complete sign-in.
        </p>
      </div>

      {/* Code Input */}
      <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
        {code.map((digit, index) => (
          <input
            key={index}
            ref={el => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleCodeChange(index, e.target.value)}
            onKeyDown={e => handleKeyDown(index, e)}
            disabled={isLoading}
            aria-label={`Verification code digit ${index + 1}`}
            title={`Digit ${index + 1}`}
            className="w-14 h-16 text-center text-3xl font-bold border-2 border-gray-200 rounded-xl bg-white text-gray-900 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            autoFocus={index === 0}
          />
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-sm text-red-600 animate-in fade-in">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Verify Button */}
      <button
        onClick={() => handleVerify()}
        disabled={isLoading || code.join('').length !== 6}
        className="w-full bg-brand-primary hover:bg-[#5a5752] text-white font-semibold py-3.5 rounded-lg transition-all duration-300 shadow-lg shadow-brand-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Verifying...
          </>
        ) : (
          'Verify & Sign In'
        )}
      </button>

      {/* Refresh link */}
      <div className="mt-6 text-center">
        <button
          onClick={handleRefresh}
          className="text-sm text-gray-500 hover:text-brand-primary transition-colors inline-flex items-center gap-1"
        >
          <RefreshCw size={14} />
          Code not working? Refresh
        </button>
      </div>

      {/* Help text */}
      <div className="mt-8 text-center text-xs text-gray-400">
        <p>Open your authenticator app (Google, Authy, etc.)</p>
        <p>to find your verification code.</p>
      </div>
    </div>
  );
};
