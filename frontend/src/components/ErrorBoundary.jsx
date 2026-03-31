import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[CRITICAL] Component Crash Caught by SOC Boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-[#050505] text-soc-danger font-mono p-12 flex flex-col items-center justify-center border-4 border-soc-danger z-50">
          <h1 className="text-4xl font-black mb-4">SYSTEM CRITICAL ERROR</h1>
          <p className="text-xl mb-8 uppercase tracking-widest text-soc-muted">
            The UI layer has suffered a catastrophic failure. 
          </p>
          <div className="bg-black border border-soc-danger p-6 max-w-2xl overflow-auto text-xs w-full terminal-scroll">
            <pre className="text-soc-danger whitespace-pre-wrap">
              {this.state.error?.toString()}
            </pre>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-8 px-6 py-2 border-2 border-soc-danger hover:bg-soc-danger hover:text-white transition-all uppercase font-bold tracking-widest"
          >
            Initiate System Reset
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}
