import { type SyncState } from '@/hooks/useLocalSync';
import { Cloud, CloudOff, RefreshCw, ArrowUp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  syncState: SyncState;
  onForceSync?: () => void;
}

const SyncStatusBadge = ({ syncState, onForceSync }: Props) => {
  const { isOnline, pendingOps, isSyncing, lastSyncAt } = syncState;

  if (!isOnline) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-destructive/10 text-destructive text-xs font-medium cursor-default">
              <CloudOff className="h-3.5 w-3.5" />
              <span>Sin conexión</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Trabajando offline. Los cambios se sincronizarán al recuperar conexión.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        <span>Sincronizando...</span>
      </div>
    );
  }

  if (pendingOps > 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onForceSync}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors"
            >
              <ArrowUp className="h-3.5 w-3.5" />
              <span>{pendingOps} pendiente{pendingOps > 1 ? 's' : ''}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{pendingOps} operación(es) pendiente(s) de sincronizar. Click para forzar.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium cursor-default">
            <Cloud className="h-3.5 w-3.5" />
            <span>Sincronizado</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Última sync: {lastSyncAt ? lastSyncAt.toLocaleTimeString() : 'Cargando...'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SyncStatusBadge;
