import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Copy, RefreshCw, Settings, Clock, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Letras y números permitidos (sin I, O, 0, 1 para evitar confusión)
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const NUMEROS = '23456789';

// Total de combinaciones posibles: 24^3 * 8 * 7 = 774,144 combinaciones
const TOTAL_COMBINACIONES = LETRAS.length ** 3 * NUMEROS.length * (NUMEROS.length - 1);

// Generar código con índice específico usando un algoritmo determinista
const generarCodigoPorIndice = (indice: number): string => {
  // Normalizar el índice al rango de combinaciones
  const idx = indice % TOTAL_COMBINACIONES;
  
  // Calcular letras (24^3 = 13824 combinaciones)
  const letra1 = Math.floor(idx / (LETRAS.length * LETRAS.length * NUMEROS.length * (NUMEROS.length - 1))) % LETRAS.length;
  const letra2 = Math.floor(idx / (LETRAS.length * NUMEROS.length * (NUMEROS.length - 1))) % LETRAS.length;
  const letra3 = Math.floor(idx / (NUMEROS.length * (NUMEROS.length - 1))) % LETRAS.length;
  
  // Calcular números (no repetidos)
  const numIdx = idx % (NUMEROS.length * (NUMEROS.length - 1));
  const num1Idx = Math.floor(numIdx / (NUMEROS.length - 1));
  let num2Idx = numIdx % (NUMEROS.length - 1);
  if (num2Idx >= num1Idx) num2Idx++; // Saltar el número usado en num1
  
  return LETRAS[letra1] + LETRAS[letra2] + LETRAS[letra3] + NUMEROS[num1Idx] + NUMEROS[num2Idx];
};

// Función para obtener la hora actual en Chile
const getChileTime = (): Date => {
  const now = new Date();
  // Convertir a zona horaria de Chile
  const chileTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Santiago' }));
  return chileTime;
};

// Función para obtener la fecha actual en Chile como string YYYY-MM-DD
const getChileDateString = (): string => {
  const chileTime = getChileTime();
  return chileTime.toISOString().split('T')[0];
};

interface CodigoDelDiaProps {
  className?: string;
}

