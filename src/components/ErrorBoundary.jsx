// src/components/ErrorBoundary.jsx
import { Component } from 'react';
import { logger } from '../lib/logger';

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() { return { hasError: true }; }

  componentDidCatch(error, info) {
    logger.error('UI crash caught by ErrorBoundary', { error, info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center text-red-700">
          Something went wrong. Please refresh the page.
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;