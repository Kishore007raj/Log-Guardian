import { Search, Bell, User } from 'lucide-react';

export default function Topbar({ health }) {
  const isOnline = health?.status === 'online';

  return (
    <header className="h-16 bg-soc-panel/80 backdrop-blur-xl border-b border-soc-border flex justify-between items-center px-6 fixed top-0 w-[calc(100%-16rem)] right-0 z-40">
      <div className="relative w-[500px]">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-soc-muted" />
        <input 
          type="text" 
          placeholder="Search by IP, Incident ID, or Rule Expression (e.g. src_ip:10.0.*)" 
          className="w-full bg-black/40 border border-soc-border rounded-lg pl-12 pr-4 py-2 text-sm text-soc-text focus:outline-none focus:border-soc-accent focus:shadow-[0_0_10px_rgba(56,189,248,0.2)] transition-all placeholder:text-soc-border font-mono"
        />
      </div>

      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3 px-4 py-1.5 bg-black/60 border border-soc-border rounded-full text-xs font-mono shadow-inner">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-soc-success shadow-[0_0_8px_#10B981]' : 'bg-soc-danger shadow-[0_0_8px_#EF4444]'} animate-pulse`} />
          <span className={isOnline ? 'text-soc-success' : 'text-soc-danger'}>SYS: {health?.status?.toUpperCase() || 'OFFLINE'}</span>
          <span className="text-soc-muted border-l border-soc-border pl-3 ml-1">{new Date().toLocaleTimeString()}</span>
        </div>
        
        <div className="relative cursor-pointer hover:text-soc-accent text-soc-muted transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-soc-danger rounded-full animate-ping" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-soc-danger rounded-full border border-soc-panel" />
        </div>

        <div className="flex items-center gap-2 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-soc-accent to-purple-500 p-[2px] group-hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all">
            <div className="w-full h-full rounded-full bg-soc-panel flex items-center justify-center">
              <User className="w-4 h-4 text-soc-text" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
