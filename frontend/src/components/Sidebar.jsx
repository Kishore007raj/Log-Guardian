import { LayoutDashboard, Activity, ShieldAlert, AlertCircle, Settings } from 'lucide-react';

export default function Sidebar() {
  const menu = [
    { name: 'Dashboard', icon: LayoutDashboard, active: true },
    { name: 'Events', icon: Activity },
    { name: 'Incidents', icon: ShieldAlert },
    { name: 'Alerts', icon: AlertCircle },
    { name: 'Settings', icon: Settings }
  ];

  return (
    <aside className="w-64 h-screen bg-soc-panel border-r border-soc-border flex flex-col hidden md:flex fixed left-0 top-0 z-50">
      <div className="p-6 flex items-center gap-3 border-b border-soc-border bg-soc-bg pb-5">
        <ShieldAlert className="w-8 h-8 text-soc-accent" />
        <span className="font-bold text-xl tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-soc-accent to-soc-success">
          CloudSentinel
        </span>
      </div>
      <nav className="flex-1 px-4 py-8 space-y-2">
        {menu.map((item, i) => (
          <div key={i} className={`flex items-center gap-4 px-4 py-3.5 rounded-lg cursor-pointer transition-colors ${item.active ? 'bg-soc-accent/10 text-soc-accent border border-soc-accent/20 shadow-[inset_4px_0_0_0_#38BDF8]' : 'text-soc-muted hover:bg-black/30 hover:text-soc-text'}`}>
            <item.icon className="w-5 h-5" />
            <span className="font-semibold tracking-wide text-sm">{item.name}</span>
          </div>
        ))}
      </nav>
      <div className="p-4 border-t border-soc-border bg-black/20 text-xs text-soc-muted text-center font-mono">
        v2.5.0-ENTERPRISE
      </div>
    </aside>
  );
}
