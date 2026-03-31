import { motion } from 'framer-motion';
import { Activity, ShieldAlert, ShieldCheck, Crosshair } from 'lucide-react';

export default function ThreatMetrics({ events, incidents }) {
  const totalEvents = events.length;
  // Estimate for UI purposes: combine actual tracked incidents and generic score anomalies
  const activeThreats = incidents.length;
  const blocked = incidents.reduce((acc, curr) => acc + curr.event_count, 0) + (events.filter(e => e.stage2_score > 0.6).length);
  const critical = incidents.filter(i => i.severity === 'High').length;

  const cards = [
    { title: 'Total Events Analyzed', value: totalEvents, icon: Activity, color: 'text-soc-accent', border: 'border-soc-accent/30', bg: 'bg-soc-accent/10' },
    { title: 'Active Incidents', value: activeThreats, icon: ShieldAlert, color: 'text-soc-warning', border: 'border-soc-warning/30', bg: 'bg-soc-warning/10' },
    { title: 'Threats Mitigated', value: blocked, icon: ShieldCheck, color: 'text-soc-success', border: 'border-soc-success/30', bg: 'bg-soc-success/10' },
    { title: 'Critical Anomalies', value: critical, icon: Crosshair, color: 'text-soc-danger', border: 'border-soc-danger/30', bg: 'bg-soc-danger/10' },
  ];

  return (
    <div className="grid grid-cols-4 gap-6">
      {cards.map((c, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.4 }}
          className="glass-panel p-6 relative overflow-hidden group hover:border-soc-muted transition-colors cursor-default"
        >
          {/* Neon background highlight */}
          <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full ${c.bg} blur-3xl group-hover:scale-150 transition-transform duration-700 pointer-events-none`} />
          
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-soc-muted text-xs font-bold tracking-widest uppercase mb-3">{c.title}</p>
              <div className="flex items-baseline gap-2">
                <motion.span 
                   key={c.value} // re-animates on value change
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className={`text-4xl font-black font-mono tracking-tight ${c.color}`}
                >
                  {c.value.toLocaleString()}
                </motion.span>
              </div>
            </div>
            <div className={`p-3 rounded-xl ${c.bg} border ${c.border} shadow-inner`}>
              <c.icon className={`w-6 h-6 ${c.color}`} strokeWidth={1.5} />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
