import React from 'react';
import { useSocStore } from '../store/useSocStore';

export default function PipelineView() {
  const { selectedEvent } = useSocStore();

  if (!selectedEvent) {
    return (
      <div className="h-full border border-soc-border bg-soc-panel flex items-center justify-center text-soc-muted font-mono text-sm uppercase tracking-widest">
        Awaiting Selection for Deep Inspection
      </div>
    );
  }

  const s1 = parseFloat(selectedEvent.stage1_score || 0).toFixed(2);
  const s2 = parseFloat(selectedEvent.stage2_score || 0).toFixed(2);

  return (
    <div className="h-full border border-soc-border bg-soc-panel flex flex-col font-mono text-xs overflow-hidden">
      <div className="bg-soc-border text-soc-text px-3 py-1.5 font-bold uppercase tracking-widest flex justify-between">
        <span>Pipeline Analysis</span>
        <span className="text-soc-muted">{selectedEvent.event_id.split('-')[0]}</span>
      </div>

      <div className="flex-1 overflow-y-auto terminal-scroll p-4 flex flex-col gap-6">
        {/* ROW 1: Raw Log */}
        <div>
          <div className="text-soc-muted mb-1">// RAW INGESTION</div>
          <div className="bg-[#000] p-2 border border-soc-border text-soc-accent break-all whitespace-pre-wrap">
            {selectedEvent.raw_log}
          </div>
        </div>

        {/* ROW 2: Extracted Features */}
        <div>
          <div className="text-soc-muted mb-1">// FEATURE EXTRACTION (SLIDING WINDOW)</div>
          <div className="grid grid-cols-3 gap-2 text-soc-text">
            {Object.entries(selectedEvent.features || {}).map(([k, v]) => (
              <div key={k} className="border border-soc-border p-2 bg-[#000] flex flex-col">
                <span className="text-[10px] text-soc-muted truncate">{k}</span>
                <span className="font-bold text-soc-accent">{typeof v === 'number' ? v.toFixed(2) : v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ROW 3: ML Models */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-soc-border p-3 bg-[#000]">
            <div className="text-soc-muted mb-2 border-b border-soc-border/50 pb-1">// STAGE 1: XGBOOST</div>
            <div className="flex justify-between items-end">
              <div>
                <div className="text-[10px]">ANOMALY PROBABILITY</div>
                <div className={`text-2xl font-black ${s1 > 0.6 ? 'text-soc-danger' : 'text-soc-success'}`}>{s1}</div>
              </div>
              <div className="text-[10px] text-soc-muted text-right max-w-[120px]">
                {s1 > 0.6 ? 'High deviation from baseline packet/port profile.' : 'Matches typical network baseline.'}
              </div>
            </div>
          </div>

          <div className="border border-soc-border p-3 bg-[#000]">
            <div className="text-soc-muted mb-2 border-b border-soc-border/50 pb-1">// STAGE 2: BiLSTM</div>
            <div className="flex justify-between items-end">
              <div>
                <div className="text-[10px]">SEQUENCE PROBABILITY</div>
                <div className={`text-2xl font-black ${s2 > 0.4 ? 'text-soc-warning' : 'text-soc-success'}`}>{s2}</div>
              </div>
              <div className="text-[10px] text-soc-muted text-right max-w-[120px]">
                {s2 > 0.4 ? 'Contextual sequence aligns with attack mapping.' : 'Independent context safe.'}
              </div>
            </div>
          </div>
        </div>

        {/* ROW 4: Final */}
        <div className="mt-auto">
          <div className="text-soc-muted mb-1">// FINAL CORRELATION & ACTION</div>
          <div className={`border p-3 font-bold uppercase flex justify-between ${selectedEvent.incident_id ? 'border-soc-danger bg-soc-danger/10 text-soc-danger' : 'border-soc-success bg-soc-success/10 text-soc-success'}`}>
            <span>{selectedEvent.incident_id ? `CORRELATED TO INCIDENT: ${selectedEvent.incident_id}` : 'CLEARED - PASSED FILTERS'}</span>
            <span>{selectedEvent.action || 'ALLOW'}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
