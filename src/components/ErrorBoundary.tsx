import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallbackTitle?: string;
}

interface State {
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('FeedBlocker UI error:', error, info.componentStack);
    }

    render() {
        if (this.state.error) {
            return (
                <div className="p-6 text-center space-y-3 max-w-sm mx-auto">
                    <h2 className="text-lg font-bold text-gray-900">
                        {this.props.fallbackTitle ?? 'Something went wrong'}
                    </h2>
                    <p className="text-sm text-gray-500">
                        The interface could not load. Try reloading or reopening this page.
                    </p>
                    <button
                        type="button"
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium"
                        onClick={() => this.setState({ error: null })}
                    >
                        Try again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
