import React from 'react';
import { Clock, LogOut, MousePointer2 } from 'lucide-react';

interface IdleTimeoutModalProps {
  secondsRemaining: number;
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

/**
 * Warning modal shown when user is about to be logged out due to inactivity.
 * Shows a countdown timer and options to stay logged in or logout.
 */
export const IdleTimeoutModal: React.FC<IdleTimeoutModalProps> = ({
  secondsRemaining,
  onStayLoggedIn,
  onLogout
}) => {
  // Format seconds as MM:SS
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // Progress percentage for the countdown ring
  const progress = (secondsRemaining / 60) * 100;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 fade-in duration-300">
        {/* Countdown Circle */}
        <div className="flex justify-center mb-6">
          <div className="relative w-28 h-28">
            {/* Background circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="45"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              {/* Progress circle */}
              <circle
                cx="56"
                cy="56"
                r="45"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                className={`transition-all duration-1000 ${
                  secondsRemaining <= 10 
                    ? 'text-red-500' 
                    : secondsRemaining <= 30 
                      ? 'text-amber-500' 
                      : 'text-brand-primary'
                }`}
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: strokeDashoffset
                }}
              />
            </svg>
            {/* Time display */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold font-mono ${
                secondsRemaining <= 10 ? 'text-red-500' : 'text-gray-900 dark:text-white'
              }`}>
                {timeDisplay}
              </span>
            </div>
          </div>
        </div>

        {/* Title & Description */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock size={20} className="text-amber-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Session Timeout Warning
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            You've been inactive for a while. For security reasons, you'll be 
            automatically logged out in <strong className="text-gray-900 dark:text-white">{secondsRemaining}</strong> seconds.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onStayLoggedIn}
            className="flex-1 flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-accent text-white font-semibold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-brand-primary/20"
          >
            <MousePointer2 size={18} />
            Stay Logged In
          </button>
          <button
            onClick={onLogout}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            Logout Now
          </button>
        </div>

        {/* Security notice */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-500 mt-6">
          🔒 This is a security feature to protect your account
        </p>
      </div>
    </div>
  );
};
