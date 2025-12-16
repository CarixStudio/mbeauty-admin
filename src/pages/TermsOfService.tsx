
import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';

interface TermsProps {
  onBack: () => void;
}

export const TermsOfService: React.FC<TermsProps> = ({ onBack }) => {
  return (
    <div className="flex flex-col h-full p-8 md:p-12 lg:p-16 overflow-y-auto scrollbar-hide animate-in fade-in slide-in-from-right-8 duration-500">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors group self-start"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Back to Login
      </button>

      <div className="max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-brand-light rounded-lg flex items-center justify-center text-brand-primary">
                <Shield size={20} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Terms of Service</h1>
        </div>
        
        <div className="prose prose-sm prose-gray max-w-none space-y-6 text-gray-600">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Last Updated: May 24, 2024</p>
            
            <section>
                <h3 className="text-gray-900 font-bold text-lg mb-2">1. Acceptance of Terms</h3>
                <p>By accessing the Momoh Beauty Administrative Dashboard ("Admin Panel"), you agree to be bound by these Terms of Service. This system is restricted to authorized personnel only.</p>
            </section>

            <section>
                <h3 className="text-gray-900 font-bold text-lg mb-2">2. Authorized Use</h3>
                <p>Access is granted solely for the purpose of managing Momoh Beauty operations. Unauthorized access, sharing of credentials, or use of this system for personal gain is strictly prohibited and may result in immediate termination and legal action.</p>
            </section>

            <section>
                <h3 className="text-gray-900 font-bold text-lg mb-2">3. Data Confidentiality</h3>
                <p>You acknowledge that this dashboard contains sensitive Customer Data (PII) and Business Intelligence. You agree to:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Maintain strict confidentiality of all data viewed or exported.</li>
                    <li>Not download customer lists to personal devices.</li>
                    <li>Report any suspected security breaches immediately.</li>
                </ul>
            </section>

            <section>
                <h3 className="text-gray-900 font-bold text-lg mb-2">4. Account Security</h3>
                <p>You are responsible for maintaining the security of your account. Two-Factor Authentication (2FA) is mandatory for Super Admin roles. Do not leave your session active on shared devices.</p>
            </section>

            <section>
                <h3 className="text-gray-900 font-bold text-lg mb-2">5. Termination</h3>
                <p>Momoh Beauty reserves the right to revoke access to the Admin Panel at any time, without notice, for any reason, including but not limited to violation of these Terms.</p>
            </section>
        </div>
        
        <div className="mt-12 pt-6 border-t border-gray-100 flex justify-center">
            <p className="text-xs text-gray-400">© 2024 Momoh Beauty Inc. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};
