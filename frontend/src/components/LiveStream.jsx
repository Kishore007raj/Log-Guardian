import React, { useRef, useEffect } from 'react';
import { useSocStore } from '../store/useSocStore';

export default function LiveStream() {
  const { events, selectEvent, selectedEvent } = useSocStore();
  const listRef = useRef(null);

  // Auto-scroll logic if native scrolling
  useEffect(() => {
    if (listRef.current) {
      // Keep scroll near top if new items arrive
      listRef.current.scrollTop = 0;
    }
  }, [events]);

  return (
    <div className="h-full flex flex-col bg-soc-panel border border-soc-border overflow-hidden">
      <div className="bg-soc-border text-soc-muted text-[10px] font-bold px-3 py-1.5 uppercase tracking-widest flex justify-between shrink-0">
        <span>Live Telemetry Stream</span>
        <span className="text-soc-text">{events.length} EVTS</span>
      </div>
      
      <div className="flex-1 w-full bg-black/20 overflow-y-auto" id="stream-container" ref={listRef}>
        {events.length === 0 ? (
          <div className="h-full flex items-center justify-center p-4 text-soc-muted animate-pulse uppercase tracking-[0.2em] text-xs">
             AWAITING TELEMETRY SECURE LINK...
          </div>
        ) : (
          <div className="w-full flex-col flex opacity-100 transition-opacity duration-300">
            {events.slice(0, 100).map((ev, index) => {
              if (!ev?.event_id) return null;
              
              const s1 = isNaN(parseFloat(ev.stage1_score)) ? 0.0 : parseFloat(ev.stage1_score);
              const s2 = isNaN(parseFloat(ev.stage2_score)) ? 0.0 : parseFloat(ev.stage2_score);
              const score = Math.max(s1, s2);

              let statusCol = 'text-soc-success';
              let statusText = 'PASS';

              if (ev.incident_id || score > 0.7) {
                statusCol = 'text-soc-danger bg-soc-danger/10';
                statusText = 'BLOCK';
              } else if (score > 0.4) {
                statusCol = 'text-soc-warning';
                statusText = 'WARN';
              }

              const timestamp = new Date(isNaN(parseFloat(ev.timestamp)) ? Date.now() : parseFloat(ev.timestamp) * 1000);
              const time = timestamp.toISOString().split('T')[1].slice(0, 12);
              const isSelected = selectedEvent?.event_id === ev?.event_id;

              return (
                <div 
                  key={ev.event_id || index}
                  onClick={() => selectEvent(ev)}
                  className={`flex items-center text-[10px] sm:text-xs whitespace-nowrap cursor-pointer hover:bg-soc-border hover:text-white transition-colors border-b border-soc-border/30 px-2 h-[28px] ${isSelected ? 'bg-soc-border text-soc-accent font-bold' : ''}`}
                >
                  <span className="text-soc-muted w-24 sm:w-28 shrink-0">[{time}]</span>
                  <span className="text-soc-text w-28 sm:w-32 shrink-0 truncate">{ev?.src_ip || "0.0.0.0"}</span>
                  <span className="text-soc-muted w-4 sm:w-6 shrink-0 text-center">→</span>
                  <span className="text-soc-text w-28 sm:w-32 shrink-0 truncate">{ev?.dest_ip || "0.0.0.0"}</span>
                  <span className="text-soc-muted mx-2">|</span>
                  <span className="text-soc-accent w-24 sm:w-28 shrink-0 truncate">{ev?.event_type || "RAW"}</span>
                  <span className="text-soc-muted mx-2">|</span>
                  <span className="w-20 sm:w-24 shrink-0 text-soc-muted">s1:{s1} s2:{s2}</span>
                  <span className="text-soc-muted mx-2">|</span>
                  <span className={`w-12 sm:w-14 shrink-0 font-bold ${statusCol}`}>{statusText}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
