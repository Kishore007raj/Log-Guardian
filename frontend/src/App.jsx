import React, { useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard';
import { login } from './services/api';

function App() {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    // Attempt automatic mock login to secure routes behind JWT
    login("admin", "admin")
      .then(() => setAuthReady(true))
      .catch((e) => {
        console.error("Login bypass failed", e);
        setAuthReady(true); // fall through for testing if API offline
      });
  }, []);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-soc-bg flex flex-col items-center justify-center text-soc-accent font-mono">
         <div className="w-12 h-1 bg-soc-accent animate-pulse mb-4" />
         [SYSTEM] ESTABLISHING SECURE CONTROL LINK...
      </div>
    );
  }

  return <Dashboard />;
}

export default App;
