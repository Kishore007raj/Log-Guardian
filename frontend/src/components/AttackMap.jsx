import { MapPin } from 'lucide-react';

export default function AttackMap({ events }) {
  return (
    <div className="glass-panel p-5 relative overflow-hidden group rounded-2xl border-t-2 border-t-soc-border h-full min-h-[300px]">
       {/* Background Map SVG */}
       <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-no-repeat bg-center bg-contain opacity-10 filter invert transition-opacity duration-1000" />
       <div className="absolute inset-0 bg-gradient-to-b from-soc-panel/80 to-soc-bg/90 pointer-events-none" />
       
       <div className="relative z-10 flex justify-between">
          <h2 className="text-[13px] font-bold flex items-center gap-2 text-soc-accent tracking-widest uppercase">
            <MapPin className="w-4 h-4" />
            Global Threat Map
          </h2>
          <div className="flex gap-4 text-[10px] font-mono tracking-widest bg-black/40 px-3 py-1.5 rounded-full border border-soc-border">
             <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-soc-success animate-pulse"/> SECURE</div>
             <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-soc-danger animate-ping"/> ORIGIN</div>
          </div>
       </div>
       
       {/* Dynamic Pulses based on live attacks */}
       <div className="relative w-full h-[calc(100%-2rem)] mt-2">
         {events.filter(e => e.stage2_score > 0.7).slice(0, 5).map((ev, i) => (
            <div key={i} className="absolute z-20 flex items-center gap-2 transition-all duration-300"
                 style={{ 
                    top: `${30 + (i * 12 + Math.random()*5)}%`, 
                    left: `${30 + (Math.random() * 40)}%` 
                 }}>
              <div className="relative flex h-6 w-6">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-soc-danger opacity-75"></span>
                <span className="relative inline-flex rounded-full h-6 w-6 bg-soc-danger border-2 border-white/20 items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.8)]"></span>
              </div>
              <div className="bg-black/80 backdrop-blur-sm border border-soc-danger/50 px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap hidden group-hover:block transition-all text-soc-danger animate-fade-in shadow-xl">
                 {ev.src_ip}
              </div>
            </div>
         ))}
         
         {/* Static decorative grids and crosshairs */}
         <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[1px] bg-soc-accent opacity-[0.05]" />
         <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-full bg-soc-accent opacity-[0.05]" />
       </div>
    </div>
  );
}
