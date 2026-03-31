import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function IncidentPanel({ incidents }) {
  return (
    <div className="glass-panel p-6 flex flex-col relative rounded-2xl h-full">
      <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-transparent via-soc-danger to-transparent"></div>
      
      <h2 className="text-lg font-bold mb-5 flex items-center gap-3 text-soc-danger tracking-widest uppercase">
        <ShieldAlert className="w-5 h-5" />
        Active Incidents
      </h2>
      <div className="flex-1 overflow-y-auto terminal-scroll pr-3 space-y-3">
        {incidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-soc-muted opacity-50">
            <ShieldCheck className="w-12 h-12 mb-3" />
            <span className="font-mono text-sm tracking-widest">NO THREATS DETECTED</span>
          </div>
        ) : (
          incidents.map((inc, i) => (
            <motion.div 
              key={inc.incident_id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 bg-black/30 border border-soc-border/50 rounded-xl hover:bg-black/50 hover:border-soc-accent/50 transition-all flex justify-between items-center group cursor-pointer"
            >
              <div>
                <div className="text-sm font-bold text-gray-200 tracking-wide font-mono group-hover:text-soc-accent transition-colors">{inc.incident_id}</div>
                <div className="text-[11px] text-soc-muted mt-1.5 font-mono">
                  TARGET: <span className="text-gray-300">{inc.src_ip}</span> | VOL: <span className="text-soc-accent font-bold">{inc.event_count}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`px-3 py-1 rounded text-[10px] font-bold tracking-widest border uppercase ${
                  inc.severity === 'High' ? 'bg-soc-danger/20 border-soc-danger text-soc-danger animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 
                  inc.severity === 'Medium' ? 'bg-soc-warning/20 border-soc-warning text-soc-warning' : 'bg-soc-success/20 border-soc-success text-soc-success'
                }`}>
                  {inc.severity}
                </span>
                <span className="text-[10px] font-mono text-soc-muted truncate max-w-[120px] text-right">{inc.action}</span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
