import { Activity, Database, Server, BrainCircuit } from 'lucide-react';
import { useSocStore } from '../store/useSocStore';

export default function SystemBar() {
  const { wsStatus, systemHealth } = useSocStore();

  const isCritical = systemHealth.pipelineStatus !== 'RUNNING' || wsStatus !== 'CONNECTED';

  return (
    <div className={`h-12 border-b border-soc-border bg-soc-panel flex items-center px-4 justify-between text-xs font-bold font-mono tracking-widest ${isCritical ? 'border-b-soc-danger bg-soc-danger/10' : ''}`}>
      <div className="flex gap-6 items-center">
        <div className="flex items-center gap-2 text-soc-accent">
          <Server size={14} /> CLOUDSENTINEL // SOC.CORE
        </div>

        <div className="h-4 w-px bg-soc-border"></div>

        <div className={`flex items-center gap-2 ${wsStatus === 'CONNECTED' ? 'text-soc-success' : 'text-soc-danger animate-pulse'}`}>
          <Activity size={14} /> WS: {wsStatus}
        </div>

        <div className={`flex items-center gap-2 ${systemHealth.pipelineStatus === 'RUNNING' ? 'text-soc-success' : 'text-soc-danger'}`}>
          STATUS: {systemHealth.pipelineStatus}
        </div>
      </div>

      <div className="flex gap-6 items-center text-soc-text">
        <div className="flex items-center gap-2">
          <Database size={14} className="text-soc-muted" /> Q: <span className={systemHealth.queueSize > 500 ? 'text-soc-danger' : 'text-soc-text'}>{systemHealth.queueSize}</span>
        </div>
        <div>
          RATE: <span className="text-soc-accent">{systemHealth.ingestionRate}</span> ev/s
        </div>
        <div>
          LAT: <span className={systemHealth.latency > 500 ? 'text-soc-warning' : 'text-soc-success'}>{systemHealth.latency || 0}</span> ms
        </div>
        <div className="h-4 w-px bg-soc-border"></div>
        <div className={`flex items-center gap-2 ${systemHealth.modelStatus === 'LOADED' ? 'text-soc-success' : 'text-soc-danger'}`}>
          <BrainCircuit size={14} /> MODEL: {systemHealth.modelStatus}
        </div>
      </div>
    </div>
  );
}
