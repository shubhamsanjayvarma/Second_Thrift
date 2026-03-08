import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', background: '#111', color: '#ff4444', minHeight: '100vh', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
          <h2>🔥 React App Crashed</h2>
          <p>Please share this error message with the developer:</p>
          <pre style={{ background: '#222', padding: '20px', borderRadius: '8px', overflowX: 'auto', color: '#ffabab', marginTop: '20px', whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            {'\n\n'}
            {this.state.error && this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
