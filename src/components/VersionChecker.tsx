import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const VersionChecker = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const initialScripts = useRef<string | null>(null);

  useEffect(() => {
    const extractScriptHashes = (html: string): string => {
      const matches = html.match(/src="\/assets\/[^"]+"/g);
      return matches ? matches.sort().join("|") : "";
    };

    const checkVersion = async () => {
      try {
        const res = await fetch(window.location.origin + "/index.html", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        const html = await res.text();
        const scripts = extractScriptHashes(html);

        if (!initialScripts.current) {
          initialScripts.current = scripts;
          return;
        }

        if (scripts && scripts !== initialScripts.current) {
          setUpdateAvailable(true);
        }
      } catch {
        // silently ignore
      }
    };

    checkVersion();
    const interval = setInterval(checkVersion, 3 * 60 * 1000); // cada 3 min
    return () => clearInterval(interval);
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg">
        <RefreshCw className="h-5 w-5 animate-spin" />
        <span className="text-sm font-medium">
          Hay una nueva versión disponible
        </span>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => window.location.reload()}
        >
          Actualizar ahora
        </Button>
      </div>
    </div>
  );
};

export default VersionChecker;
