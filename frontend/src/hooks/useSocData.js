import { useState, useEffect } from 'react';
import { fetchEvents, fetchIncidents, fetchHealth } from '../services/api';

export function useSocData(pollingInterval = 2000) {
  const [data, setData] = useState({
    events: [],
    incidents: [],
    health: { status: 'offline' }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchAll = async () => {
      try {
        const [evData, incData, healthData] = await Promise.all([
          fetchEvents(), fetchIncidents(), fetchHealth()
        ]);
        if (isMounted) {
          // Normalize responses (ensure arrays if error object returned)
          setData({
            events: Array.isArray(evData) ? evData : [],
            incidents: Array.isArray(incData) ? incData : [],
            health: healthData?.status ? healthData : { status: 'offline' }
          });
          setLoading(false);
        }
      } catch (err) {
        if(isMounted) console.error("API Polling Error:", err);
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, pollingInterval);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [pollingInterval]);

  return { ...data, loading };
}
