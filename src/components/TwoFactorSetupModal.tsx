import React, { useState, useEffect, useRef } from 'react';
import { X, Shield, QrCode, CheckCircle, AlertTriangle, Copy, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Modal for setting up Two-Factor Authentication using TOTP (Time-based One-Time Password).
 * Flow:
 * 1. Generate TOTP secret via Supabase MFA API
 * 2. Display QR code for scanning with authenticator app
 * 3. User enters verification code to confirm setup
 */
export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [step, setStep] = useState<'loading' | 'scan' | 'verify' | 'success' | 'error'>('loading');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [factorId, setFactorId] = useState<string>('');
  const [verifyCode, setVerifyCode] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string>('');
  const [showSecret, setShowSecret] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize MFA enrollment when modal opens
  useEffect(() => {
    if (!isOpen) return;
    
    const enrollMFA = async () => {
      setStep('loading');
      setError('');
      
      try {
        // Enroll a new TOTP factor
        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: 'Momoh Admin Authenticator'
        });

        if (error) throw error;

        if (data) {
          setQrCode(data.totp.qr_code);
          setSecret(data.totp.secret);
          setFactorId(data.id);
          setStep('scan');
        }
      } catch (err: any) {
        console.error('MFA enroll error:', err);
        setError(err.message || 'Failed to set up 2FA');
        setStep('error');
      }
    };

    enrollMFA();
  }, [isOpen]);

  // Handle code input
  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    
    const newCode = [...verifyCode];
    newCode[index] = digit;
    setVerifyCode(newCode);

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verifyCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...verifyCode];
    pasted.split('').forEach((char, i) => {
      if (i < 6) newCode[i] = char;
    });
    setVerifyCode(newCode);
    
    // Focus last filled input
    const lastIndex = Math.min(pasted.length - 1, 5);
    inputRefs.current[lastIndex]?.focus();
  };

  // Verify the code
  const handleVerify = async () => {
    const code = verifyCode.join('');
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      // Challenge the factor to verify it works
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factorId
      });

      if (challengeError) throw challengeError;

      // Verify the challenge with the user's code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factorId,
        challengeId: challengeData.id,
        code: code
      });

      if (verifyError) throw verifyError;

      setStep('success');
      
      // Close after brief delay
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);

    } catch (err: any) {
      console.error('MFA verify error:', err);
      setError(err.message || 'Invalid code. Please try again.');
      setVerifyCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  // Copy secret to clipboard
  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-in zoom-in-95 fade-in duration-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Close"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {/* Loading State */}
        {step === 'loading' && (
          <div className="text-center py-12">
            <Loader2 size={48} className="animate-spin text-brand-primary mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Setting up 2FA...</p>
          </div>
        )}

        {/* Error State */}
        {step === 'error' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Setup Failed</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium"
            >
              Close
            </button>
          </div>
        )}

        {/* Scan QR Code Step */}
        {step === 'scan' && (
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-brand-light dark:bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-4">
                <QrCode size={24} className="text-brand-primary" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Scan QR Code</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Use your authenticator app (Google, Authy, etc.) to scan
              </p>
            </div>

            {/* QR Code */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-center mb-6">
              <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
            </div>

            {/* Manual Entry Option */}
            <div className="mb-6">
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
                Can't scan? Enter this code manually:
              </p>
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <code className="flex-1 text-sm font-mono text-gray-700 dark:text-gray-300 break-all">
                  {showSecret ? secret : '••••••••••••••••••••••••'}
                </code>
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title={showSecret ? 'Hide' : 'Show'}
                >
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  onClick={handleCopySecret}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Copy"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            <button
              onClick={() => setStep('verify')}
              className="w-full py-3 bg-brand-primary hover:bg-brand-accent text-white font-semibold rounded-lg transition-colors"
            >
              I've Scanned the Code
            </button>
          </>
        )}

        {/* Verify Code Step */}
        {step === 'verify' && (
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-brand-light dark:bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield size={24} className="text-brand-primary" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Enter Verification Code</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            {/* Code Input */}
            <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
              {verifyCode.map((digit, index) => (
                <input
                  key={index}
                  ref={el => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleCodeChange(index, e.target.value)}
                  onKeyDown={e => handleKeyDown(index, e)}
                  aria-label={`Verification code digit ${index + 1}`}
                  title={`Digit ${index + 1}`}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#333] text-gray-900 dark:text-white focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                />
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('scan')}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Back
              </button>
              <button
                onClick={handleVerify}
                disabled={isVerifying || verifyCode.join('').length !== 6}
                className="flex-1 py-3 bg-brand-primary hover:bg-brand-accent text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Enable'
                )}
              </button>
            </div>
          </>
        )}

        {/* Success State */}
        {step === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">2FA Enabled!</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Your account is now protected with two-factor authentication.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
