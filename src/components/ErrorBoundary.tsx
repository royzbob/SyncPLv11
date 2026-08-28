import React, { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export interface ErrorBoundaryProps {
  children?: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
  key?: React.Key;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[SyncPL ErrorBoundary Caught]:", error, errorInfo);
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[320px] h-full p-6 text-center text-gray-300">
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 max-w-md w-full shadow-2xl flex flex-col items-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                {this.props.fallbackTitle || "View Rendering Notice"}
              </h3>
              <p className="text-xs text-gray-400">
                A temporary issue occurred while rendering this section.
              </p>
              {this.state.error?.message && (
                <div className="mt-2 p-2 rounded bg-black/40 border border-white/10 text-[11px] font-mono text-rose-300 break-words text-left max-h-24 overflow-y-auto">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 w-full">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload View</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
