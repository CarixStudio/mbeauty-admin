import { useState, useEffect, useCallback, useRef } from 'react';

interface IdleTimeoutConfig {
  /** Idle timeout in minutes before warning (default: 15) */
  timeoutMinutes?: number;
  /** Warning duration in seconds before logout (default: 60) */
  warningSeconds?: number;
  /** Callback when user is logged out due to inactivity */
  onTimeout: () => void;
  /** Whether the timeout is enabled */
  enabled?: boolean;
}

interface IdleTimeoutReturn {
  /** Whether the warning modal should be shown */
  showWarning: boolean;
  /** Seconds remaining until auto-logout */
  secondsRemaining: number;
  /** Call this to reset the timer (user clicked "Stay") */
  resetTimer: () => void;
  /** Call this to dismiss warning and stay logged in */
  stayLoggedIn: () => void;
}

/**
 * Hook for detecting user inactivity and showing a warning before logout.
 * Industry standard for admin panels: 15 minutes idle timeout.
 * 
 * Events tracked: mouse, keyboard, touch, scroll, click
 */
export function useIdleTimeout({
  timeoutMinutes = 15,
  warningSeconds = 60,
  onTimeout,
  enabled = true
}: IdleTimeoutConfig): IdleTimeoutReturn {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(warningSeconds);
  
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningMs = (timeoutMinutes - 1) * 60 * 1000; // 1 min before timeout

  // Reset the idle timer
  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    setSecondsRemaining(warningSeconds);
    
    // Clear existing countdown
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, [warningSeconds]);

  // Handle "Stay Logged In" button click
  const stayLoggedIn = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  // Start the countdown when warning is shown
  useEffect(() => {
    if (!showWarning || !enabled) return;

    setSecondsRemaining(warningSeconds);
    
    countdownTimerRef.current = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          // Time's up - logout
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
          }
          onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [showWarning, warningSeconds, onTimeout, enabled]);

  // Set up activity listeners and check timer
  useEffect(() => {
    if (!enabled) return;

    const handleActivity = () => {
      // Only reset if not in warning mode
      if (!showWarning) {
        lastActivityRef.current = Date.now();
      }
    };

    // Events that indicate user activity
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Check for idle every 10 seconds
    idleTimerRef.current = setInterval(() => {
      const now = Date.now();
      const idleTime = now - lastActivityRef.current;

      if (idleTime >= warningMs && !showWarning) {
        setShowWarning(true);
      }
    }, 10000);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [enabled, showWarning, warningMs]);

  return {
    showWarning,
    secondsRemaining,
    resetTimer,
    stayLoggedIn
  };
}
