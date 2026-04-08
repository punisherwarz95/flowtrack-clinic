import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Shield, AlertTriangle, FileText } from "lucide-react";
import { format } from "date-fns";

// v2 - Shows battery name and exam results

const VerificarInforme = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [examResults, setExamResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) verificar();
  }, [token]);

  const verificar = async () => {
    try {
      const { data: verificacion, error: vErr } = await supabase
        .from("informe_verificacion")
        .select(`
          id,
          created_at,
          evaluacion_id,
          evaluacion:evaluaciones_clinicas(
            id,
            resultado,
            observaciones,
            restricciones,
            numero_informe,
            evaluado_at,
            paquete_id,
            paquete:paquetes_examenes(id, nombre),
            atencion:atenciones(
              id,
              fecha_ingreso,
              paciente:pacientes(
                nombre,
                rut,
                cargo,
                empresa:empresas(nombre, rut)
              )
            )
          )
        `)
        .eq("token_verificacion", token)
        .single();

      if (vErr) throw new Error("Documento no encontrado");
      setData(verificacion);

      // Fetch exam results for this battery
      const ev = verificacion?.evaluacion as any;
      if (ev?.paquete_id && ev?.atencion?.id) {
        // Get exams that belong to this paquete
        const { data: paqueteItems } = await supabase
          .from("paquete_examen_items")
          .select("examen_id")
          .eq("paquete_id", ev.paquete_id);

        const examenIds = (paqueteItems || []).map((p: any) => p.examen_id);

        if (examenIds.length > 0) {
          const { data: atencionExamenes } = await supabase
            .from("atencion_examenes")
            .select(`
              id,
              estado,
              examen:examenes(nombre),
              resultados:examen_resultados(
                valor,
                campo:examen_formulario_campos(etiqueta, grupo, orden, tipo_campo)
              )
            `)
            .eq("atencion_id", ev.atencion.id)
            .in("examen_id", examenIds);

          setExamResults(atencionExamenes || []);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-16 w-16 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">Documento No Encontrado</h2>
            <p className="text-muted-foreground">
              El código de verificación no corresponde a ningún informe registrado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ev = data.evaluacion;
  const atencion = ev?.atencion;
  const paciente = atencion?.paciente;
  const empresa = paciente?.empresa;

  const esApto = ev?.resultado === "apto" || ev?.resultado === "apto_con_restricciones";

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-green-500 border-2">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-10 w-10 text-green-600" />
              <div>
                <h2 className="text-xl font-bold text-green-700">Documento Verificado</h2>
                <p className="text-sm text-muted-foreground">
                  Este informe es auténtico y fue emitido por el centro médico.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informe N° {ev?.numero_informe}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Paciente</p>
                <p className="font-medium">{paciente?.nombre}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">RUT</p>
                <p className="font-mono">{paciente?.rut}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Empresa</p>
                <p>{empresa?.nombre || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cargo</p>
                <p>{paciente?.cargo || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Batería Evaluada</p>
                <p className="font-semibold text-primary">{ev?.paquete?.nombre || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha Evaluación</p>
                <p>{ev?.evaluado_at ? format(new Date(ev.evaluado_at), "dd/MM/yyyy") : "-"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-4 rounded-lg bg-muted">
              <span className="font-medium">Resultado:</span>
              {esApto ? (
                <Badge className="bg-green-600 text-white text-lg px-4 py-1">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  APTO
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-lg px-4 py-1">
                  <XCircle className="h-4 w-4 mr-2" />
                  NO APTO
                </Badge>
              )}
            </div>

            {ev?.observaciones && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm font-medium">Observaciones:</p>
                <p className="text-sm">{ev.observaciones}</p>
              </div>
            )}

            {ev?.restricciones && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm font-medium text-amber-800">Restricciones:</p>
                <p className="text-sm text-amber-700">{ev.restricciones}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Exam Results */}
        {examResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5" />
                Exámenes Realizados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {examResults.map((ae: any) => {
                const campos = (ae.resultados || [])
                  .filter((r: any) => r.campo && r.valor && r.campo.tipo_campo !== "audiometria" && r.campo.tipo_campo !== "antropometria")
                  .sort((a: any, b: any) => (a.campo?.orden || 0) - (b.campo?.orden || 0));

                return (
                  <div key={ae.id} className="border rounded-lg overflow-hidden">
                    <div className="bg-primary/10 px-4 py-2 flex items-center justify-between">
                      <span className="font-medium text-sm">{ae.examen?.nombre}</span>
                      <Badge variant={ae.estado === "completado" || ae.estado === "muestra_tomada" ? "default" : "secondary"} className="text-xs">
                        {ae.estado === "completado" ? "✓ Completado" : ae.estado === "muestra_tomada" ? "Muestra tomada" : "Pendiente"}
                      </Badge>
                    </div>
                    {campos.length > 0 && (
                      <div className="px-4 py-2 space-y-1">
                        {campos.map((r: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-sm py-0.5 border-b last:border-0 border-dashed">
                            <span className="text-muted-foreground">{r.campo.etiqueta}</span>
                            <span className="font-medium">{r.valor}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default VerificarInforme;
