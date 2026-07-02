import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-deep-black flex items-center justify-center p-6">
                    <div className="max-w-md w-full text-center space-y-6">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                            <AlertCircle size={32} className="text-red-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                An unexpected error occurred. This has been logged automatically.
                            </p>
                        </div>
                        {this.state.error && (
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left">
                                <p className="text-xs text-gray-500 font-mono break-all">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}
                        <button
                            onClick={this.handleRetry}
                            className="inline-flex items-center gap-2 bg-brand-blue text-white px-6 py-3 rounded-full font-semibold hover:bg-brand-blue/90 transition-all shadow-lg shadow-brand-blue/20"
                        >
                            <RefreshCw size={18} />
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
