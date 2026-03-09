import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Timer, Heart, Activity, Droplets, Scale, Ruler, Percent, Clock } from "lucide-react";

interface AntropometriaData {
  peso: string;
  talla: string;
  imc: string;
  imc_clasificacion: string;
  pgc: string;
  pgc_clasificacion: string;
  pulso: string;
  pa_sistolica_1: string;
  pa_diastolica_1: string;
  pa_sistolica_2: string;
  pa_diastolica_2: string;
  pa_sistolica_3: string;
  pa_diastolica_3: string;
  pa_alerta: boolean;
  pa_timer_inicio: string | null;
  saturacion_o2: string;
  
  hemoglucotest: string;
  // Framingham fields
  sexo: string;
  edad: string;
  diabetes: string;
  fumador: string;
  colesterol_total: string;
  colesterol_hdl: string;
  framingham_puntos: string;
  framingham_riesgo: string;
  framingham_clasificacion: string;
}

const DEFAULT_DATA: AntropometriaData = {
  peso: "", talla: "", imc: "", imc_clasificacion: "", pgc: "", pgc_clasificacion: "",
  pulso: "", pa_sistolica_1: "", pa_diastolica_1: "", pa_sistolica_2: "", pa_diastolica_2: "",
  pa_sistolica_3: "", pa_diastolica_3: "", pa_alerta: false, pa_timer_inicio: null,
  saturacion_o2: "", hemoglucotest: "",
  sexo: "", edad: "", diabetes: "no", fumador: "no",
  colesterol_total: "", colesterol_hdl: "",
  framingham_puntos: "", framingham_riesgo: "", framingham_clasificacion: "",
};

