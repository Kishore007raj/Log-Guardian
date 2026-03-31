import React, { useState, useMemo } from 'react';
import { useSocStore } from '../store/useSocStore';

export default function IncidentTable() {
  const { incidents, selectIncident, selectedIncident } = useSocStore();
  const [filter, setFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'last_seen_timestamp', direction: 'desc' });

  const filteredIncidents = useMemo(() => {
    let items = [...incidents];
    if (filter) {
      items = items.filter(i => i.src_ip.includes(filter));
    }
    items.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return items;
  }, [incidents, filter, sortConfig]);

  const requestSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="h-full border border-soc-border bg-soc-panel flex flex-col font-mono text-xs overflow-hidden">
      <div className="bg-soc-border text-soc-text px-3 py-1.5 font-bold uppercase tracking-widest flex justify-between items-center">
        <span>Active Incidents</span>
        <div className="flex items-center gap-4">
          <input 
            type="text" 
            placeholder="FILTER IP..." 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-[#000] border border-soc-border px-2 py-0.5 text-[10px] text-soc-accent placeholder:text-soc-muted focus:outline-none"
          />
          <span className="text-soc-muted">{filteredIncidents.length} INC</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto terminal-scroll">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-soc-bg border-b border-soc-border shadow-md select-none">
            <tr>
              <th onClick={() => requestSort('incident_id')} className="p-2 font-normal text-soc-muted uppercase tracking-wider cursor-pointer hover:text-soc-text">ID</th>
              <th onClick={() => requestSort('src_ip')} className="p-2 font-normal text-soc-muted uppercase tracking-wider cursor-pointer hover:text-soc-text">Target IP</th>
              <th onClick={() => requestSort('event_count')} className="p-2 font-normal text-soc-muted uppercase tracking-wider cursor-pointer hover:text-soc-text">Count</th>
              <th onClick={() => requestSort('severity')} className="p-2 font-normal text-soc-muted uppercase tracking-wider cursor-pointer hover:text-soc-text">Severity</th>
              <th className="p-2 font-normal text-soc-muted uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredIncidents.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-6 text-center text-soc-muted uppercase tracking-widest">
                  {filter ? 'NO MATCHES FOUND' : 'Clean State. No immediate threats.'}
                </td>
              </tr>
            ) : (
              filteredIncidents.map((inc) => {
                const isSelected = selectedIncident?.incident_id === inc.incident_id;
                let sevStyle = "text-soc-success";
                let sevBg = "bg-transparent";
                if (inc.severity === 'High') {
                  sevStyle = "text-soc-danger";
                  sevBg = "bg-soc-danger/10 border-soc-danger";
                } else if (inc.severity === 'Medium') {
                  sevStyle = "text-soc-warning";
                  sevBg = "bg-soc-warning/10 border-soc-warning";
                }

                return (
                  <tr 
                    key={inc.incident_id}
                    onClick={() => selectIncident(inc)}
                    className={`cursor-pointer border-b border-soc-border/50 hover:bg-[#111] transition-colors ${isSelected ? 'bg-[#1a1a1a] shadow-[inset_2px_0_0_0_#0ea5e9]' : ''}`}
                  >
                    <td className="p-2 text-soc-text truncate max-w-[80px]">{inc.incident_id.split('-')[1] || inc.incident_id.slice(0, 8)}</td>
                    <td className="p-2 text-soc-accent">{inc.src_ip}</td>
                    <td className="p-2 text-white">{inc.event_count}</td>
                    <td className="p-2">
                       <span className={`px-1 py-0.5 border text-[10px] uppercase font-bold tracking-widest ${sevStyle} ${sevBg}`}>
                         {inc.severity}
                       </span>
                    </td>
                    <td className="p-2 text-soc-muted text-right truncate max-w-[100px]">{inc.action}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
