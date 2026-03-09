import { Badge } from "@/components/ui/badge";
import { Timer, Clock3 } from "lucide-react";
import { PresionTimerInfo } from "@/hooks/usePresionTimers";

interface Props {
  timer?: PresionTimerInfo;
}

const formatSeconds = (seconds: number) => {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const PresionTimerBadge = ({ timer }: Props) => {
  if (!timer) return null;

  if (timer.isDue) {
    return (
      <Badge variant="destructive" className="gap-1">
        <Clock3 className="h-3 w-3" />
        PA T{timer.nextToma}: ahora
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 font-mono">
      <Timer className="h-3 w-3" />
      PA T{timer.nextToma}: {formatSeconds(timer.remainingSeconds)}
    </Badge>
  );
};

export default PresionTimerBadge;
