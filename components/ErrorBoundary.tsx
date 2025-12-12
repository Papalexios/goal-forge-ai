import React, { Component, ErrorInfo, ReactNode } from 'react';
import { GoalForgeAILogo } from './icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-8">
                <GoalForgeAILogo className="w-16 h-16" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
            <p className="text-gray-400 max-w-md mb-8">
                We encountered an unexpected issue. The application state has been preserved safely.
            </p>
            <div className="bg-gray-900 border border-red-900/50 p-4 rounded-lg mb-8 max-w-lg w-full overflow-auto">
                <code className="text-red-400 text-xs font-mono whitespace-pre-wrap">
                    {this.state.error?.toString()}
                </code>
            </div>
            <div className="flex gap-4">
                <button
                    onClick={() => window.location.reload()}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-xl transition-all hover:scale-105"
                >
                    Reload Application
                </button>
                <button
                    onClick={() => {
                        localStorage.clear();
                        window.location.reload();
                    }}
                    className="bg-gray-800 hover:bg-red-900/50 text-gray-300 hover:text-red-300 font-bold py-3 px-8 rounded-xl transition-all"
                >
                    Hard Reset
                </button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