const CodigoDelDia = ({ className }: CodigoDelDiaProps) => {
  const [codigoDelDia, setCodigoDelDia] = useState<string | null>(null);
  const [isLoadingCodigo, setIsLoadingCodigo] = useState(true);
  const [isGeneratingCodigo, setIsGeneratingCodigo] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [horaReset, setHoraReset] = useState("07:00");
  const [countdown, setCountdown] = useState<string>("");
  const [totalCodigos, setTotalCodigos] = useState<number>(0);

  // Calcular tiempo restante para el próximo reset
  const calcularCountdown = useCallback(() => {
    const chileTime = getChileTime();
    const [resetHora, resetMinuto] = horaReset.split(':').map(Number);
    
    // Crear fecha del próximo reset
    const proximoReset = new Date(chileTime);
    proximoReset.setHours(resetHora, resetMinuto, 0, 0);
    
    // Si ya pasó la hora de reset hoy, calcular para mañana
    if (chileTime >= proximoReset) {
      proximoReset.setDate(proximoReset.getDate() + 1);
    }
    
    const diff = proximoReset.getTime() - chileTime.getTime();
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
  }, [horaReset]);

  // Cargar configuración
  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("codigo_diario_config")
        .select("hora_reset")
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setHoraReset(data.hora_reset.substring(0, 5));
      }
    } catch (error) {
      console.error("Error loading config:", error);
    }
  };

  // Guardar configuración
  const saveConfig = async () => {
    try {
      const { data: existing } = await supabase
        .from("codigo_diario_config")
        .select("id")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("codigo_diario_config")
          .update({ hora_reset: horaReset + ":00", updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("codigo_diario_config")
          .insert({ hora_reset: horaReset + ":00" });
        if (error) throw error;
      }

      toast.success(`Hora de actualización configurada: ${horaReset}`);
      setConfigDialogOpen(false);
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Error al guardar configuración");
    }
  };

  // Cargar código del día
  const loadCodigoDelDia = async () => {
    setIsLoadingCodigo(true);
    try {
      const today = getChileDateString();
      
      const { data, error } = await supabase
        .from("codigos_diarios")
        .select("codigo")
        .eq("fecha", today)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCodigoDelDia(data.codigo);
      } else {
        // No existe código para hoy, generar uno nuevo
        await generarNuevoCodigo();
      }

      // Contar total de códigos generados
      const { count } = await supabase
        .from("codigos_diarios")
        .select("*", { count: 'exact', head: true });
      
      setTotalCodigos(count || 0);
    } catch (error) {
      console.error("Error loading código del día:", error);
      toast.error("Error al cargar código del día");
    } finally {
      setIsLoadingCodigo(false);
    }
  };

  // Generar nuevo código
  const generarNuevoCodigo = async () => {
    setIsGeneratingCodigo(true);
    try {
      const today = getChileDateString();
      
      // Obtener el siguiente índice de secuencia
      const { data: maxData } = await supabase
        .from("codigos_diarios")
        .select("indice_secuencia")
        .order("indice_secuencia", { ascending: false })
        .limit(1)
        .maybeSingle();

      const siguienteIndice = (maxData?.indice_secuencia || 0) + 1;
      const nuevoCodigo = generarCodigoPorIndice(siguienteIndice);
      
      // Intentar insertar o actualizar (upsert)
      const { error } = await supabase
        .from("codigos_diarios")
        .upsert({ 
          fecha: today, 
          codigo: nuevoCodigo,
          indice_secuencia: siguienteIndice
        }, { 
          onConflict: 'fecha' 
        });

      if (error) {
        // Si hay conflicto de código único, intentar con el siguiente
        if (error.code === '23505') {
          toast.error("Código duplicado, reintentando...");
          await generarNuevoCodigo();
          return;
        }
        throw error;
      }

      setCodigoDelDia(nuevoCodigo);
      setTotalCodigos(prev => prev + 1);
      toast.success("Nuevo código generado: " + nuevoCodigo);
    } catch (error) {
      console.error("Error generating código:", error);
      toast.error("Error al generar código");
    } finally {
      setIsGeneratingCodigo(false);
    }
  };

  // Copiar código al portapapeles
  const copiarCodigo = () => {
    if (codigoDelDia) {
      navigator.clipboard.writeText(codigoDelDia);
      toast.success("Código copiado al portapapeles");
    }
  };

  // Verificar si debe regenerarse automáticamente
  const verificarAutoRegen = useCallback(async () => {
    const today = getChileDateString();
    
    // Verificar si ya existe código para hoy
    const { data } = await supabase
      .from("codigos_diarios")
      .select("codigo, created_at")
      .eq("fecha", today)
      .maybeSingle();

    if (!data) {
      // No hay código para hoy, generar uno
      await generarNuevoCodigo();
    }
  }, []);

  // Efecto para cargar datos iniciales
  useEffect(() => {
    loadConfig();
    loadCodigoDelDia();
  }, []);

  // Efecto para el countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(calcularCountdown());
    }, 1000);

    return () => clearInterval(interval);
  }, [calcularCountdown]);

  // Efecto para verificar auto-regeneración cada minuto
  useEffect(() => {
    const checkRegen = setInterval(() => {
      const chileTime = getChileTime();
      const [resetHora, resetMinuto] = horaReset.split(':').map(Number);
      
      // Si es exactamente la hora de reset (con margen de 1 minuto)
      if (chileTime.getHours() === resetHora && chileTime.getMinutes() === resetMinuto) {
        verificarAutoRegen();
      }
    }, 60000);

    return () => clearInterval(checkRegen);
  }, [horaReset, verificarAutoRegen]);

  return (
    <Card className={`border-primary/30 bg-primary/5 ${className}`}>
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Código del Día</p>
              {isLoadingCodigo ? (
                <span className="text-lg font-mono text-muted-foreground">Cargando...</span>
              ) : (
                <span className="text-2xl font-bold font-mono tracking-wider text-primary">
                  {codigoDelDia}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Countdown */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Timer className="h-4 w-4" />
              <div className="text-center">
                <p className="text-xs">Próximo código en</p>
                <p className="font-mono font-semibold text-foreground">{countdown}</p>
              </div>
            </div>

            {/* Info de combinaciones */}
            <div className="hidden md:block text-xs text-muted-foreground text-center border-l pl-4">
              <p>Códigos usados</p>
              <p className="font-semibold text-foreground">
                {totalCodigos.toLocaleString()} / {TOTAL_COMBINACIONES.toLocaleString()}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copiarCodigo}
                disabled={!codigoDelDia || isLoadingCodigo}
                className="gap-1"
              >
                <Copy className="h-4 w-4" />
                Copiar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={generarNuevoCodigo}
                disabled={isGeneratingCodigo || isLoadingCodigo}
                className="gap-1"
              >
                <RefreshCw className={`h-4 w-4 ${isGeneratingCodigo ? 'animate-spin' : ''}`} />
                Regenerar
              </Button>

              {/* Botón de configuración */}
              <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Configurar Código del Día
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="hora-reset">Hora de actualización automática (Chile)</Label>
                      <Input
                        id="hora-reset"
                        type="time"
                        value={horaReset}
                        onChange={(e) => setHoraReset(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        A esta hora se generará automáticamente un nuevo código si no existe uno para el día.
                      </p>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <p className="text-sm font-medium">Información del sistema</p>
                      <div className="text-xs space-y-1 text-muted-foreground">
                        <p>• Formato: 3 letras + 2 números únicos</p>
                        <p>• Total combinaciones: {TOTAL_COMBINACIONES.toLocaleString()}</p>
                        <p>• Códigos usados: {totalCodigos.toLocaleString()}</p>
                        <p>• Cuando se agoten, se reinicia desde el primero</p>
                      </div>
                    </div>

                    <Button onClick={saveConfig} className="w-full">
                      Guardar Configuración
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CodigoDelDia;
