import React, { createContext, useContext } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLocalSync, type SyncState } from '@/hooks/useLocalSync';

interface SyncContextValue extends SyncState {
  forcePull: () => Promise<void>;
  forcePush: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext();
  const userTipo = (user?.user_metadata as any)?.tipo;
  const sync = useLocalSync(!loading && !!user && userTipo !== 'empresa');

  return (
    <SyncContext.Provider value={sync}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncContext(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    // Return a safe default when outside provider
    return {
      isOnline: true,
      pendingOps: 0,
      lastSyncAt: null,
      isSyncing: false,
      forcePull: async () => {},
      forcePush: async () => {},
    };
  }
  return ctx;
}
