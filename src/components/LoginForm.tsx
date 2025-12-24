
import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowLeft, Rocket, AlertTriangle, CheckCircle, User, ShieldCheck, Globe } from 'lucide-react';
import { Input } from './ui/Input';
import { Checkbox } from './ui/Checkbox';
import { useToast } from './ui/Toast';
import { MFAChallengeForm } from './MFAChallengeForm';
import { TermsOfService } from '../pages/TermsOfService';
import { PrivacyPolicy } from '../pages/PrivacyPolicy';
import { supabase } from '../lib/supabase';

interface LoginFormProps {
  onLoginSuccess: () => void;
}

type ViewState = 'login' | 'signup' | 'signup_success' | 'forgot' | 'forgot_success' | 'terms' | 'privacy' | 'mfa_challenge';

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const { addToast } = useToast();
  const [view, setView] = useState<ViewState>('login');
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);

  // Password Strength State
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    // Reset state on view change
    setErrorMessage(null);
    if (view !== 'signup_success' && view !== 'terms' && view !== 'privacy') {
        setPassword('');
        setEmail('');
        setName('');
        setAgreedToTerms(false);
    }
  }, [view]);

  // Password Strength Logic
  useEffect(() => {
    if (!password) {
        setPasswordStrength(0);
        return;
    }
    let score = 0;
    if (password.length > 7) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    setPasswordStrength(score);
  }, [password]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Check if MFA is required
        if (error.message?.includes('MFA') || error.message?.includes('factor')) {
          // Get the MFA factor
          const { data: factorsData } = await supabase.auth.mfa.listFactors();
          if (factorsData?.totp && factorsData.totp.length > 0) {
            const verifiedFactor = factorsData.totp.find(f => f.status === 'verified');
            if (verifiedFactor) {
              setMfaFactorId(verifiedFactor.id);
              setView('mfa_challenge');
              return;
            }
          }
        }
        throw error;
      }

      // Check if user has MFA factors enrolled
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      if (factorsData?.totp && factorsData.totp.length > 0) {
        const verifiedFactor = factorsData.totp.find(f => f.status === 'verified');
        if (verifiedFactor) {
          // User has 2FA enabled, need to verify
          setMfaFactorId(verifiedFactor.id);
          setView('mfa_challenge');
          return;
        }
      }

      // No MFA, proceed with login
      addToast('Authenticated successfully', 'success');
      
    } catch (error: any) {
      console.error('Login error:', error);
      setErrorMessage(error.message || "Invalid credentials.");
      addToast('Login failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
        setErrorMessage("You must agree to the Terms of Service.");
        return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      // SECURITY: We tag this user as 'is_admin_request'. 
      // The SQL trigger must listen for this flag to create an admin_profile.
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            is_admin_request: true 
          }
        }
      });

      if (error) throw error;

      setView('signup_success');
    } catch (error: any) {
      console.error('Signup error:', error);
      setErrorMessage(error.message || "Could not request access.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin, // Adjust if needed
      });
      if (error) throw error;
      setView('forgot_success');
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper for Password Strength Bar Color
  const getStrengthColor = () => {
      if (passwordStrength <= 1) return 'bg-red-500';
      if (passwordStrength === 2) return 'bg-amber-500';
      if (passwordStrength === 3) return 'bg-blue-500';
      return 'bg-green-500';
  };

  const getStrengthLabel = () => {
      if (passwordStrength === 0) return '';
      if (passwordStrength <= 1) return 'Weak';
      if (passwordStrength === 2) return 'Fair';
      if (passwordStrength === 3) return 'Good';
      return 'Strong';
  };

  // Render Sub-pages
  if (view === 'terms') return <TermsOfService onBack={() => setView('login')} />;
  if (view === 'privacy') return <PrivacyPolicy onBack={() => setView('login')} />;
  
  // MFA Challenge View
  if (view === 'mfa_challenge' && mfaFactorId) {
    return (
      <MFAChallengeForm
        factorId={mfaFactorId}
        onSuccess={() => {
          addToast('Authenticated successfully', 'success');
          onLoginSuccess();
        }}
        onBack={() => {
          setView('login');
          setMfaFactorId(null);
        }}
      />
    );
  }

  if (view === 'forgot_success') {
    return (
      <div className="flex flex-col h-full p-8 md:p-12 lg:p-16 justify-center animate-in fade-in slide-in-from-right-8 duration-500">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Check your email</h2>
          <p className="text-gray-500 mb-8">
            We've sent a password reset link to <span className="font-bold text-gray-800">{email}</span>.
          </p>
          <button 
            onClick={() => setView('login')}
            className="text-brand-primary font-bold hover:underline"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (view === 'signup_success') {
    return (
      <div className="flex flex-col h-full p-8 md:p-12 lg:p-16 justify-center animate-in fade-in slide-in-from-right-8 duration-500">
        <div className="text-center">
          <div className="w-20 h-20 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-6 text-brand-primary border-4 border-brand-light/50 shadow-inner">
            <ShieldCheck size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Request Sent</h2>
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 mb-8 text-left">
             <p className="text-gray-600 mb-4">
               Thank you for requesting access, <span className="font-bold text-gray-900">{name}</span>.
             </p>
             <p className="text-gray-600 mb-0">
               Please check your email to confirm your address. Once verified, the <span className="font-semibold text-brand-primary">Super Admin</span> will review your request.
             </p>
          </div>
          <button 
            onClick={() => setView('login')}
            className="text-brand-primary font-bold hover:underline flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} /> Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-8 md:p-12 lg:p-16">
        
        {/* Header Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center text-white font-bold text-xl">
            M
          </div>
          <span className="font-bold text-xl tracking-tight text-brand-primary">Momoh Beauty</span>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          
          {view === 'login' && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-3">Admin Access</h1>
                <p className="text-gray-500 text-sm">
                  Manage your luxury beauty empire with precision.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-sm text-red-600 animate-in fade-in">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form className="space-y-6" onSubmit={handleLogin}>
                <Input 
                  label="Email Address"
                  icon={Mail}
                  placeholder="Enter your email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                
                <Input 
                  label="Password"
                  icon={Lock}
                  placeholder="Enter your password"
                  isPassword
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <div className="flex items-center justify-between">
                  <Checkbox 
                    label="Keep me logged in" 
                    checked={keepLoggedIn}
                    onChange={setKeepLoggedIn}
                  />
                  <button 
                    type="button"
                    onClick={() => setView('forgot')}
                    className="text-sm text-brand-primary hover:text-brand-accent font-medium transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full bg-brand-primary hover:bg-[#5a5752] text-white font-semibold py-3.5 rounded-lg transition-all duration-300 shadow-lg shadow-brand-primary/20 active:transform active:scale-[0.98] overflow-hidden flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="animate-pulse">Authenticating...</span>
                  ) : (
                    <>
                      <span className="transition-transform duration-300 group-hover:-translate-x-8 relative z-10">Sign In</span>
                      <Rocket 
                        size={24} 
                        className="absolute opacity-0 translate-x-12 translate-y-4 rotate-45 transition-all duration-500 ease-out group-hover:opacity-100 group-hover:translate-x-4 group-hover:translate-y-0" 
                      />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 text-center text-sm text-gray-500">
                  Don't have an account? <button onClick={() => setView('signup')} className="font-bold text-brand-primary hover:underline">Request Access</button>
              </div>
            </div>
          )}

          {view === 'signup' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="text-center mb-8">
                      <h1 className="text-3xl font-bold text-gray-900 mb-3">Request Access</h1>
                      <p className="text-gray-500 text-sm">
                          Join the Momoh Beauty administrative team.
                      </p>
                  </div>

                  {errorMessage && (
                      <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-sm text-red-600 animate-in fade-in">
                          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                          <span>{errorMessage}</span>
                      </div>
                  )}

                  <form className="space-y-5" onSubmit={handleSignup}>
                      <Input 
                          label="Full Name"
                          icon={User}
                          placeholder="John Doe"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                      />
                      <Input 
                          label="Email Address"
                          icon={Mail}
                          placeholder="Enter your email address"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                      />
                      
                      <div>
                          <Input 
                              label="Password"
                              icon={Lock}
                              placeholder="Create a strong password"
                              isPassword
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                          />
                          {/* Password Strength Meter */}
                          {password && (
                              <div className="mt-2 space-y-1">
                                  <div className="flex gap-1 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                      <div className={`h-full flex-1 transition-all duration-300 ${passwordStrength >= 1 ? getStrengthColor() : 'bg-transparent'}`}></div>
                                      <div className={`h-full flex-1 transition-all duration-300 border-l border-white ${passwordStrength >= 2 ? getStrengthColor() : 'bg-transparent'}`}></div>
                                      <div className={`h-full flex-1 transition-all duration-300 border-l border-white ${passwordStrength >= 3 ? getStrengthColor() : 'bg-transparent'}`}></div>
                                      <div className={`h-full flex-1 transition-all duration-300 border-l border-white ${passwordStrength >= 4 ? getStrengthColor() : 'bg-transparent'}`}></div>
                                  </div>
                                  <div className="flex justify-between items-center text-xs">
                                      <span className="text-gray-400">Strength</span>
                                      <span className={`font-bold ${passwordStrength <= 1 ? 'text-red-500' : passwordStrength === 2 ? 'text-amber-500' : passwordStrength === 3 ? 'text-blue-500' : 'text-green-500'}`}>
                                          {getStrengthLabel()}
                                      </span>
                                  </div>
                              </div>
                          )}
                      </div>

                      <div className="flex items-start gap-3 pt-2">
                          <Checkbox 
                              label=""
                              checked={agreedToTerms}
                              onChange={setAgreedToTerms}
                          />
                          <div className="text-sm text-gray-600 leading-snug -mt-0.5">
                              I agree to the <button type="button" onClick={() => setView('terms')} className="text-brand-primary font-bold hover:underline">Terms of Service</button> and <button type="button" onClick={() => setView('privacy')} className="text-brand-primary font-bold hover:underline">Privacy Policy</button>.
                          </div>
                      </div>

                      <button 
                          type="submit"
                          disabled={isLoading || passwordStrength < 2 || !agreedToTerms}
                          className="w-full bg-brand-primary hover:bg-[#5a5752] text-white font-semibold py-3.5 rounded-lg transition-all duration-300 shadow-lg shadow-brand-primary/20 active:transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                          {isLoading ? <span className="animate-pulse">Sending Request...</span> : 'Request Access'}
                      </button>
                  </form>

                  <div className="mt-8 text-center text-sm text-gray-500">
                      Already have an account? <button onClick={() => setView('login')} className="font-bold text-brand-primary hover:underline">Sign In</button>
                  </div>
              </div>
          )}

          {view === 'forgot' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <button 
                onClick={() => setView('login')}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors group"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                Back to Sign In
              </button>
              
              <div className="text-center mb-10">
                <div className="w-12 h-12 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-4 text-brand-primary">
                  <Lock size={24} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-3">Forgot Password?</h1>
                <p className="text-gray-500 text-sm">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-sm text-red-600 animate-in fade-in">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form className="space-y-6" onSubmit={handleForgotSubmit}>
                <Input 
                  label="Email Address"
                  icon={Mail}
                  placeholder="Enter your email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-brand-primary hover:bg-[#5a5752] text-white font-semibold py-3.5 rounded-lg transition-all duration-300 shadow-lg shadow-brand-primary/20 active:transform active:scale-[0.98] disabled:opacity-70"
                >
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>

      {/* Fixed Footer */}
      <div className="bg-white/80 border-t border-gray-100 p-6 shrink-0 backdrop-blur-md">
        <div className="max-w-md mx-auto flex flex-col gap-4">
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Secured By Supabase Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-medium shadow-sm hover:shadow transition-all cursor-default">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Secured by Supabase</span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
               <button onClick={() => setView('terms')} className="hover:text-brand-primary transition-colors hover:underline decoration-gray-300 underline-offset-4">Terms</button>
               <button onClick={() => setView('privacy')} className="hover:text-brand-primary transition-colors hover:underline decoration-gray-300 underline-offset-4">Privacy</button>
               <span className="text-gray-300">|</span>
               <button onClick={() => window.open('https://momoh.com', '_blank')} className="flex items-center gap-1 hover:text-brand-primary transition-colors">
                  Momoh.com <Globe size={10} />
               </button>
            </div>
          </div>

          <div className="text-[10px] text-center text-gray-400 uppercase tracking-widest font-semibold flex items-center justify-center gap-2 opacity-60">
             <span>Admin Portal v2.4.0</span> • <span>Restricted Access</span>
          </div>

        </div>
      </div>
    </div>
  );
};
