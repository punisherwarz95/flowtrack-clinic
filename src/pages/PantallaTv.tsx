import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useVoiceQueue } from "@/hooks/useVoiceQueue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Monitor,
  Play,
  Settings,
  Upload,
  Trash2,
  Key,
  QrCode,
  Volume2,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Timer,
  User,
  Plus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Box {
  id: string;
  nombre: string;
  activo: boolean;
}

interface AtencionConPaciente {
  id: string;
  box_id: string | null;
  estado: string;
  numero_ingreso: number | null;
  pacientes: { nombre: string; rut: string | null } | null;
}

interface QRCode {
  id: string;
  titulo: string;
  imagen_url: string;
  orden: number;
  activo: boolean;
}

// ─── Helper: Chile time ────────────────────────────
const getChileTime = (): Date =>
  new Date(new Date().toLocaleString("en-US", { timeZone: "America/Santiago" }));

const getChileDateString = (): string => getChileTime().toISOString().split("T")[0];

// ────────────────────────────────────────────────────
const PantallaTv = () => {
  const [mode, setMode] = useState<"config" | "display" | "display-qr">("config");
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [selectedBoxIds, setSelectedBoxIds] = useState<string[]>([]);
  const [atenciones, setAtenciones] = useState<AtencionConPaciente[]>([]);
  const [codigoDelDia, setCodigoDelDia] = useState<string | null>(null);
  const [countdown, setCountdown] = useState("");
  const [horaReset, setHoraReset] = useState("07:00");
  const [qrCodes, setQRCodes] = useState<QRCode[]>([]);
  const [isUploadingQR, setIsUploadingQR] = useState(false);
  const [newQRTitle, setNewQRTitle] = useState("");
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedQRIds, setSelectedQRIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { announcePatient } = useVoiceQueue();

  // Track already-announced atencion ids to avoid repeating
  const announcedRef = useRef<Set<string>>(new Set());

  // ─── Load boxes ───────────────────────────
  useEffect(() => {
    const loadBoxes = async () => {
      const { data } = await supabase
        .from("boxes")
        .select("id, nombre, activo")
        .eq("activo", true)
        .order("nombre");
      if (data) setBoxes(data);
    };
    loadBoxes();
  }, []);

  // ─── Load QR codes ────────────────────────
  const loadQRCodes = useCallback(async () => {
    const { data } = await supabase
      .from("pantalla_qr_codes")
      .select("*")
      .eq("activo", true)
      .order("orden");
    if (data) {
      setQRCodes(data as QRCode[]);
      // Initialize selectedQRIds with all QRs if not yet set
      setSelectedQRIds((prev) => prev.length === 0 ? (data as QRCode[]).map(q => q.id) : prev);
    }
  }, []);

  useEffect(() => {
    loadQRCodes();
  }, [loadQRCodes]);

  // ─── Load daily code ──────────────────────
  useEffect(() => {
    const loadCodigo = async () => {
      const today = getChileDateString();
      const { data } = await supabase
        .from("codigos_diarios")
        .select("codigo")
        .eq("fecha", today)
        .maybeSingle();
      if (data) setCodigoDelDia(data.codigo);
    };

    const loadConfig = async () => {
      const { data } = await supabase
        .from("codigo_diario_config")
        .select("hora_reset")
        .maybeSingle();
      if (data) setHoraReset(data.hora_reset.substring(0, 5));
    };

    loadCodigo();
    loadConfig();

    const interval = setInterval(loadCodigo, 30000);
    return () => clearInterval(interval);
  }, []);

  // ─── Countdown ────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const chileTime = getChileTime();
      const [rH, rM] = horaReset.split(":").map(Number);
      const next = new Date(chileTime);
      next.setHours(rH, rM, 0, 0);
      if (chileTime >= next) next.setDate(next.getDate() + 1);
      const diff = next.getTime() - chileTime.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [horaReset]);

  // ─── Polling atenciones ───────────────────
  useEffect(() => {
    if (mode !== "display" || selectedBoxIds.length === 0) return;

    const poll = async () => {
      const todayStr = getChileDateString();
      const { data } = await supabase
        .from("atenciones")
        .select("id, box_id, estado, numero_ingreso, pacientes(nombre, rut)")
        .in("box_id", selectedBoxIds)
        .eq("estado", "en_atencion")
        .gte("fecha_ingreso", `${todayStr}T00:00:00`)
        .lt("fecha_ingreso", `${todayStr}T23:59:59`);

      if (data) {
        const typed = data as unknown as AtencionConPaciente[];
        // Detect new arrivals to announce
        typed.forEach((a) => {
          const announceKey = `${a.id}_${a.box_id}`;
          if (a.box_id && !announcedRef.current.has(announceKey)) {
            announcedRef.current.add(announceKey);
            const box = boxes.find((b) => b.id === a.box_id);
            if (box && a.pacientes?.nombre) {
              announcePatient(a.pacientes.nombre, box.nombre);
            }
          }
        });
        setAtenciones(typed);
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [mode, selectedBoxIds, boxes, announcePatient]);

  // ─── Realtime for immediate voice ─────────
  useEffect(() => {
    if (mode !== "display" || selectedBoxIds.length === 0) return;

    const channel = supabase
      .channel("pantalla-atenciones")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "atenciones" },
        async (payload) => {
          const newRow = payload.new as any;
          const announceKey = `${newRow.id}_${newRow.box_id}`;
          if (
            newRow.box_id &&
            selectedBoxIds.includes(newRow.box_id) &&
            newRow.estado === "en_atencion" &&
            !announcedRef.current.has(announceKey)
          ) {
            announcedRef.current.add(announceKey);
            // Fetch patient name
            const { data: pac } = await supabase
              .from("pacientes")
              .select("nombre")
              .eq("id", newRow.paciente_id)
              .maybeSingle();

            const box = boxes.find((b) => b.id === newRow.box_id);
            if (box && pac?.nombre) {
              announcePatient(pac.nombre, box.nombre);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mode, selectedBoxIds, boxes, announcePatient]);

  // ─── Toggle box selection ─────────────────
  const toggleBox = (boxId: string) => {
    setSelectedBoxIds((prev) =>
      prev.includes(boxId) ? prev.filter((id) => id !== boxId) : [...prev, boxId]
    );
  };

  // ─── Upload QR ────────────────────────────
  const handleUploadQR = async (file: File) => {
    if (!newQRTitle.trim()) {
      toast.error("Ingresa un título para el QR");
      return;
    }
    setIsUploadingQR(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("qr-codes")
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("qr-codes").getPublicUrl(fileName);

      const { error: insertError } = await supabase.from("pantalla_qr_codes").insert({
        titulo: newQRTitle.trim(),
        imagen_url: urlData.publicUrl,
        orden: qrCodes.length,
      });
      if (insertError) throw insertError;

      toast.success("QR agregado correctamente");
      setNewQRTitle("");
      setQrDialogOpen(false);
      loadQRCodes();
    } catch (err) {
      console.error(err);
      toast.error("Error al subir QR");
    } finally {
      setIsUploadingQR(false);
    }
  };

  const deleteQR = async (qr: QRCode) => {
    const fileName = qr.imagen_url.split("/").pop();
    if (fileName) {
      await supabase.storage.from("qr-codes").remove([fileName]);
    }
    await supabase.from("pantalla_qr_codes").delete().eq("id", qr.id);
    loadQRCodes();
    toast.success("QR eliminado");
  };

  const moveQR = async (qr: QRCode, direction: "up" | "down") => {
    const currentIndex = qrCodes.findIndex((q) => q.id === qr.id);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= qrCodes.length) return;

    const target = qrCodes[targetIndex];
    // Swap orden values
    await Promise.all([
      supabase.from("pantalla_qr_codes").update({ orden: target.orden }).eq("id", qr.id),
      supabase.from("pantalla_qr_codes").update({ orden: qr.orden }).eq("id", target.id),
    ]);
    loadQRCodes();
  };

  // ─── Start display ───────────────────────
  const startDisplay = () => {
    if (selectedBoxIds.length === 0) {
      toast.error("Selecciona al menos un box");
      return;
    }
    announcedRef.current.clear();
    setMode("display");
    // Go fullscreen
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const exitDisplay = () => {
    setMode("config");
    document.exitFullscreen?.().catch(() => {});
  };

  // ═════════════════════════════════════════
  // CONFIG MODE
  // ═════════════════════════════════════════
  if (mode === "config") {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Monitor className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Pantalla TV</h1>
              <p className="text-muted-foreground text-sm">
                Configura qué boxes mostrar y los códigos QR de la pantalla
              </p>
            </div>
          </div>

          {/* Box Selection */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Seleccionar Boxes</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {boxes.map((box) => (
                  <label
                    key={box.id}
                    className="flex items-center gap-2 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedBoxIds.includes(box.id)}
                      onCheckedChange={() => toggleBox(box.id)}
                    />
                    <span className="text-sm font-medium">{box.nombre}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* QR Management */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Códigos QR</h2>
                <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Agregar QR
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Agregar Código QR</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Label>Título</Label>
                        <Input
                          placeholder="Ej: Portal Paciente"
                          value={newQRTitle}
                          onChange={(e) => setNewQRTitle(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Imagen QR</Label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadQR(file);
                          }}
                        />
                        <Button
                          variant="outline"
                          className="w-full gap-2"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingQR}
                        >
                          <Upload className="h-4 w-4" />
                          {isUploadingQR ? "Subiendo..." : "Seleccionar imagen"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {qrCodes.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No hay códigos QR configurados. Agrega uno para mostrarlo en la pantalla.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {qrCodes.map((qr, index) => (
                    <div
                      key={qr.id}
                      className={`relative border rounded-lg p-3 text-center space-y-2 ${selectedQRIds.includes(qr.id) ? 'ring-2 ring-primary' : 'opacity-50'}`}
                    >
                      <div className="absolute top-2 left-2">
                        <Checkbox
                          checked={selectedQRIds.includes(qr.id)}
                          onCheckedChange={(checked) => {
                            setSelectedQRIds(prev =>
                              checked ? [...prev, qr.id] : prev.filter(id => id !== qr.id)
                            );
                          }}
                        />
                      </div>
                      <img
                        src={qr.imagen_url}
                        alt={qr.titulo}
                        className="w-48 h-48 object-contain rounded mx-auto"
                      />
                      <p className="text-sm font-medium">{qr.titulo}</p>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={index === 0}
                          onClick={() => moveQR(qr, "up")}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground font-mono w-6">{index + 1}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={index === qrCodes.length - 1}
                          onClick={() => moveQR(qr, "down")}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-7 w-7 text-destructive"
                        onClick={() => deleteQR(qr)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Start buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button size="lg" className="gap-2 text-lg h-14" onClick={startDisplay}>
              <Play className="h-5 w-5" />
              Iniciar con Boxes ({selectedBoxIds.length})
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 text-lg h-14"
              onClick={() => {
                setMode("display-qr");
                document.documentElement.requestFullscreen?.().catch(() => {});
              }}
            >
              <QrCode className="h-5 w-5" />
              Iniciar solo QR
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════
  // DISPLAY MODE - BOXES
  // ═════════════════════════════════════════
  const selectedBoxes = boxes.filter((b) => selectedBoxIds.includes(b.id));

  if (mode === "display") {
  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-900/80 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Monitor className="h-6 w-6 text-sky-400" />
          <h1 className="text-xl font-bold tracking-tight">Centro Médico Jenner</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Volume2 className="h-4 w-4" />
            <span className="text-sm">Voz activa</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={exitDisplay}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <Settings className="h-4 w-4 mr-1" />
            Configurar
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Boxes area */}
        <div className="flex-1 p-4 overflow-auto">
          <div
            className="grid gap-4 h-full"
            style={{
              gridTemplateColumns: `repeat(${Math.min(selectedBoxes.length, 4)}, 1fr)`,
            }}
          >
            {selectedBoxes.map((box) => {
              const boxAtenciones = atenciones.filter((a) => a.box_id === box.id);

              return (
                <div
                  key={box.id}
                  className={`rounded-2xl p-6 flex flex-col items-center text-center transition-all ${
                    boxAtenciones.length > 0
                      ? "bg-gradient-to-br from-sky-600/80 to-sky-800/80 border-2 border-sky-400/40 shadow-lg shadow-sky-500/20"
                      : "bg-slate-800/60 border border-slate-700/50"
                  }`}
                >
                  <p className="text-4xl font-extrabold uppercase tracking-widest text-white mb-4">
                    Box {box.nombre}
                  </p>

                  {boxAtenciones.length > 0 ? (
                    <div className="space-y-3 w-full">
                      {boxAtenciones.map((atencion) => (
                        <div key={atencion.id} className="flex flex-col items-center gap-1">
                          <div className="bg-white/10 rounded-full w-14 h-14 flex items-center justify-center">
                            <User className="h-7 w-7 text-sky-200" />
                          </div>
                          <p className="text-2xl font-bold leading-tight">
                            {atencion.pacientes?.nombre || "—"}
                          </p>
                          {atencion.numero_ingreso && (
                            <span className="bg-sky-400/20 text-sky-200 px-2 py-0.5 rounded-full text-xs font-mono">
                              #{atencion.numero_ingreso}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="opacity-40">
                      <div className="bg-white/5 rounded-full w-20 h-20 flex items-center justify-center mb-3">
                        <User className="h-10 w-10" />
                      </div>
                      <p className="text-2xl text-slate-400">Disponible</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Code + QRs */}
        <div className="w-80 border-l border-slate-800 bg-slate-900/50 p-4 flex flex-col gap-4 overflow-auto">
          {/* Daily code */}
          <div className="bg-gradient-to-br from-sky-900/50 to-slate-800/50 rounded-xl p-5 text-center border border-sky-700/30">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Key className="h-5 w-5 text-sky-400" />
              <p className="text-sm text-sky-300 font-medium uppercase tracking-wide">
                Código del Día
              </p>
            </div>
            <p className="text-5xl font-bold font-mono tracking-[0.2em] text-white mb-3">
              {codigoDelDia || "..."}
            </p>
            <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
              <Timer className="h-3 w-3" />
              <span>Próximo en {countdown}</span>
            </div>
          </div>

          {/* QR codes */}
          {qrCodes.filter(qr => selectedQRIds.includes(qr.id)).map((qr) => (
            <div
              key={qr.id}
              className="bg-white rounded-xl p-4 text-center space-y-2"
            >
              <img
                src={qr.imagen_url}
                alt={qr.titulo}
                className="w-48 h-48 object-contain mx-auto"
              />
              <p className="text-slate-900 font-semibold text-sm">{qr.titulo}</p>
            </div>
          ))}

          {qrCodes.filter(qr => selectedQRIds.includes(qr.id)).length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 text-slate-500 py-6">
              <QrCode className="h-10 w-10" />
              <p className="text-sm">Sin QR configurados</p>
            </div>
          )}
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════
  // DISPLAY MODE - QR ONLY
  // ═════════════════════════════════════════
  if (mode === "display-qr") {
    return (
      <div className="fixed inset-0 bg-slate-950 text-white flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-900/80 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <QrCode className="h-6 w-6 text-sky-400" />
            <h1 className="text-xl font-bold tracking-tight">Centro Médico Jenner</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={exitDisplay}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <Settings className="h-4 w-4 mr-1" />
            Configurar
          </Button>
        </div>

        {/* QR content */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
          <div className="flex flex-wrap gap-8 items-start justify-center max-w-6xl">
            {/* Daily code */}
            <div className="bg-gradient-to-br from-sky-900/50 to-slate-800/50 rounded-2xl p-8 text-center border border-sky-700/30 min-w-[280px]">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Key className="h-6 w-6 text-sky-400" />
                <p className="text-base text-sky-300 font-medium uppercase tracking-wide">
                  Código del Día
                </p>
              </div>
              <p className="text-6xl font-bold font-mono tracking-[0.2em] text-white mb-4">
                {codigoDelDia || "..."}
              </p>
              <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
                <Timer className="h-4 w-4" />
                <span>Próximo en {countdown}</span>
              </div>
            </div>

            {/* QR codes */}
            {qrCodes.filter(qr => selectedQRIds.includes(qr.id)).map((qr) => (
              <div
                key={qr.id}
                className="bg-white rounded-2xl p-6 text-center space-y-3 w-[280px]"
              >
                <img
                  src={qr.imagen_url}
                  alt={qr.titulo}
                  className="w-48 h-48 object-contain mx-auto"
                />
                <p className="text-slate-900 font-semibold">{qr.titulo}</p>
              </div>
            ))}

            {qrCodes.filter(qr => selectedQRIds.includes(qr.id)).length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 text-slate-500 py-12">
                <QrCode className="h-16 w-16" />
                <p className="text-lg">Sin QR configurados</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PantallaTv;
