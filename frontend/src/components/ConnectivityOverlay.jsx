import React from 'react';
import { useSocStore } from '../store/useSocStore';
import { AlertTriangle, RefreshCw, ServerOff } from 'lucide-react';

export default function ConnectivityOverlay() {
  const { wsStatus, systemHealth, reconnectAttempt } = useSocStore();

  const isBackendDown = systemHealth.pipelineStatus === 'DEGRADED' && systemHealth.modelStatus === 'FAILED';
  const isWsDisconnected = wsStatus === 'DISCONNECTED' || wsStatus === 'RECONNECTING';

  if (!isBackendDown && !isWsDisconnected) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#050505]/90 backdrop-blur-sm flex items-center justify-center p-6 font-mono">
      <div className="max-w-md w-full border border-soc-danger bg-[#0a0a0a] p-8 shadow-[0_0_50px_rgba(220,38,38,0.2)]">
        <div className="flex items-center gap-4 text-soc-danger mb-6">
          {isBackendDown ? <ServerOff size={32} /> : <AlertTriangle size={32} className="animate-pulse" />}
          <h2 className="text-xl font-black uppercase tracking-tighter">
            {isBackendDown ? "CRITICAL: Backend Unreachable" : "STREAM INTERRUPTED"}
          </h2>
        </div>

        <div className="space-y-4 text-sm text-soc-muted">
          <p>
            {isBackendDown 
              ? "The SOC Core API is not responding. All heartbeat probes have failed. System is in fail-safe mode."
              : "The real-time telemetry stream has been severed. Automatic recovery sequence initiated."}
          </p>

          <div className="bg-black p-4 border border-soc-border space-y-2">
            <div className="flex justify-between">
              <span>RECOVERY ATTEMPT:</span>
              <span className="text-soc-text font-bold">#{reconnectAttempt + 1}</span>
            </div>
            <div className="flex justify-between">
              <span>TARGET_HOST:</span>
              <span className="text-soc-accent font-bold">127.0.0.1:8000</span>
            </div>
            <div className="flex justify-between">
              <span>STRATEGY:</span>
              <span className="text-soc-warning font-bold">EXPONENTIAL_BACKOFF</span>
            </div>
          </div>

          <div className="flex items-center gap-3 py-2">
            <RefreshCw size={16} className="animate-spin text-soc-accent" />
            <span className="text-[10px] uppercase tracking-widest text-soc-accent">
              Awaiting handshake from CloudSentinel Core...
            </span>
          </div>
        </div>

        <div className="mt-8 border-t border-soc-border pt-4 text-[9px] text-soc-muted uppercase flex justify-between">
          <span>Error_Code: ERR_CONN_REFUSED</span>
          <span>Security_Level: P1_CRITICAL</span>
        </div>
      </div>
    </div>
  );
}
