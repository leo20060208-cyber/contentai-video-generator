'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ChunkErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        // Check if it's a chunk loading error
        if (
            error.name === 'ChunkLoadError' ||
            error.message.includes('Loading chunk') ||
            error.message.includes('ChunkLoadError')
        ) {
            return { hasError: true, error };
        }
        // Re-throw other errors
        throw error;
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Chunk loading error caught:', error, errorInfo);
    }

    handleReload = () => {
        // Clear any cached chunks and reload
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-gray-50">
                    <div className="max-w-md p-8 bg-white rounded-lg shadow-lg text-center">
                        <div className="mb-4">
                            <svg
                                className="w-16 h-16 mx-auto text-yellow-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Update Required
                        </h2>
                        <p className="text-gray-600 mb-6">
                            The application has been updated. Please reload the page to continue.
                        </p>
                        <button
                            onClick={this.handleReload}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
