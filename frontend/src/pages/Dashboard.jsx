import React, { useEffect, useState } from 'react';
import SystemBar from '../components/SystemBar';
import LiveStream from '../components/LiveStream';
import PipelineView from '../components/PipelineView';
import IncidentTable from '../components/IncidentTable';
import IncidentDetail from '../components/IncidentDetail';
import ResponseLog from '../components/ResponseLog';
import ConnectivityOverlay from '../components/ConnectivityOverlay';
import { useSocStore } from '../store/useSocStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { API_BASE, HEALTH_CHECK_INTERVAL } from '../config';
import { Crosshair } from 'lucide-react';

export default function Dashboard() {
  const { fetchHealth, fetchIncidents } = useSocStore();
  const { wsStatus } = useWebSocket();
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    fetchHealth();
    fetchIncidents();
    
    const intervalId = setInterval(fetchHealth, HEALTH_CHECK_INTERVAL);
    return () => clearInterval(intervalId);
  }, []);

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      await fetch(`${API_BASE}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num_events: 1000 })
      });
    } catch(e) { console.error("[SIMULATE] Critical failure:", e) }
    setTimeout(() => setIsSimulating(false), 3000);
  };

  return (
    <div className="h-screen w-screen bg-soc-bg text-soc-text font-mono flex flex-col overflow-hidden relative">
      <ConnectivityOverlay />
      
      {/* Top: System State */}
      <SystemBar />

      <div className="flex justify-between items-center px-4 py-2 border-b border-soc-border bg-[#000]">
         <div className="text-soc-muted text-xs tracking-widest uppercase">Target Defense Matrix</div>
         <button 
           onClick={handleSimulate}
           disabled={isSimulating}
           className="text-[10px] uppercase font-bold tracking-widest px-4 py-1 flex items-center gap-2 border border-soc-danger bg-soc-danger/10 text-soc-danger hover:bg-soc-danger hover:text-white transition-all disabled:opacity-50"
         >
            <Crosshair size={12} />
            {isSimulating ? 'INJECTION LOCK...' : 'SIMULATE MULTI-VECTOR ATTACK'}
         </button>
      </div>

      {/* Main Grid: Left, Center, Right */}
      <div className="flex flex-1 overflow-hidden bg-soc-bg">
        
        {/* Left → Live Stream */}
        <div className="w-1/3 h-full p-2 border-r border-soc-border flex flex-col relative">
          <LiveStream />
        </div>

        {/* Center → Pipeline */}
        <div className="w-1/3 h-full p-2 border-r border-soc-border flex flex-col relative text-xl">
          <PipelineView />
        </div>

        {/* Right → Incidents (Split table / detail) */}
        <div className="w-1/3 h-full p-2 flex flex-col gap-2 relative">
          <div className="flex-1 overflow-hidden min-h-0">
             <IncidentTable />
          </div>
          <div className="h-64 shrink-0 overflow-hidden">
             <IncidentDetail />
          </div>
        </div>
      </div>

      {/* Bottom → Response Logs */}
      <div className="h-48 shrink-0 overflow-hidden">
         <ResponseLog />
      </div>

    </div>
  );
}