const parsePA = (value: string) => {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const getRetomaStatus = (source: AntropometriaData): { requiereRetoma: boolean; proximaToma: 2 | 3 | null } => {
  const t1s = parsePA(source.pa_sistolica_1);
  const t1d = parsePA(source.pa_diastolica_1);
  const t2s = parsePA(source.pa_sistolica_2);
  const t2d = parsePA(source.pa_diastolica_2);
  const t3s = parsePA(source.pa_sistolica_3);
  const t3d = parsePA(source.pa_diastolica_3);

  const t1Completa = t1s !== null && t1d !== null;
  const t2Completa = t2s !== null && t2d !== null;
  const t3Completa = t3s !== null && t3d !== null;

  if (t3Completa) {
    return { requiereRetoma: false, proximaToma: null };
  }

  const t1Alta = t1Completa && (t1s > 139 || t1d > 89);
  const t2Alta = t2Completa && (t2s > 139 || t2d > 89);

  if (t2Completa) {
    return { requiereRetoma: t2Alta, proximaToma: t2Alta ? 3 : null };
  }

  if (t1Completa) {
    return { requiereRetoma: t1Alta, proximaToma: t1Alta ? 2 : null };
  }

  return { requiereRetoma: false, proximaToma: null };
};

interface Props {
  value: string | null;
  onChange: (value: string) => void;
  readonly?: boolean;
  fechaNacimiento?: string | null;
}

// IMC classification
function clasificarIMC(imc: number): string {
  if (imc < 18.5) return "Peso insuficiente";
  if (imc < 25) return "Normopeso";
  if (imc < 27) return "Sobrepeso grado I";
  if (imc < 30) return "Sobrepeso grado II";
  if (imc < 35) return "Obesidad tipo I";
  if (imc < 40) return "Obesidad tipo II";
  if (imc < 50) return "Obesidad tipo III (mórbida)";
  return "Obesidad tipo IV (extrema)";
}

// CUN-BAE formula for body fat percentage
function calcularPGC(imc: number, edad: number, sexo: number): number {
  return -44.988 + (0.503 * edad) + (10.689 * sexo) + (3.172 * imc)
    - (0.026 * imc * imc) + (0.181 * imc * sexo)
    - (0.02 * imc * edad) - (0.005 * imc * imc * sexo)
    + (0.00021 * imc * imc * edad);
}

function clasificarPGC(pgc: number, sexo: number): string {
  if (sexo === 0) { // Hombre
    if (pgc < 10) return "Peso insuficiente";
    if (pgc <= 20) return "Normopeso";
    if (pgc <= 25) return "Sobrepeso";
    return "Obesidad";
  } else { // Mujer
    if (pgc < 20) return "Peso insuficiente";
    if (pgc <= 30) return "Normopeso";
    if (pgc <= 35) return "Sobrepeso";
    return "Obesidad";
  }
}

// Framingham Risk Score (Wilson 1998)
function calcularFramingham(
  edad: number, sexo: string, colTotal: number, hdl: number,
  pasSist: number, diabetes: boolean, fumador: boolean
): { puntos: number; riesgo: number; clasificacion: string } {
  const esHombre = sexo === "hombre";

  // Age points
  let puntosEdad = 0;
  if (esHombre) {
    if (edad < 35) puntosEdad = -1;
    else if (edad < 40) puntosEdad = 0;
    else if (edad < 45) puntosEdad = 1;
    else if (edad < 50) puntosEdad = 2;
    else if (edad < 55) puntosEdad = 3;
    else if (edad < 60) puntosEdad = 4;
    else if (edad < 65) puntosEdad = 5;
    else if (edad < 70) puntosEdad = 6;
    else puntosEdad = 7;
  } else {
    if (edad < 35) puntosEdad = -9;
    else if (edad < 40) puntosEdad = -4;
    else if (edad < 45) puntosEdad = 0;
    else if (edad < 50) puntosEdad = 3;
    else if (edad < 55) puntosEdad = 6;
    else if (edad < 60) puntosEdad = 7;
    else puntosEdad = 8;
  }

  // Cholesterol points
  let puntosCol = 0;
  if (esHombre) {
    if (colTotal < 160) puntosCol = -3;
    else if (colTotal < 200) puntosCol = 0;
    else if (colTotal < 240) puntosCol = 1;
    else if (colTotal < 280) puntosCol = 2;
    else puntosCol = 3;
  } else {
    if (colTotal < 160) puntosCol = -2;
    else if (colTotal < 200) puntosCol = 0;
    else if (colTotal < 240) puntosCol = 1;
    else if (colTotal < 280) puntosCol = 1;
    else puntosCol = 3;
  }

  // HDL points
  let puntosHDL = 0;
  if (esHombre) {
    if (hdl < 35) puntosHDL = 2;
    else if (hdl < 45) puntosHDL = 1;
    else if (hdl < 50) puntosHDL = 0;
    else if (hdl < 60) puntosHDL = 0;
    else puntosHDL = -1;
  } else {
    if (hdl < 35) puntosHDL = 5;
    else if (hdl < 45) puntosHDL = 2;
    else if (hdl < 50) puntosHDL = 1;
    else if (hdl < 60) puntosHDL = 0;
    else puntosHDL = -2;
  }

  // Systolic BP points
  let puntosPA = 0;
  if (esHombre) {
    if (pasSist < 120) puntosPA = 0;
    else if (pasSist < 130) puntosPA = 0;
    else if (pasSist < 140) puntosPA = 1;
    else if (pasSist < 160) puntosPA = 2;
    else puntosPA = 3;
  } else {
    if (pasSist < 120) puntosPA = -3;
    else if (pasSist < 130) puntosPA = 0;
    else if (pasSist < 140) puntosPA = 0;
    else if (pasSist < 160) puntosPA = 2;
    else puntosPA = 3;
  }

  // Diabetes
  const puntosDiab = diabetes ? (esHombre ? 2 : 4) : 0;

  // Smoking
  const puntosFuma = fumador ? 2 : 0;

  const totalPuntos = puntosEdad + puntosCol + puntosHDL + puntosPA + puntosDiab + puntosFuma;

  // Risk lookup
  let riesgo = 0;
  if (esHombre) {
    const riesgoHombre: Record<number, number> = {
      [-1]: 2, 0: 3, 1: 4, 2: 4, 3: 6, 4: 7, 5: 9, 6: 11,
      7: 14, 8: 18, 9: 22, 10: 27, 11: 33, 12: 40, 13: 47,
    };
    if (totalPuntos <= -1) riesgo = 2;
    else if (totalPuntos >= 14) riesgo = 56;
    else riesgo = riesgoHombre[totalPuntos] || 0;
  } else {
    const riesgoMujer: Record<number, number> = {
      [-2]: 1, [-1]: 2, 0: 2, 1: 2, 2: 3, 3: 3, 4: 4, 5: 5,
      6: 6, 7: 7, 8: 8, 9: 9, 10: 11, 11: 13, 12: 15,
      13: 17, 14: 20, 15: 24, 16: 27,
    };
    if (totalPuntos <= -2) riesgo = 1;
    else if (totalPuntos >= 17) riesgo = 32;
    else riesgo = riesgoMujer[totalPuntos] || 0;
  }

  let clasificacion = "Bajo";
  if (riesgo >= 20) clasificacion = "Alto";
  else if (riesgo >= 10) clasificacion = "Moderado";

  return { puntos: totalPuntos, riesgo, clasificacion };
}

const AntropometriaForm = ({ value, onChange, readonly = false, fechaNacimiento }: Props) => {
  const [data, setData] = useState<AntropometriaData>(() => {
    if (value) {
      try { return { ...DEFAULT_DATA, ...JSON.parse(value) }; } catch { /* ignore */ }
    }
    return { ...DEFAULT_DATA };
  });

  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Calculate age from fechaNacimiento
  useEffect(() => {
    if (fechaNacimiento && !data.edad) {
      const birth = new Date(fechaNacimiento);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      updateField("edad", String(age));
    }
  }, [fechaNacimiento]);

  // Timer logic
  useEffect(() => {
    if (data.pa_timer_inicio) {
      const inicio = new Date(data.pa_timer_inicio).getTime();
      const duracion = 30 * 60 * 1000; // 30 minutes

      const tick = () => {
        const elapsed = Date.now() - inicio;
        const remaining = Math.max(0, duracion - elapsed);
        setTimerSeconds(Math.ceil(remaining / 1000));
        if (remaining <= 0 && timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      tick();
      timerRef.current = setInterval(tick, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    } else {
      setTimerSeconds(null);
    }
  }, [data.pa_timer_inicio]);

  const getFraminghamResult = (source: AntropometriaData) => {
    const edadF = parseFloat(source.edad);
    const colTotal = parseFloat(source.colesterol_total);
    const hdl = parseFloat(source.colesterol_hdl);
    const pasSist1 = parseFloat(source.pa_sistolica_1);

    if (
      source.sexo &&
      !isNaN(edadF) && edadF >= 30 && edadF <= 74 &&
      !isNaN(colTotal) &&
      !isNaN(hdl) &&
      !isNaN(pasSist1)
    ) {
      return calcularFramingham(
        edadF,
        source.sexo,
        colTotal,
        hdl,
        pasSist1,
        source.diabetes === "si",
        source.fumador === "si"
      );
    }

    return null;
  };

  const updateField = useCallback((field: keyof AntropometriaData, val: string | boolean | null) => {
    setData(prev => {
      const updated = { ...prev, [field]: val };

      // Auto-calculate IMC
      const peso = parseFloat(field === "peso" ? val as string : updated.peso);
      const tallaCm = parseFloat(field === "talla" ? val as string : updated.talla);
      if (!isNaN(peso) && !isNaN(tallaCm) && tallaCm > 0) {
        const tallaM = tallaCm / 100;
        const imc = peso / (tallaM * tallaM);
        updated.imc = imc.toFixed(1);
        updated.imc_clasificacion = clasificarIMC(imc);

        // CUN-BAE PGC
        const edad = parseFloat(field === "edad" ? val as string : updated.edad);
        const sexoNum = (field === "sexo" ? val : updated.sexo) === "mujer" ? 1 : 0;
        if (!isNaN(edad) && edad > 0 && updated.sexo) {
          const pgc = calcularPGC(imc, edad, sexoNum);
          updated.pgc = pgc.toFixed(1);
          updated.pgc_clasificacion = clasificarPGC(pgc, sexoNum);
        }
      }

      // Recalculate PGC when age or sex changes
      if ((field === "edad" || field === "sexo") && updated.imc) {
        const imc = parseFloat(updated.imc);
        const edad = parseFloat(field === "edad" ? val as string : updated.edad);
        const sexoNum = (field === "sexo" ? val : updated.sexo) === "mujer" ? 1 : 0;
        if (!isNaN(imc) && !isNaN(edad) && edad > 0 && updated.sexo) {
          const pgc = calcularPGC(imc, edad, sexoNum);
          updated.pgc = pgc.toFixed(1);
          updated.pgc_clasificacion = clasificarPGC(pgc, sexoNum);
        }
      }

      // Blood pressure alert check
      const checkBP = (sField: string, dField: string) => {
        const s = parseFloat(updated[sField as keyof AntropometriaData] as string);
        const d = parseFloat(updated[dField as keyof AntropometriaData] as string);
        return !isNaN(s) && !isNaN(d) && (s > 139 || d > 89);
      };

      const bpHigh = checkBP("pa_sistolica_1", "pa_diastolica_1") ||
                      checkBP("pa_sistolica_2", "pa_diastolica_2") ||
                      checkBP("pa_sistolica_3", "pa_diastolica_3");
      updated.pa_alerta = bpHigh;

      // Auto-start timer on first high BP reading
      if (field.startsWith("pa_") && bpHigh && !updated.pa_timer_inicio) {
        updated.pa_timer_inicio = new Date().toISOString();
      }

      // Framingham calculation
      const framingham = getFraminghamResult(updated);
      if (framingham) {
        updated.framingham_puntos = String(framingham.puntos);
        updated.framingham_riesgo = String(framingham.riesgo);
        updated.framingham_clasificacion = framingham.clasificacion;
      } else {
        updated.framingham_puntos = "";
        updated.framingham_riesgo = "";
        updated.framingham_clasificacion = "";
      }

      return updated;
    });
  }, []);

  useEffect(() => {
    setData((prev) => {
      const framingham = getFraminghamResult(prev);
      if (!framingham) return prev;

      const next = {
        ...prev,
        framingham_puntos: String(framingham.puntos),
        framingham_riesgo: String(framingham.riesgo),
        framingham_clasificacion: framingham.clasificacion,
      };

      if (
        next.framingham_puntos === prev.framingham_puntos &&
        next.framingham_riesgo === prev.framingham_riesgo &&
        next.framingham_clasificacion === prev.framingham_clasificacion
      ) {
        return prev;
      }

      return next;
    });
  }, []);

  // Emit changes
  useEffect(() => {
    onChange(JSON.stringify(data));
  }, [data]);

  const formatTimer = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const imcColor = (imc: string) => {
    const v = parseFloat(imc);
    if (isNaN(v)) return "";
    if (v < 18.5) return "text-blue-600";
    if (v < 25) return "text-green-600";
    if (v < 30) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-4">
      {/* BP Alert Banner */}
      {data.pa_alerta && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-destructive">
              ⚠️ Presión arterial elevada (&gt;139/89 mmHg)
            </p>
            <p className="text-xs text-destructive/80">
              Se requiere nueva toma de presión arterial. Indicar al paciente que debe esperar.
            </p>
          </div>
          {timerSeconds !== null && timerSeconds > 0 && (
            <div className="flex items-center gap-2 bg-destructive/20 px-3 py-2 rounded-md">
              <Timer className="h-4 w-4 text-destructive" />
              <span className="text-lg font-mono font-bold text-destructive">
                {formatTimer(timerSeconds)}
              </span>
            </div>
          )}
          {timerSeconds === 0 && (
            <Badge variant="destructive" className="gap-1 animate-pulse">
              <Clock className="h-3 w-3" />
              ¡Tomar presión ahora!
            </Badge>
          )}
        </div>
      )}

      {/* Medidas Básicas */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Scale className="h-4 w-4" /> Medidas Antropométricas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Peso (kg) *</Label>
              <Input type="number" step="0.1" value={data.peso} disabled={readonly}
                onChange={(e) => updateField("peso", e.target.value)} placeholder="70.0" />
            </div>
            <div>
              <Label className="text-xs">Talla (cm) *</Label>
              <Input type="number" step="0.1" value={data.talla} disabled={readonly}
                onChange={(e) => updateField("talla", e.target.value)} placeholder="170" />
            </div>
            <div>
              <Label className="text-xs">IMC (auto)</Label>
              <div className={`h-10 flex items-center px-3 rounded-md border bg-muted text-sm font-semibold ${imcColor(data.imc)}`}>
                {data.imc ? `${data.imc} - ${data.imc_clasificacion}` : "—"}
              </div>
            </div>
            <div>
              <Label className="text-xs">% Grasa (CUN-BAE)</Label>
              <div className="h-10 flex items-center px-3 rounded-md border bg-muted text-sm font-semibold">
                {data.pgc ? `${data.pgc}% - ${data.pgc_clasificacion}` : "—"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Sexo *</Label>
              <Select value={data.sexo} onValueChange={(v) => updateField("sexo", v)} disabled={readonly}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hombre">Hombre</SelectItem>
                  <SelectItem value="mujer">Mujer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Edad</Label>
              <Input type="number" value={data.edad} disabled={readonly}
                onChange={(e) => updateField("edad", e.target.value)} placeholder="30" />
            </div>
            <div>
              <Label className="text-xs">Hemoglucotest (mg/dL)</Label>
              <Input type="number" value={data.hemoglucotest} disabled={readonly}
                onChange={(e) => updateField("hemoglucotest", e.target.value)} placeholder="mg/dL" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signos Vitales */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Heart className="h-4 w-4" /> Signos Vitales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Pulso (lpm)</Label>
              <Input type="number" value={data.pulso} disabled={readonly}
                onChange={(e) => updateField("pulso", e.target.value)} placeholder="72" />
            </div>
            <div>
              <Label className="text-xs">Saturación O₂ (%)</Label>
              <Input type="number" value={data.saturacion_o2} disabled={readonly}
                onChange={(e) => updateField("saturacion_o2", e.target.value)} placeholder="98" />
            </div>
          </div>

          {/* Blood Pressure - 3 readings */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1">
              <Activity className="h-3 w-3" /> Presión Arterial (mmHg)
              {data.pa_alerta && <Badge variant="destructive" className="text-[10px] ml-2">ELEVADA</Badge>}
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[1, 2, 3].map((toma) => {
                const sKey = `pa_sistolica_${toma}` as keyof AntropometriaData;
                const dKey = `pa_diastolica_${toma}` as keyof AntropometriaData;
                const s = parseFloat(data[sKey] as string);
                const d = parseFloat(data[dKey] as string);
                const isHigh = !isNaN(s) && !isNaN(d) && (s > 139 || d > 89);
                return (
                  <div key={toma} className={`p-2 rounded-md border ${isHigh ? "border-destructive bg-destructive/5" : "border-border"}`}>
                    <p className="text-xs font-medium mb-1 text-muted-foreground">
                      Toma {toma} {toma > 1 && !data[sKey] && "(opcional)"}
                    </p>
                    <div className="flex items-center gap-1">
                      <Input type="number" value={data[sKey] as string} disabled={readonly}
                        onChange={(e) => updateField(sKey, e.target.value)}
                        placeholder="Sist" className="text-center" />
                      <span className="text-muted-foreground font-bold">/</span>
                      <Input type="number" value={data[dKey] as string} disabled={readonly}
                        onChange={(e) => updateField(dKey, e.target.value)}
                        placeholder="Diast" className="text-center" />
                    </div>
                    {isHigh && (
                      <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> &gt;139/89
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Framingham */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Droplets className="h-4 w-4" /> Índice de Framingham (Riesgo Cardiovascular a 10 años)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Colesterol Total (mg/dL)</Label>
              <Input type="number" value={data.colesterol_total} disabled={readonly}
                onChange={(e) => updateField("colesterol_total", e.target.value)} placeholder="200" />
            </div>
            <div>
              <Label className="text-xs">Colesterol HDL (mg/dL)</Label>
              <Input type="number" value={data.colesterol_hdl} disabled={readonly}
                onChange={(e) => updateField("colesterol_hdl", e.target.value)} placeholder="50" />
            </div>
            <div>
              <Label className="text-xs">Diabetes</Label>
              <Select value={data.diabetes} onValueChange={(v) => updateField("diabetes", v)} disabled={readonly}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="si">Sí</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Fumador</Label>
              <Select value={data.fumador} onValueChange={(v) => updateField("fumador", v)} disabled={readonly}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="si">Sí</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Framingham result */}
          {(
            <div className={`p-3 rounded-lg border-2 ${
              data.framingham_clasificacion === "Alto" ? "border-destructive bg-destructive/5" :
              data.framingham_clasificacion === "Moderado" ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" :
              "border-border bg-muted/30"
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Riesgo cardiovascular a 10 años</p>
                  <p className="text-2xl font-bold">
                    {data.framingham_riesgo !== "" ? `${data.framingham_riesgo}%` : "—"}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={
                    data.framingham_clasificacion === "Alto" ? "destructive" :
                    data.framingham_clasificacion === "Moderado" ? "secondary" : "default"
                  } className="text-sm">
                    {data.framingham_clasificacion ? `Riesgo ${data.framingham_clasificacion}` : "Sin cálculo"}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    Puntos: {data.framingham_puntos || "—"}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Basado en: Wilson et al. Framingham Heart Study. Circulation 1998;97:1837-1847
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AntropometriaForm;
