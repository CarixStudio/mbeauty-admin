
import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
  title?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Widget error:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-full min-h-[200px] w-full flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
          <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-500 mb-3">
            <AlertCircle size={20} />
          </div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{this.props.title || "Widget Failed"}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[200px] mb-4">
            {this.state.error?.message || "Data could not be loaded."}
          </p>
          <Button size="sm" variant="outline" onClick={this.handleRetry}>
            <RefreshCw size={12} className="mr-2" /> Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
