import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ShieldAlert } from 'lucide-react';

export default function LiveFeed({ events }) {
  return (
    <div className="glass-panel p-6 flex flex-col h-full rounded-2xl relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-soc-accent to-transparent"></div>
      
      <h2 className="text-lg font-bold mb-5 flex items-center gap-3 text-soc-accent tracking-widest uppercase">
        <Activity className="w-5 h-5 animate-pulse" />
        Live Event Stream
      </h2>
      
      <div className="flex-1 overflow-y-auto terminal-scroll pr-3 space-y-3">
        <AnimatePresence>
          {events.map((ev, i) => {
            const score = ev.stage2_score || 0;
            const isAttack = score > 0.7;
            const isSuspicious = score > 0.4 && score <= 0.7;
            
            const borderCol = isAttack ? "border-soc-danger" : isSuspicious ? "border-soc-warning" : "border-soc-border";
            const textCol = isAttack ? "text-soc-danger" : isSuspicious ? "text-soc-warning" : "text-soc-success";
            const bgCol = isAttack ? "bg-soc-danger/10" : isSuspicious ? "bg-soc-warning/10" : "bg-black/20";

            return (
              <motion.div 
                key={ev.event_id}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={`p-4 rounded-lg border-l-4 ${borderCol} ${bgCol} text-sm font-mono transition-colors hover:bg-black/40`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-soc-muted text-xs tracking-wider">
                    {new Date(parseFloat(ev.timestamp)*1000).toLocaleTimeString()}
                  </span>
                  <span className={`font-bold ${textCol} flex items-center gap-1.5`}>
                    {isAttack && <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />} SCORE: {score.toFixed(2)}
                  </span>
                </div>
                <div className="text-gray-300 mb-1"><span className="text-soc-muted">SRC:</span> {ev.src_ip}</div>
                <div className="text-gray-300"><span className="text-soc-muted">DST:</span> {ev.dest_ip}:{ev.features?.port || 80}</div>
                <div className="mt-3 flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-black/60 border border-soc-border rounded text-[10px] tracking-wider text-gray-400 font-semibold uppercase">
                    {ev.event_type}
                  </span>
                  {ev.incident_id && (
                    <span className="px-2 py-1 bg-soc-danger/20 border border-soc-danger text-soc-danger font-bold rounded text-[10px] animate-pulse">
                      INCIDENT: {ev.incident_id.substring(0,8)}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {events.length === 0 && <div className="text-soc-muted text-center pt-10 font-mono text-sm">Awaiting telemetry...</div>}
      </div>
    </div>
  );
}
