
import React from 'react';
import { ArrowLeft, Lock } from 'lucide-react';

interface PrivacyProps {
  onBack: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyProps> = ({ onBack }) => {
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
                <Lock size={20} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
        </div>
        
        <div className="prose prose-sm prose-gray max-w-none space-y-6 text-gray-600">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Last Updated: May 24, 2024</p>
            
            <section>
                <h3 className="text-gray-900 font-bold text-lg mb-2">1. Data Collection</h3>
                <p>The Admin Dashboard collects and logs user activity for security and audit purposes. This includes:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>IP Address and Device Information upon login.</li>
                    <li>Timestamp of specific actions (e.g., refunds, exports).</li>
                    <li>Changes made to product or customer records (Audit Log).</li>
                </ul>
            </section>

            <section>
                <h3 className="text-gray-900 font-bold text-lg mb-2">2. Use of Information</h3>
                <p>Information collected within this dashboard is used solely for:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Internal business operations and fulfillment.</li>
                    <li>Security monitoring and fraud prevention.</li>
                    <li>Performance analysis of the platform.</li>
                </ul>
            </section>

            <section>
                <h3 className="text-gray-900 font-bold text-lg mb-2">3. Data Protection</h3>
                <p>All data transmitted to and from this dashboard is encrypted using TLS 1.3. Databases are encrypted at rest. Access logs are immutable and retained for 90 days for compliance.</p>
            </section>

            <section>
                <h3 className="text-gray-900 font-bold text-lg mb-2">4. Third-Party Access</h3>
                <p>We do not sell or share admin user data with third parties. Sub-processors (e.g., Stripe, AWS) may process data strictly for the provision of services as defined in our vendor agreements.</p>
            </section>

            <section>
                <h3 className="text-gray-900 font-bold text-lg mb-2">5. Your Rights</h3>
                <p>As an employee or contractor, you have the right to request access to your activity logs. Please contact the Super Admin or IT Department for data inquiries.</p>
            </section>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-100 flex justify-center">
            <p className="text-xs text-gray-400">© 2024 Momoh Beauty Inc. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};
