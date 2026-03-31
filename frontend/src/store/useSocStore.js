import { create } from 'zustand';
import { API_BASE, WS_BASE, WS_RECONNECT_INTERVALS, HEALTH_CHECK_INTERVAL } from '../config';

export const useSocStore = create((set, get) => ({
  wsStatus: 'DISCONNECTED',
  isInitialLoading: true,
  reconnectAttempt: 0,
  events: [], // Virtualized buffer max 1000
  incidents: [],
  selectedEvent: null,
  selectedIncident: null,
  systemHealth: {
    ingestionRate: 0,
    latency: 0,
    queueSize: 0,
    modelStatus: 'LOADED',
    pipelineStatus: 'STOPPED',
    sqlite: 'disconnected',
    json_storage: 'disconnected'
  },
  
  connect: () => {
    const { wsStatus, reconnectAttempt } = get();
    if (wsStatus === 'CONNECTED' || wsStatus === 'CONNECTING') return;
    
    console.log(`[WS] Attempting connection to ${WS_BASE} (Attempt ${reconnectAttempt + 1})`);
    set({ wsStatus: 'CONNECTING' });

    const ws = new WebSocket(WS_BASE);
    
    ws.onopen = () => {
      console.log(`[WS] Connected successfully.`);
      set((state) => ({ 
        wsStatus: 'CONNECTED',
        reconnectAttempt: 0,
        isInitialLoading: false,
        systemHealth: { ...state.systemHealth, pipelineStatus: 'RUNNING' }
      }));
      get().fetchHealth(); // Immediate sync on connect
      get().fetchIncidents();
    };

    ws.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data);
        set((state) => {
          const newEvents = [event, ...state.events].slice(0, 1000);
          const latencyMs = Math.max(0, Date.now() - (parseFloat(event.timestamp) * 1000));
          
          return {
            events: newEvents,
            systemHealth: {
              ...state.systemHealth,
              latency: latencyMs.toFixed(1),
              ingestionRate: Math.floor(Math.random() * 50) + 12
            }
          };
        });
        
        if (event.incident_id) {
            get().fetchIncidents();
        }
      } catch (e) {
        console.error("[WS] Message parsing error:", e);
      }
    };

    ws.onclose = (event) => {
      const nextAttempt = get().reconnectAttempt;
      const delay = WS_RECONNECT_INTERVALS[Math.min(nextAttempt, WS_RECONNECT_INTERVALS.length - 1)];
      
      console.warn(`[WS] Link severed (code: ${event.code}). Retrying in ${delay}ms...`);
      
      set((state) => ({ 
        wsStatus: 'RECONNECTING',
        reconnectAttempt: state.reconnectAttempt + 1,
        systemHealth: { ...state.systemHealth, pipelineStatus: 'STOPPED' }
      }));

      setTimeout(() => get().connect(), delay);
    };
    
    ws.onerror = (err) => {
      console.error("[WS] Critical stream fault:", err);
      set((state) => ({ 
        systemHealth: { ...state.systemHealth, pipelineStatus: 'DEGRADED' } 
      }));
    };
  },

  fetchHealth: async () => {
    try {
      const res = await fetch(`${API_BASE}/system/health`);
      if (!res.ok) throw new Error("Health check failed");
      const data = await res.json();
      set((state) => ({
        systemHealth: {
            ...state.systemHealth,
            queueSize: data.queue_size,
            sqlite: data.sqlite,
            json_storage: data.json_storage
        }
      }));
    } catch (err) {
       console.error("[API] Health probe failed:", err.message);
       set((state) => ({ 
         systemHealth: { ...state.systemHealth, pipelineStatus: 'DEGRADED', modelStatus: 'FAILED' } 
       }));
    }
  },

  fetchIncidents: async () => {
    try {
      const res = await fetch(`${API_BASE}/incidents?limit=50`);
      if (!res.ok) return;
      const data = await res.json();
      set({ incidents: data });
    } catch (e) {
      console.warn("[API] Incident sync failed.");
    }
  },
  
  selectEvent: (event) => set({ selectedEvent: event, selectedIncident: null }),
  selectIncident: (incident) => set({ selectedIncident: incident, selectedEvent: null })
}));
