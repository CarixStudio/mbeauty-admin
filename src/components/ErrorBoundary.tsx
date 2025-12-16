
import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center p-8 bg-brand-light text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-6">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-500 max-w-md mb-8">
            An unexpected error occurred. Our team has been notified.
            Please try refreshing the page.
          </p>
          <div className="bg-white p-4 rounded-lg border border-gray-200 text-left mb-8 max-w-md w-full overflow-auto max-h-48">
            <code className="text-xs text-red-500 font-mono break-all">
              {this.state.error?.message}
            </code>
          </div>
          <Button onClick={this.handleReload}>
            <RefreshCw size={16} className="mr-2" /> Reload Application
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
