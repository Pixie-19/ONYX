'use client';
import type { ReactNode } from 'react';
import { Component } from 'react';

interface Props {
  children: ReactNode;
  resetKey: number;
  onRetry: () => void;
}

interface State {
  hasError: boolean;
}

export class GraphErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[ONYX] Operational graph crashed', error);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface-base/80 backdrop-blur">
        <div className="panel max-w-[360px] px-5 py-4 text-center">
          <div className="text-[13px] font-semibold text-primary">Operational graph paused</div>
          <div className="text-[12px] text-secondary mt-2">
            The topology renderer encountered a recoverable error. The rest of ONYX is still live.
          </div>
          <button
            onClick={this.props.onRetry}
            className="btn btn-accent h-8 px-3 text-[12.5px] mt-4"
          >
            Restart graph
          </button>
        </div>
      </div>
    );
  }
}
