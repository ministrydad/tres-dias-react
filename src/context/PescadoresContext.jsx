// src/context/PescadoresContext.jsx
// Shared cache for men_raw and women_raw data
// Prevents re-fetching on every navigation

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

const PescadoresContext = createContext();

export function PescadoresProvider({ children }) {
  const { orgId } = useAuth();
  const [allPescadores, setAllPescadores] = useState({ men: [], women: [] });
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState(null);
  const [error, setError] = useState(null);

  // Fetch data ONCE on mount or when orgId changes
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchData = async () => {
      if (!orgId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log('PescadoresContext: Fetching data from Supabase...');
        
        const [menResult, womenResult] = await Promise.all([
          supabase
            .from('men_raw')
            .select('*')
            .eq('org_id', orgId)
            .abortSignal(abortController.signal),
          supabase
            .from('women_raw')
            .select('*')
            .eq('org_id', orgId)
            .abortSignal(abortController.signal)
        ]);

        if (menResult.error) throw menResult.error;
        if (womenResult.error) throw womenResult.error;

        if (isMounted) {
          console.log('PescadoresContext: Fetched', menResult.data?.length || 0, 'men and', womenResult.data?.length || 0, 'women');
          setAllPescadores({
            men: menResult.data || [],
            women: womenResult.data || []
          });
          setLastFetched(new Date());
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('PescadoresContext: Fetch aborted');
          return;
        }
        
        if (isMounted) {
          console.error('PescadoresContext: Error fetching data:', error);
          setError(error);
          window.showMainStatus?.('Failed to load directory data', true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      abortController.abort();
      console.log('PescadoresContext: Cleanup executed');
    };
  }, [orgId]);

  // Manual refresh function
  const refreshData = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      if (!silent) {
        console.log('PescadoresContext: Manual refresh...');
      }
      
      const [menResult, womenResult] = await Promise.all([
        supabase
          .from('men_raw')
          .select('*')
          .eq('org_id', orgId),
        supabase
          .from('women_raw')
          .select('*')
          .eq('org_id', orgId)
      ]);

      if (menResult.error) throw menResult.error;
      if (womenResult.error) throw womenResult.error;

      console.log('PescadoresContext: Refreshed', menResult.data?.length || 0, 'men and', womenResult.data?.length || 0, 'women');
      setAllPescadores({
        men: menResult.data || [],
        women: womenResult.data || []
      });
      setLastFetched(new Date());
      if (!silent) {
        window.showMainStatus?.('Directory data refreshed', false);
      }
    } catch (error) {
      console.error('PescadoresContext: Error refreshing data:', error);
      setError(error);
      if (!silent) {
        window.showMainStatus?.('Failed to refresh directory data', true);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Check if data is stale (older than 5 minutes)
  const isStale = () => {
    if (!lastFetched) return false; // Don't auto-refresh if never fetched
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - lastFetched.getTime() > fiveMinutes;
  };

  // Update a single person in cache (optimistic update)
  const updatePersonInCache = (gender, pescadoreKey, updatedData) => {
    setAllPescadores(prev => {
      const updated = { ...prev };
      const index = updated[gender].findIndex(p => p.PescadoreKey === pescadoreKey);
      if (index !== -1) {
        updated[gender][index] = { ...updated[gender][index], ...updatedData };
      }
      return updated;
    });
  };

  const value = {
    allPescadores,
    loading,
    error,
    lastFetched,
    refreshData,
    isStale,
    updatePersonInCache
  };

  return (
    <PescadoresContext.Provider value={value}>
      {children}
    </PescadoresContext.Provider>
  );
}

// Custom hook to use the context
export function usePescadores() {
  const context = useContext(PescadoresContext);
  if (!context) {
    throw new Error('usePescadores must be used within a PescadoresProvider');
  }
  return context;
}