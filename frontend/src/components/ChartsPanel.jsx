import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Clock, PieChart as PieIcon } from 'lucide-react';

export default function ChartsPanel({ events, incidents }) {
  // Process timeline data
  const timelineData = [...events].reverse().map(e => ({
    time: new Date(parseFloat(e.timestamp) * 1000).toLocaleTimeString(),
    score: e.stage2_score || 0
  }));

  // Process pie data based on severities
  let high = 0, med = 0, low = 0;
  incidents.forEach(i => {
    if(i.severity === 'High') high++;
    else if(i.severity === 'Medium') med++;
    else low++;
  });
  const pieData = [
    { name: 'High', value: high, color: '#EF4444' },
    { name: 'Medium', value: med, color: '#F59E0B' },
    { name: 'Low', value: low, color: '#10B981' },
  ].filter(d => d.value > 0);

  return (
    <div className="grid grid-cols-3 gap-6 h-[250px]">
      {/* Timeline */}
      <div className="col-span-2 glass-panel p-5 rounded-2xl flex flex-col relative z-20">
        <h2 className="text-[13px] font-bold mb-4 flex items-center gap-2 text-soc-muted tracking-widest uppercase">
          <Clock className="w-4 h-4 text-soc-accent" />
          Threat Timeline
        </h2>
        <div className="flex-1 bg-black/20 rounded-xl p-2 border border-soc-border/30 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" hide />
              <YAxis hide domain={[0, 1]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0B1120', borderColor: '#334155', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px' }} 
                itemStyle={{ color: '#EF4444', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="score" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distribution */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col relative z-20">
         <h2 className="text-[13px] font-bold mb-2 flex items-center gap-2 text-soc-muted tracking-widest uppercase">
          <PieIcon className="w-4 h-4 text-soc-warning" />
          Severity Distribution
        </h2>
        <div className="flex-1 flex items-center justify-center">
          {pieData.length === 0 ? (
            <span className="text-soc-muted font-mono text-xs tracking-widest">NO DATA</span>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" stroke="none">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0B1120', borderColor: '#334155', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
