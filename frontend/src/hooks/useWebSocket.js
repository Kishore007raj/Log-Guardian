import { useEffect } from 'react';
import { WS_BASE } from '../config';
import { useSocStore } from '../store/useSocStore';

export function useWebSocket() {
  const { connect, wsStatus } = useSocStore();

  useEffect(() => {
    connect();
    
    // Heartbeat
    const interval = setInterval(() => {
      if (wsStatus === 'CONNECTED') {
         // Optionally send ping if server supports
         // ws.send('ping')
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [connect, wsStatus]);

  return { wsStatus };
}
