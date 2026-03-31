import React, { useEffect, useRef, useState } from 'react';
import { useSocStore } from '../store/useSocStore';

export default function ResponseLog() {
  const { events } = useSocStore();
  const [logs, setLogs] = useState([]);
  const bottomRef = useRef(null);

  // Filter only actions
  useEffect(() => {
    if (events.length > 0) {
      const topEvent = events[0];
      if (topEvent.action && topEvent.action !== 'None') {
        setLogs(prev => {
          // Avoid dupes if same event ID arrives multiple times
          if (prev.find(p => p.event_id === topEvent.event_id)) return prev;
          return [topEvent, ...prev].slice(0, 100);
        });
      }
    }
  }, [events]);

  return (
    <div className="h-full border-t border-soc-border bg-[#000] flex flex-col font-mono text-xs overflow-hidden">
      <div className="bg-soc-border/50 text-soc-accent px-3 py-1 text-[10px] font-bold uppercase tracking-widest flex justify-between">
        <span>System Log & Autoscaling Handlers</span>
        <span className="text-soc-muted">ACTIVE</span>
      </div>

      <div className="flex-1 overflow-y-auto terminal-scroll p-2 flex flex-col-reverse">
        {logs.length === 0 ? (
          <div className="text-soc-muted p-2 animate-pulse">Waiting for ML defensive actions...</div>
        ) : (
          logs.map(log => {
             const time = new Date(parseFloat(log.timestamp)*1000).toISOString().split('T')[1].slice(0, 8);
             return (
               <div key={log.event_id} className="text-soc-muted whitespace-nowrap mb-1 hover:text-white hover:bg-soc-border transition-colors">
                 <span className="opacity-50">[{time}]</span>
                 <span className="mx-2 text-soc-success font-bold">{log.action}</span>
                 <span>→ {log.src_ip}</span>
                 <span className="mx-2 opacity-50">|</span>
                 <span className="text-soc-text font-bold">SUCCESS</span>
               </div>
             )
          })
        )}
      </div>
    </div>
  );
}
