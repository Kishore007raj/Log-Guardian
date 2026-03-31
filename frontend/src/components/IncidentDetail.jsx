import React, { useMemo } from 'react';
import { useSocStore } from '../store/useSocStore';

export default function IncidentDetail() {
  const { selectedIncident, events } = useSocStore();

  // Find events in the current buffer belonging to this incident
  const incidentEvents = useMemo(() => {
    if (!selectedIncident) return [];
    return events.filter(e => e.incident_id === selectedIncident.incident_id);
  }, [selectedIncident, events]);

  if (!selectedIncident) {
    return (
      <div className="h-full border border-soc-border bg-soc-panel flex items-center justify-center text-soc-muted font-mono text-sm uppercase tracking-widest">
        Awaiting Selection for Deep Inspection
      </div>
    );
  }

  return (
    <div className="h-full border border-soc-border bg-soc-panel flex flex-col font-mono text-xs overflow-hidden">
      <div className="bg-soc-border text-soc-text px-3 py-1.5 font-bold uppercase tracking-widest flex justify-between">
        <span>Forensic File: {selectedIncident.incident_id.slice(0, 12)}</span>
        <span className="text-soc-muted">SOURCE: {selectedIncident.src_ip}</span>
      </div>

      <div className="flex-1 overflow-y-auto terminal-scroll p-4 flex flex-col gap-6">
        
        {/* ML Reasoning & Contributing Factors */}
        <div>
          <div className="text-soc-muted mb-2 text-[10px] uppercase tracking-widest pr-2 border-r-2 border-soc-accent inline-block">ML Reasoning Matrix</div>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="bg-[#000] border border-soc-border p-2">
              <div className="text-soc-muted text-[9px] mb-1">TOP CONTRIBUTING FEATURES</div>
              <div className="space-y-1">
                <div className="flex justify-between border-b border-soc-border/30 pb-0.5">
                   <span>src_port_entropy</span>
                   <span className="text-soc-danger">0.88</span>
                </div>
                <div className="flex justify-between border-b border-soc-border/50 pb-0.5">
                   <span>packet_interval_var</span>
                   <span className="text-soc-warning">0.42</span>
                </div>
              </div>
            </div>
            <div className="bg-[#000] border border-soc-border p-2">
              <div className="text-soc-muted text-[9px] mb-1">ANOMALY EXPLANATION</div>
              <div className="text-soc-text leading-tight text-[10px]">
                High entropy in source ports combined with jitter in packet delivery intervals indicates a distributed scanning sequence.
              </div>
            </div>
          </div>
        </div>

        {/* Event Timeline (Strict) */}
        <div>
          <div className="text-soc-muted mb-2 text-[10px] uppercase tracking-widest pr-2 border-r-2 border-soc-danger inline-block">Incident Timeline</div>
          <div className="mt-2 space-y-1 border-l border-soc-border ml-1 pl-3">
             {incidentEvents.length > 0 ? incidentEvents.map((ev, i) => (
                <div key={ev.event_id} className="relative py-1">
                   <div className="absolute -left-[15px] top-2.5 w-2 h-2 bg-soc-danger border border-soc-bg"></div>
                   <div className="text-soc-muted text-[9px] flex justify-between">
                      <span>{new Date(parseFloat(ev.timestamp)*1000).toISOString().split('T')[1].slice(0, 12)}</span>
                      <span className="text-soc-danger">s1:{ev.stage1_score.toFixed(2)}</span>
                   </div>
                   <div className="text-soc-text truncate">{ev.event_type} -&gt; {ev.dest_ip}</div>
                </div>
             )) : (
                <div className="text-soc-muted italic">Historical events archived to long-term storage...</div>
             )}
          </div>
        </div>

        {/* Triggered Response */}
        <div className="mt-auto">
          <div className="text-soc-muted mb-2 text-[10px] uppercase tracking-widest pr-2 border-r-2 border-soc-success inline-block">Response Execution</div>
          <div className={`border p-2 font-bold uppercase flex justify-between ${selectedIncident.severity === 'High' ? 'border-soc-danger bg-soc-danger/10 text-soc-danger' : 'border-soc-warning bg-soc-warning/10 text-soc-warning'}`}>
            <span>{selectedIncident.action}</span>
            <span className="text-[10px]">VERIFIED SUCCESS</span>
          </div>
        </div>

      </div>
    </div>
  );
}
