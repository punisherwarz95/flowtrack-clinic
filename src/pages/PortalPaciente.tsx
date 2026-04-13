import { useState, useEffect, useCallback, useRef } from "react";
import portalBackground from "@/assets/portal-background.jpeg";

// Portal Paciente v0.1.0 - Sin toasts, sin sonidos, sin vibraciones, sin popups
// Banner sticky superior muestra estado de atención en todo momento
const PORTAL_VERSION = "0.1.0";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, CheckCircle2, Clock, Building2, FileText, AlertCircle, RefreshCw, ChevronDown, CalendarIcon, ClipboardList, MapPin } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format, parse, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn, formatRutStandard, normalizeRut as normalizeRutUtil } from "@/lib/utils";
import { useAtencionDocumentos } from "@/hooks/useAtencionDocumentos";
import { DocumentoFormViewer, DocumentoStatusCard, DocumentoContextData } from "@/components/DocumentoFormViewer";
import PortalCuestionarios from "@/components/PortalCuestionarios";
import { t, PortalLang } from "@/lib/portalTranslations";
import { Globe } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Paciente {
  id: string;
  nombre: string;
  rut: string | null;
  fecha_nacimiento: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  tipo_servicio?: string | null;
}

interface Empresa {
  id: string;
  nombre: string;
}

interface Examen {
  id: string;
  nombre: string;
}

interface AtencionExamen {
  id: string;
  examen_id: string;
  estado: string;
  examenes: Examen;
}

interface Box {
  id: string;
  nombre: string;
  box_examenes: Array<{ examen_id: string }>;
}

interface Atencion {
  id: string;
  estado: string;
  box_id: string | null;
  numero_ingreso: number | null;
  fecha_ingreso: string;
  atencion_examenes: AtencionExamen[];
  boxes?: { nombre: string } | null;
}

interface ExamenTest {
  id: string;
  nombre: string;
  url: string;
  examen_id: string;
}

interface TestTracking {
  examen_test_id: string;
  abierto_at: string;
  completado: boolean;
}

// Inline message component - replaces all toasts
interface InlineMsg {
  text: string;
  type: "error" | "success" | "info";
}

export default function PortalPaciente() {
  const [step, setStep] = useState<"codigo" | "identificacion" | "registro" | "portal">("codigo");
  const [rut, setRut] = useState("");
  const [codigoIngresado, setCodigoIngresado] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [atencion, setAtencion] = useState<Atencion | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [pendingBoxes, setPendingBoxes] = useState<string[]>([]);
  const [examenTests, setExamenTests] = useState<ExamenTest[]>([]);
  const [testTracking, setTestTracking] = useState<TestTracking[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [agendaDiferidaMatch, setAgendaDiferidaMatch] = useState<any>(null);
  const [lang, setLang] = useState<PortalLang>("es");
  const [isExtranjero, setIsExtranjero] = useState(false);
  
  // Inline message state (replaces toasts)
  const [inlineMsg, setInlineMsg] = useState<InlineMsg | null>(null);
  const inlineMsgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMsg = useCallback((text: string, type: InlineMsg["type"] = "info", duration = 5000) => {
    if (inlineMsgTimerRef.current) clearTimeout(inlineMsgTimerRef.current);
    setInlineMsg({ text, type });
    if (duration > 0) {
      inlineMsgTimerRef.current = setTimeout(() => setInlineMsg(null), duration);
    }
  }, []);

  // Documentos del paciente - expand inline
  const [selectedDocumentoIndex, setSelectedDocumentoIndex] = useState<number | null>(null);
  
  // Hook para documentos de la atención
  const { 
    documentos: atencionDocumentos, 
    campos: documentoCampos, 
    reload: reloadDocumentos,
    pendingCount: documentosPendientes,
    totalCount: documentosTotal
  } = useAtencionDocumentos(atencion?.id || null);
  
  // Polling para documentos (cada 5 segundos) para detectar nuevos documentos agregados por staff
  useEffect(() => {
    if (!atencion?.id || step !== "portal") return;
    const interval = setInterval(() => {
      reloadDocumentos();
    }, 5000);
    return () => clearInterval(interval);
  }, [atencion?.id, step, reloadDocumentos]);

  // Lista de ciudades de Chile para validación
  const ciudadesChile = [
    "Arica", "Iquique", "Alto Hospicio", "Antofagasta", "Calama", "Tocopilla",
    "Copiapó", "Vallenar", "La Serena", "Coquimbo", "Ovalle", "Illapel",
    "Valparaíso", "Viña del Mar", "Quilpué", "Villa Alemana", "Quillota", "San Antonio", "Los Andes", "San Felipe",
    "Santiago", "Puente Alto", "Maipú", "La Florida", "Las Condes", "Peñalolén", "San Bernardo", "Providencia", "Ñuñoa", "Lo Barnechea", "Vitacura", "La Reina", "Macul", "El Bosque", "La Pintana", "San Ramón", "La Granja", "Recoleta", "Independencia", "Conchalí", "Huechuraba", "Renca", "Cerro Navia", "Lo Prado", "Pudahuel", "Quinta Normal", "Estación Central", "Cerrillos", "Pedro Aguirre Cerda", "Lo Espejo", "San Miguel", "La Cisterna", "San Joaquín", "Colina", "Lampa", "Buin", "Paine", "Melipilla", "Talagante", "Peñaflor",
    "Rancagua", "San Fernando", "Rengo", "Machalí",
    "Talca", "Curicó", "Linares", "Constitución",
    "Chillán", "Chillán Viejo", "Los Ángeles", "Concepción", "Talcahuano", "Hualpén", "Coronel", "San Pedro de la Paz", "Tomé", "Penco", "Lota",
    "Temuco", "Padre Las Casas", "Villarrica", "Pucón", "Angol",
    "Valdivia", "Osorno", "La Unión",
    "Puerto Montt", "Puerto Varas", "Castro", "Ancud", "Quellón",
    "Coyhaique", "Puerto Aysén",
    "Punta Arenas", "Puerto Natales"
  ];

  // Form fields for new registration
  const [formData, setFormData] = useState({
    primerNombre: "",
    apellidoPaterno: "",
    apellidoMaterno: "",
    rut: "",
    fecha_nacimiento: "",
    fecha_nacimiento_display: "",
    email: "",
    telefono: "",
    calle: "",
    numeracion: "",
    ciudad: ""
  });

  // Estado para sugerencias de ciudades
  const [ciudadSugerencias, setCiudadSugerencias] = useState<string[]>([]);
  const [showCiudadSugerencias, setShowCiudadSugerencias] = useState(false);

  const prevEstadoRef = useRef<string | null>(null);
  const prevBoxIdRef = useRef<string | null>(null);
  const prevDataHashRef = useRef<string>("");
  const prevBoxesHashRef = useRef<string>("");

  // Usar formatRutStandard de utils para display
  const formatRutForDisplay = (value: string) => {
    return formatRutStandard(value);
  };

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isExtranjero) {
      setRut(e.target.value.toUpperCase());
    } else {
      const formatted = formatRutForDisplay(e.target.value);
      setRut(formatted);
    }
  };

  const handleFormRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isExtranjero) {
      setFormData(prev => ({ ...prev, rut: e.target.value.toUpperCase() }));
    } else {
      const formatted = formatRutForDisplay(e.target.value);
      setFormData(prev => ({ ...prev, rut: formatted }));
    }
  };

  const validarCodigoDiario = async () => {
    if (!codigoIngresado.trim()) {
      showMsg(t("ingreseCodigo", lang), "error");
      return;
    }

    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("codigos_diarios")
        .select("codigo")
        .eq("fecha", today)
        .eq("codigo", codigoIngresado.toUpperCase().trim())
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setInlineMsg(null);
        setStep("identificacion");
      } else {
        showMsg(t("codigoIncorrecto", lang), "error", 8000);
      }
    } catch (error) {
      console.error("Error validating código:", error);
      showMsg(t("errorValidarCodigo", lang), "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper para vincular agenda diferida
  const vincularAgendaDiferida = async (agendaDiferida: any, atencionId: string) => {
    try {
      const { error: updateError } = await supabase.from("agenda_diferida").update({
        estado: "vinculado",
        atencion_id: atencionId,
        vinculado_at: new Date().toISOString()
      }).eq("id", agendaDiferida.id);

      if (updateError) {
        console.error("[Portal] Error actualizando agenda diferida:", updateError);
      }

      if (agendaDiferida.paquetes_ids?.length > 0) {
        const baterias = agendaDiferida.paquetes_ids.map((pId: string) => ({
          atencion_id: atencionId,
          paquete_id: pId
        }));
        await supabase.from("atencion_baterias").insert(baterias);
      }

      const allExamenIds = new Set<string>(agendaDiferida.examenes_ids || []);

      if (agendaDiferida.paquetes_ids?.length > 0) {
        const { data: paqueteItems } = await supabase
          .from("paquete_examen_items")
          .select("examen_id")
          .in("paquete_id", agendaDiferida.paquetes_ids);

        if (paqueteItems) {
          paqueteItems.forEach((item: any) => allExamenIds.add(item.examen_id));
        }
      }

      if (allExamenIds.size > 0) {
        const examenes = Array.from(allExamenIds).map((eId: string) => ({
          atencion_id: atencionId,
          examen_id: eId,
          estado: "pendiente" as const
        }));
        await supabase.from("atencion_examenes").insert(examenes);
      }

      if (agendaDiferida.paquetes_ids?.length > 0) {
        const { data: bateriaDocumentos } = await supabase
          .from("bateria_documentos")
          .select("documento_id")
          .in("paquete_id", agendaDiferida.paquetes_ids);

        if (bateriaDocumentos && bateriaDocumentos.length > 0) {
          const uniqueDocIds = [...new Set(bateriaDocumentos.map((bd: any) => bd.documento_id))];
          const documentos = uniqueDocIds.map((docId: string) => ({
            atencion_id: atencionId,
            documento_id: docId,
            estado: "pendiente",
            respuestas: {}
          }));
          await supabase.from("atencion_documentos").insert(documentos);
        }
      }

      console.log("[Portal] Agenda diferida vinculada:", agendaDiferida.id, "- Exámenes:", allExamenIds.size);
    } catch (err) {
      console.error("[Portal] Error vinculando agenda diferida:", err);
    }
  };

  const buscarPaciente = async () => {
    if (!rut.trim()) {
      showMsg(isExtranjero ? t("ingresePasaporte", lang) : t("ingreseRut", lang), "error");
      return;
    }

    setIsLoading(true);
    try {
      const rutFormateado = isExtranjero ? rut.trim().toUpperCase() : formatRutStandard(rut);

      const { data: agendaDiferidaData } = await supabase
        .from("agenda_diferida")
        .select("*, empresas(id, nombre), faenas(id, nombre)")
        .eq("rut", rutFormateado)
        .eq("estado", "pendiente")
        .order("created_at", { ascending: false })
        .limit(1);

      const agendaDiferida = agendaDiferidaData?.[0] || null;
      if (agendaDiferida) {
        console.log("[Portal] Agenda diferida encontrada:", agendaDiferida.id);
        setAgendaDiferidaMatch(agendaDiferida);
      }

      const { data: pacientesData, error: pacienteError } = await supabase
        .from("pacientes")
        .select("*")
        .eq("rut", rutFormateado)
        .order("created_at", { ascending: false });

      if (pacienteError) throw pacienteError;
      
      let pacienteData: typeof pacientesData[0] | null = null;
      if (pacientesData && pacientesData.length > 1) {
        const pacienteIds = pacientesData.map(p => p.id);
        const { data: atencionesRecientes } = await supabase
          .from("atenciones")
          .select("paciente_id, fecha_ingreso")
          .in("paciente_id", pacienteIds)
          .order("fecha_ingreso", { ascending: false })
          .limit(1);
        
        if (atencionesRecientes && atencionesRecientes.length > 0) {
          pacienteData = pacientesData.find(p => p.id === atencionesRecientes[0].paciente_id) || pacientesData[0];
        } else {
          pacienteData = pacientesData[0];
        }
      } else {
        pacienteData = pacientesData && pacientesData.length > 0 ? pacientesData[0] : null;
      }

      const today = new Date();
      const startOfDayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
      const endOfDayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      const startOfDay = startOfDayDate.toISOString();
      const endOfDay = endOfDayDate.toISOString();

      if (pacienteData) {
        setPaciente(pacienteData);
        
        if (pacienteData.nombre === "PENDIENTE DE REGISTRO") {
          const { data: existingAtencion } = await supabase
            .from("atenciones")
            .select("*, boxes(*)")
            .eq("paciente_id", pacienteData.id)
            .gte("fecha_ingreso", startOfDay)
            .lte("fecha_ingreso", endOfDay)
            .order("fecha_ingreso", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingAtencion) {
            setAtencion({ ...existingAtencion, atencion_examenes: [] });
            showMsg(`${t("suNumeroAtencion", lang)} #${existingAtencion.numero_ingreso}. ${t("completeDatos", lang)}`, "info", 0);
          }

          setFormData(prev => ({ ...prev, rut: rut }));
          setStep("registro");
          return;
        }
        
        const { data: existingAtencion } = await supabase
          .from("atenciones")
          .select("*, pacientes(id, nombre, rut, tipo_servicio), boxes(*)")
          .eq("paciente_id", pacienteData.id)
          .gte("fecha_ingreso", startOfDay)
          .lte("fecha_ingreso", endOfDay)
          .order("fecha_ingreso", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingAtencion) {
          const { data: examenesData } = await supabase
            .from("atencion_examenes")
            .select("id, examen_id, estado, examenes(id, nombre)")
            .eq("atencion_id", existingAtencion.id);

          const atencionCompleta: Atencion = {
            id: existingAtencion.id,
            estado: existingAtencion.estado,
            box_id: existingAtencion.box_id,
            numero_ingreso: existingAtencion.numero_ingreso,
            fecha_ingreso: existingAtencion.fecha_ingreso,
            boxes: existingAtencion.boxes,
            atencion_examenes: (examenesData || []).map((ae: any) => ({
              id: ae.id,
              examen_id: ae.examen_id,
              estado: ae.estado,
              examenes: ae.examenes
            }))
          };

          setAtencion(atencionCompleta);
          prevEstadoRef.current = existingAtencion.estado;
          prevBoxIdRef.current = existingAtencion.box_id;
          setInlineMsg(null);
        } else {
          console.log("[Portal] No se encontró atención existente, creando nueva para paciente:", pacienteData.id);
          
          const empresaIdForAtencion = agendaDiferida?.empresa_id || pacienteData.empresa_id || null;
          const insertData: any = {
            paciente_id: pacienteData.id,
            estado: "en_espera",
            fecha_ingreso: new Date().toISOString(),
            empresa_id: empresaIdForAtencion
          };

          if (agendaDiferida) {
            if (agendaDiferida.empresa_id) {
              await supabase.from("pacientes").update({
                empresa_id: agendaDiferida.empresa_id,
                faena_id: agendaDiferida.faena_id,
                cargo: agendaDiferida.cargo || pacienteData.cargo,
                tipo_servicio: agendaDiferida.tipo_servicio || pacienteData.tipo_servicio,
              }).eq("id", pacienteData.id);
            }
          }

          const { data: newAtencion, error: atencionError } = await supabase
            .from("atenciones")
            .insert(insertData)
            .select("*, boxes(*)")
            .single();

          if (atencionError) throw atencionError;

          if (agendaDiferida) {
            await vincularAgendaDiferida(agendaDiferida, newAtencion.id);
          }

          setAtencion({
            ...newAtencion,
            atencion_examenes: []
          });
          prevEstadoRef.current = "en_espera";
          prevBoxIdRef.current = null;
          
          const sourceData = agendaDiferida || pacienteData;
          const nombreParts = (sourceData.nombre || pacienteData.nombre)?.split(" ") || [];
          const direccionSource = agendaDiferida?.direccion || pacienteData.direccion;
          const direccionParts = direccionSource?.split(", ") || [];
          
          setFormData({
            primerNombre: nombreParts[0] || "",
            apellidoPaterno: nombreParts[1] || "",
            apellidoMaterno: nombreParts.slice(2).join(" ") || "",
            rut: pacienteData.rut || rut,
            fecha_nacimiento: agendaDiferida?.fecha_nacimiento || pacienteData.fecha_nacimiento || "",
            fecha_nacimiento_display: (agendaDiferida?.fecha_nacimiento || pacienteData.fecha_nacimiento)
              ? format(new Date((agendaDiferida?.fecha_nacimiento || pacienteData.fecha_nacimiento) + "T12:00:00"), "dd/MM/yyyy")
              : "",
            email: agendaDiferida?.email || pacienteData.email || "",
            telefono: agendaDiferida?.telefono || pacienteData.telefono || "",
            calle: direccionParts[0] || "",
            numeracion: direccionParts[1] || "",
            ciudad: direccionParts[2] || direccionParts[0] || ""
          });
          
          showMsg(`${t("suNumeroAtencion", lang)} #${newAtencion.numero_ingreso}. ${t("verifiqueDatos", lang)}`, "info", 0);
          
          setStep("registro");
          return;
        }
        
        setStep("portal");
      } else {
        const { data: newPaciente, error: createError } = await supabase
          .from("pacientes")
          .insert({
            nombre: agendaDiferida?.nombre || "PENDIENTE DE REGISTRO",
            rut: rutFormateado,
            fecha_nacimiento: agendaDiferida?.fecha_nacimiento || null,
            email: agendaDiferida?.email || null,
            telefono: agendaDiferida?.telefono || null,
            direccion: agendaDiferida?.direccion || null,
            empresa_id: agendaDiferida?.empresa_id || null,
            faena_id: agendaDiferida?.faena_id || null,
            cargo: agendaDiferida?.cargo || null,
            tipo_servicio: agendaDiferida?.tipo_servicio || null
          })
          .select()
          .single();

        if (createError) throw createError;

        const { data: newAtencion, error: atencionError } = await supabase
          .from("atenciones")
          .insert({
            paciente_id: newPaciente.id,
            estado: "en_espera",
            fecha_ingreso: new Date().toISOString()
          })
          .select()
          .single();

        if (atencionError) throw atencionError;

        if (agendaDiferida) {
          await vincularAgendaDiferida(agendaDiferida, newAtencion.id);
        }

        if (agendaDiferida && agendaDiferida.nombre !== "PENDIENTE DE REGISTRO") {
          const nombreParts = agendaDiferida.nombre?.split(" ") || [];
          const direccionParts = agendaDiferida.direccion?.split(", ") || [];
          setFormData({
            primerNombre: nombreParts[0] || "",
            apellidoPaterno: nombreParts[1] || "",
            apellidoMaterno: nombreParts.slice(2).join(" ") || "",
            rut: rut,
            fecha_nacimiento: agendaDiferida.fecha_nacimiento || "",
            fecha_nacimiento_display: agendaDiferida.fecha_nacimiento
              ? format(new Date(agendaDiferida.fecha_nacimiento + "T12:00:00"), "dd/MM/yyyy")
              : "",
            email: agendaDiferida.email || "",
            telefono: agendaDiferida.telefono || "",
            calle: direccionParts[0] || "",
            numeracion: direccionParts[1] || "",
            ciudad: direccionParts[2] || ""
          });
        } else {
          setFormData(prev => ({ ...prev, rut: rut }));
        }

        showMsg(`${t("suNumeroAtencion", lang)} #${newAtencion.numero_ingreso}. ${t("completeDatos", lang)}`, "info", 0);

        setPaciente(newPaciente);
        setAtencion({ ...newAtencion, atencion_examenes: [], boxes: null });
        setStep("registro");
      }
    } catch (error: any) {
      console.error("Error buscando paciente:", error);
      showMsg(t("errorBuscarPaciente", lang), "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Validar email
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidNombreCompleto = () => {
    return formData.primerNombre.trim().length > 0 && 
           formData.apellidoPaterno.trim().length > 0 && 
           formData.apellidoMaterno.trim().length > 0;
  };

  const getNombreCompleto = () => {
    return `${formData.primerNombre.trim()} ${formData.apellidoPaterno.trim()} ${formData.apellidoMaterno.trim()}`.trim();
  };

  const isValidCiudad = (ciudad: string) => {
    return ciudadesChile.some(c => c.toLowerCase() === ciudad.toLowerCase().trim());
  };

  const getDireccionCompleta = () => {
    return `${formData.calle.trim()} ${formData.numeracion.trim()} ${formData.ciudad.trim()}`.trim();
  };

  const handleNombreFieldChange = (field: 'primerNombre' | 'apellidoPaterno' | 'apellidoMaterno') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s/g, '').toUpperCase();
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCalleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setFormData(prev => ({ ...prev, calle: value }));
  };

  const handleCiudadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, ciudad: value }));
    
    if (value.length >= 2) {
      const filtradas = ciudadesChile.filter(c => 
        c.toLowerCase().startsWith(value.toLowerCase())
      ).slice(0, 5);
      setCiudadSugerencias(filtradas);
      setShowCiudadSugerencias(filtradas.length > 0);
    } else {
      setCiudadSugerencias([]);
      setShowCiudadSugerencias(false);
    }
  };

  const seleccionarCiudad = (ciudad: string) => {
    setFormData(prev => ({ ...prev, ciudad }));
    setShowCiudadSugerencias(false);
    setCiudadSugerencias([]);
  };

  const handleTelefonoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 9);
    setFormData(prev => ({ ...prev, telefono: value }));
  };

  const formatTelefonoDisplay = (value: string) => {
    if (!value) return "";
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 1) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 1)} ${cleaned.slice(1)}`;
    return `${cleaned.slice(0, 1)} ${cleaned.slice(1, 5)} ${cleaned.slice(5)}`;
  };

  const handleFechaNacimientoManual = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d]/g, "");
    
    if (value.length >= 2) {
      value = value.slice(0, 2) + "/" + value.slice(2);
    }
    if (value.length >= 5) {
      value = value.slice(0, 5) + "/" + value.slice(5);
    }
    value = value.slice(0, 10);
    
    setFormData(prev => ({ ...prev, fecha_nacimiento_display: value }));
    
    if (value.length === 10) {
      const parsed = parse(value, "dd/MM/yyyy", new Date());
      if (isValid(parsed) && parsed <= new Date()) {
        setFormData(prev => ({ ...prev, fecha_nacimiento: format(parsed, "yyyy-MM-dd") }));
      } else {
        setFormData(prev => ({ ...prev, fecha_nacimiento: "" }));
      }
    } else {
      setFormData(prev => ({ ...prev, fecha_nacimiento: "" }));
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({
        ...prev,
        fecha_nacimiento: format(date, "yyyy-MM-dd"),
        fecha_nacimiento_display: format(date, "dd/MM/yyyy")
      }));
    }
  };

  const registrarPaciente = async () => {
    const errores: string[] = [];
    
    if (!formData.primerNombre.trim()) errores.push(t("errNombre", lang));
    if (!formData.apellidoPaterno.trim()) errores.push(t("errApPaterno", lang));
    if (!formData.apellidoMaterno.trim()) errores.push(t("errApMaterno", lang));
    if (!formData.rut.trim()) errores.push(isExtranjero ? t("errPasaporte", lang) : t("errRut", lang));
    if (!formData.fecha_nacimiento) errores.push(t("errFechaNac", lang));
    if (!formData.email.trim()) {
      errores.push(t("errEmail", lang));
    } else if (!isValidEmail(formData.email)) {
      errores.push(t("errEmailInvalid", lang));
    }
    if (!formData.telefono) {
      errores.push(t("errTelefono", lang));
    } else if (formData.telefono.length !== 9) {
      errores.push(t("errTelefonoLen", lang));
    }
    if (!formData.calle.trim()) errores.push(t("errCalle", lang));
    if (!formData.numeracion.trim()) errores.push(t("errNumeracion", lang));
    if (!formData.ciudad.trim()) {
      errores.push(t("errCiudad", lang));
    } else if (!isValidCiudad(formData.ciudad)) {
      errores.push(t("errCiudadInvalid", lang));
    }

    if (errores.length > 0) {
      showMsg(errores[0], "error", 8000);
      return;
    }

    const rutFormateado = isExtranjero ? formData.rut.trim().toUpperCase() : formatRutStandard(formData.rut);
    const telefonoCompleto = `+56${formData.telefono}`;

    setIsLoading(true);
    try {
      const { data: pacientesPorRut } = await supabase
        .from("pacientes")
        .select("*")
        .eq("rut", rutFormateado)
        .order("created_at", { ascending: false })
        .limit(1);

      const pacienteActual = pacientesPorRut?.[0] ?? paciente;

      if (pacienteActual) {
        const { error: updateError } = await supabase
          .from("pacientes")
          .update({
            nombre: getNombreCompleto(),
            rut: rutFormateado,
            fecha_nacimiento: formData.fecha_nacimiento,
            email: formData.email.trim().toLowerCase(),
            telefono: telefonoCompleto,
            direccion: getDireccionCompleta()
          })
          .eq("id", pacienteActual.id);

        if (updateError) throw updateError;

        const updatedPaciente = { 
          ...pacienteActual, 
          nombre: getNombreCompleto(),
          rut: rutFormateado,
          fecha_nacimiento: formData.fecha_nacimiento,
          email: formData.email.trim().toLowerCase(),
          telefono: telefonoCompleto,
          direccion: getDireccionCompleta()
        };
        setPaciente(updatedPaciente);

        let atencionFinal = atencion;
        if (!atencionFinal) {
          const today = new Date();
          const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).toISOString();
          const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

          const { data: atencionesPaciente } = await supabase
            .from("atenciones")
            .select("*")
            .eq("paciente_id", pacienteActual.id)
            .gte("fecha_ingreso", startOfDay)
            .lte("fecha_ingreso", endOfDay)
            .order("fecha_ingreso", { ascending: false })
            .limit(1);

          const atencionRecuperada = atencionesPaciente?.[0] ?? null;
          
          if (atencionRecuperada) {
            atencionFinal = { ...atencionRecuperada, atencion_examenes: [], boxes: null };
            setAtencion(atencionFinal);
            prevEstadoRef.current = atencionRecuperada.estado;
            prevBoxIdRef.current = atencionRecuperada.box_id;
          }
        }
        
        setInlineMsg(null);
        setStep("portal");
      } else {
        const { data: newPaciente, error } = await supabase
          .from("pacientes")
          .insert({
            nombre: getNombreCompleto(),
            rut: rutFormateado,
            fecha_nacimiento: formData.fecha_nacimiento,
            email: formData.email.trim().toLowerCase(),
            telefono: telefonoCompleto,
            direccion: getDireccionCompleta(),
            empresa_id: null,
            tipo_servicio: null
          })
          .select()
          .single();

        if (error) throw error;

        const { data: newAtencion, error: atencionError } = await supabase
          .from("atenciones")
          .insert({
            paciente_id: newPaciente.id,
            estado: "en_espera",
            fecha_ingreso: new Date().toISOString()
          })
          .select()
          .single();

        if (atencionError) throw atencionError;

        setPaciente(newPaciente);
        setAtencion({ ...newAtencion, atencion_examenes: [], boxes: null });
        prevEstadoRef.current = "en_espera";
        prevBoxIdRef.current = null;
        
        setInlineMsg(null);
        setStep("portal");
      }
    } catch (error: any) {
      console.error("Error registrando paciente:", error);
      showMsg(error.message || t("errorRegistrar", lang), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const abrirTest = (test: ExamenTest) => {
    // Open in new tab instead of modal popup
    window.open(test.url, "_blank");

    if (atencion) {
      try {
        supabase
          .from("paciente_test_tracking" as any)
          .upsert({
            atencion_id: atencion.id,
            examen_test_id: test.id,
            abierto_at: new Date().toISOString()
          } as any, {
            onConflict: "atencion_id,examen_test_id"
          }).then(() => {});

        setTestTracking(prev => {
          const exists = prev.find(t => t.examen_test_id === test.id);
          if (exists) return prev;
          return [...prev, { examen_test_id: test.id, abierto_at: new Date().toISOString(), completado: false }];
        });
      } catch (error) {
        console.error("Error tracking test:", error);
      }
    }
  };

  const isTestCompleted = (testId: string) => {
    return testTracking.some(t => t.examen_test_id === testId);
  };

  // Polling con la MISMA lógica que Flujo
  useEffect(() => {
    if (!paciente?.id || step !== "portal") return;

    const cargarDatos = async () => {
      try {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).toISOString();
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

        const { data: boxesData } = await supabase
          .from("boxes")
          .select("*, box_examenes(examen_id)")
          .eq("activo", true);
        
        const boxesHash = JSON.stringify(boxesData || []);
        if (boxesHash !== prevBoxesHashRef.current) {
          prevBoxesHashRef.current = boxesHash;
          if (boxesData) {
            setBoxes(boxesData);
          }
        }

        const { data: atencionData, error } = await supabase
          .from("atenciones")
          .select("*, pacientes(id, nombre, rut, tipo_servicio), boxes(*)")
          .eq("paciente_id", paciente.id)
          .gte("fecha_ingreso", startOfDay)
          .lte("fecha_ingreso", endOfDay)
          .order("fecha_ingreso", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("[Portal] Error:", error);
          return;
        }

        if (!atencionData) return;

        const boxNombre = atencionData.boxes?.nombre || null;

        // Detectar si el paciente fue llamado
        const fueRecienLlamado = 
          atencionData.estado === "en_atencion" && 
          atencionData.box_id && 
          (prevEstadoRef.current !== "en_atencion" || prevBoxIdRef.current !== atencionData.box_id);

        prevEstadoRef.current = atencionData.estado;
        prevBoxIdRef.current = atencionData.box_id;

        const { data: examenesData } = await supabase
          .from("atencion_examenes")
          .select("id, examen_id, estado, examenes(id, nombre)")
          .eq("atencion_id", atencionData.id);

        const dataHash = JSON.stringify({
          estado: atencionData.estado,
          box_id: atencionData.box_id,
          numero_ingreso: atencionData.numero_ingreso,
          boxNombre,
          examenes: examenesData
        });

        if (dataHash !== prevDataHashRef.current) {
          prevDataHashRef.current = dataHash;

          const atencionCompleta: Atencion = {
            id: atencionData.id,
            estado: atencionData.estado,
            box_id: atencionData.box_id,
            numero_ingreso: atencionData.numero_ingreso,
            fecha_ingreso: atencionData.fecha_ingreso,
            boxes: boxNombre ? { nombre: boxNombre } : null,
            atencion_examenes: (examenesData || []).map((ae: any) => ({
              id: ae.id,
              examen_id: ae.examen_id,
              estado: ae.estado,
              examenes: ae.examenes
            }))
          };

          setAtencion(atencionCompleta);

          const examenesPendientesIds = (examenesData || [])
            .filter((ae: any) => ae.estado === "pendiente" || ae.estado === "incompleto")
            .map((ae: any) => ae.examen_id);

          const boxesPendientes = (boxesData || [])
            .filter(box => box.box_examenes.some((be: any) => examenesPendientesIds.includes(be.examen_id)))
            .map(box => box.nombre);
          
          setPendingBoxes(boxesPendientes);
        }

        // No notification needed - the sticky banner auto-updates via state

      } catch (error) {
        console.error("[Portal] Error en polling:", error);
      }
    };

    cargarDatos();
    // Fallback polling every 30s instead of 3s
    const interval = setInterval(cargarDatos, 30000);

    // Realtime channels to replace aggressive polling
    let atencionChannel: any = null;
    const setupRealtime = async () => {
      if (!paciente?.id) return;
      // Get today's atencion ID for filtering
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();
      
      const { data: atencionCheck } = await supabase
        .from("atenciones")
        .select("id")
        .eq("paciente_id", paciente.id)
        .gte("fecha_ingreso", startOfDay)
        .lte("fecha_ingreso", endOfDay)
        .order("fecha_ingreso", { ascending: false })
        .limit(1)
        .maybeSingle();

      const channelFilters: any[] = [
        { event: "*", schema: "public", table: "atenciones", filter: `paciente_id=eq.${paciente.id}` },
      ];
      if (atencionCheck?.id) {
        channelFilters.push({ event: "*", schema: "public", table: "atencion_examenes", filter: `atencion_id=eq.${atencionCheck.id}` });
      }

      atencionChannel = supabase.channel(`portal-${paciente.id}`);
      channelFilters.forEach(f => {
        atencionChannel = atencionChannel.on("postgres_changes", f, () => cargarDatos());
      });
      atencionChannel.subscribe();
    };
    setupRealtime();

    return () => {
      clearInterval(interval);
      if (atencionChannel) supabase.removeChannel(atencionChannel);
    };
  }, [paciente?.id, step]);

  // Refrescar manual
  const refreshData = useCallback(async () => {
    if (!paciente?.id || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

      const { data: atencionData } = await supabase
        .from("atenciones")
        .select("*, boxes(*)")
        .eq("paciente_id", paciente.id)
        .gte("fecha_ingreso", startOfDay)
        .lte("fecha_ingreso", endOfDay)
        .order("fecha_ingreso", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (atencionData) {
        const { data: examenesData } = await supabase
          .from("atencion_examenes")
          .select("id, examen_id, estado, examenes(id, nombre)")
          .eq("atencion_id", atencionData.id);

        setAtencion({
          id: atencionData.id,
          estado: atencionData.estado,
          box_id: atencionData.box_id,
          numero_ingreso: atencionData.numero_ingreso,
          fecha_ingreso: atencionData.fecha_ingreso,
          boxes: atencionData.boxes,
          atencion_examenes: (examenesData || []).map((ae: any) => ({
            id: ae.id,
            examen_id: ae.examen_id,
            estado: ae.estado,
            examenes: ae.examenes
          }))
        });
      }
    } catch (error) {
      console.error("Error refreshing:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [paciente?.id, isRefreshing]);

  // ============ Inline message banner (replaces toasts) ============
  const InlineMessageBanner = () => {
    if (!inlineMsg) return null;
    const bgClass = inlineMsg.type === "error" 
      ? "bg-destructive text-destructive-foreground" 
      : inlineMsg.type === "success" 
        ? "bg-green-600 text-white"
        : "bg-primary text-primary-foreground";
    return (
      <div className={`w-full px-4 py-3 text-sm font-medium text-center rounded-lg mb-3 ${bgClass}`}>
        {inlineMsg.text}
      </div>
    );
  };

  // ============ Language Selector ============
  const LanguageSelector = () => (
    <div className="flex items-center justify-center gap-2 mb-3">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <button
        type="button"
        onClick={() => setLang("es")}
        className={cn(
          "px-2 py-1 text-sm rounded transition-colors",
          lang === "es" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
        )}
      >
        Español
      </button>
      <span className="text-muted-foreground">|</span>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={cn(
          "px-2 py-1 text-sm rounded transition-colors",
          lang === "en" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
        )}
      >
        English
      </button>
    </div>
  );

  // ============ Sticky Status Banner for portal view ============
  const StickyStatusBanner = () => {
    if (!atencion) return null;

    if (atencion.estado === "en_atencion" && atencion.boxes?.nombre) {
      return (
        <div className="sticky top-0 z-50 w-full">
          <div className="bg-green-600 text-white px-4 py-4 text-center shadow-lg animate-pulse">
            <div className="flex items-center justify-center gap-2">
              <MapPin className="h-5 w-5" />
              <span className="text-lg font-bold">{t("esSuTurno", lang)}</span>
            </div>
            <div className="text-xl font-black mt-1">
              {t("dirijaseBox", lang)} {atencion.boxes.nombre}
            </div>
          </div>
        </div>
      );
    }

    if (atencion.estado === "en_espera") {
      return (
        <div className="sticky top-0 z-50 w-full">
          <div className="bg-amber-500 text-white px-4 py-3 text-center shadow-md">
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="font-semibold">{t("enEspera", lang)} #{atencion.numero_ingreso}</span>
            </div>
            <p className="text-xs mt-0.5 opacity-90">{t("leInformaremos", lang)}</p>
          </div>
        </div>
      );
    }

    if (atencion.estado === "completado") {
      return (
        <div className="sticky top-0 z-50 w-full">
          <div className="bg-green-700 text-white px-4 py-3 text-center shadow-md">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-semibold">{t("atencionCompletada", lang)}</span>
            </div>
          </div>
        </div>
      );
    }

    if (atencion.estado === "incompleto") {
      return (
        <div className="sticky top-0 z-50 w-full">
          <div className="bg-amber-600 text-white px-4 py-3 text-center shadow-md">
            <div className="flex items-center justify-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-semibold">{t("atencionIncompleta", lang)} #{atencion.numero_ingreso}</span>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  if (step === "codigo") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundImage: `url(${portalBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">{t("portalTitle", lang)}</CardTitle>
            <CardDescription>{t("codigoSubtitle", lang)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LanguageSelector />
            <InlineMessageBanner />
            <div>
              <Label htmlFor="codigo">{t("codigoDia", lang)}</Label>
              <Input
                id="codigo"
                placeholder="ABC12"
                value={codigoIngresado}
                onChange={(e) => setCodigoIngresado(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && validarCodigoDiario()}
                className="text-lg text-center font-mono tracking-widest uppercase"
                maxLength={5}
              />
            </div>
            <Button 
              onClick={validarCodigoDiario} 
              className="w-full" 
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("validando", lang)}
                </>
              ) : (
                t("continuar", lang)
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "identificacion") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundImage: `url(${portalBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">{t("portalTitle", lang)}</CardTitle>
            <CardDescription>
              {isExtranjero ? t("identificacionSubtitlePassport", lang) : t("identificacionSubtitle", lang)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LanguageSelector />
            <InlineMessageBanner />
            {/* Toggle Extranjero */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-input bg-muted/30">
              <Label htmlFor="extranjero-toggle" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                {t("extranjero", lang)}
              </Label>
              <Switch
                id="extranjero-toggle"
                checked={isExtranjero}
                onCheckedChange={(checked) => {
                  setIsExtranjero(checked);
                  setRut("");
                }}
              />
            </div>
            <div>
              <Label htmlFor="rut">{isExtranjero ? t("pasaporte", lang) : t("rut", lang)}</Label>
              <Input
                id="rut"
                placeholder={isExtranjero ? t("placeholderPassport", lang) : t("placeholderRut", lang)}
                value={rut}
                onChange={handleRutChange}
                onKeyDown={(e) => e.key === "Enter" && buscarPaciente()}
                className="text-lg"
              />
            </div>
            <Button 
              onClick={buscarPaciente} 
              className="w-full" 
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("buscando", lang)}
                </>
              ) : (
                t("ingresar", lang)
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "registro") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundImage: `url(${portalBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold">{t("registroTitle", lang)}</CardTitle>
            <CardDescription>{t("registroSubtitle", lang)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <LanguageSelector />
            <InlineMessageBanner />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primerNombre" className="text-sm font-medium mb-1.5 block">{t("nombre", lang)}</Label>
                <Input
                  id="primerNombre"
                  placeholder="JUAN"
                  value={formData.primerNombre}
                  onChange={handleNombreFieldChange('primerNombre')}
                  className="h-11 uppercase"
                />
              </div>
              <div>
                <Label htmlFor="apellidoPaterno" className="text-sm font-medium mb-1.5 block">{t("apellidoPaterno", lang)}</Label>
                <Input
                  id="apellidoPaterno"
                  placeholder="PÉREZ"
                  value={formData.apellidoPaterno}
                  onChange={handleNombreFieldChange('apellidoPaterno')}
                  className="h-11 uppercase"
                />
              </div>
              <div>
                <Label htmlFor="apellidoMaterno" className="text-sm font-medium mb-1.5 block">{t("apellidoMaterno", lang)}</Label>
                <Input
                  id="apellidoMaterno"
                  placeholder="GONZÁLEZ"
                  value={formData.apellidoMaterno}
                  onChange={handleNombreFieldChange('apellidoMaterno')}
                  className="h-11 uppercase"
                />
              </div>
              <div>
                <Label htmlFor="formRut" className="text-sm font-medium mb-1.5 block">{isExtranjero ? t("pasaporteLabel", lang) : t("rutLabel", lang)}</Label>
                <Input
                  id="formRut"
                  placeholder={isExtranjero ? t("placeholderPassport", lang) : t("placeholderRut", lang)}
                  value={formData.rut}
                  onChange={handleFormRutChange}
                  className="h-11"
                />
              </div>
              <div>
                <Label htmlFor="fecha_nacimiento" className="text-sm font-medium mb-1.5 block">{t("fechaNacimiento", lang)}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="fecha_nacimiento"
                    placeholder="DD/MM/AAAA"
                    value={formData.fecha_nacimiento_display}
                    onChange={handleFechaNacimientoManual}
                    className="h-11 flex-1"
                    maxLength={10}
                    inputMode="numeric"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="h-11 w-11 flex-shrink-0">
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={formData.fecha_nacimiento ? new Date(formData.fecha_nacimiento + "T12:00:00") : undefined}
                        onSelect={handleCalendarSelect}
                        disabled={(date) => date > new Date()}
                        initialFocus
                        captionLayout="dropdown-buttons"
                        fromYear={1920}
                        toYear={new Date().getFullYear()}
                        className={cn("p-3")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div>
                <Label htmlFor="email" className="text-sm font-medium mb-1.5 block">{t("email", lang)}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="h-11"
                />
              </div>
              <div>
                <Label htmlFor="telefono" className="text-sm font-medium mb-1.5 block">{t("telefono", lang)}</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-2.5 rounded-md border h-11 flex items-center">+56</span>
                  <Input
                    id="telefono"
                    type="tel"
                    placeholder="9 1234 5678"
                    value={formatTelefonoDisplay(formData.telefono)}
                    onChange={handleTelefonoChange}
                    className="h-11 flex-1"
                    maxLength={13}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="calle" className="text-sm font-medium mb-1.5 block">{t("calle", lang)}</Label>
                <Input
                  id="calle"
                  placeholder="AV. PRINCIPAL"
                  value={formData.calle}
                  onChange={handleCalleChange}
                  className="h-11 uppercase"
                />
              </div>
              <div>
                <Label htmlFor="numeracion" className="text-sm font-medium mb-1.5 block">{t("numeracion", lang)}</Label>
                <Input
                  id="numeracion"
                  placeholder="123"
                  value={formData.numeracion}
                  onChange={(e) => setFormData(prev => ({ ...prev, numeracion: e.target.value }))}
                  className="h-11"
                />
              </div>
              <div className="sm:col-span-2 relative">
                <Label htmlFor="ciudad" className="text-sm font-medium mb-1.5 block">{t("ciudad", lang)}</Label>
                <Input
                  id="ciudad"
                  placeholder="Santiago"
                  value={formData.ciudad}
                  onChange={handleCiudadChange}
                  onBlur={() => setTimeout(() => setShowCiudadSugerencias(false), 200)}
                  onFocus={() => {
                    if (ciudadSugerencias.length > 0) setShowCiudadSugerencias(true);
                  }}
                  className="h-11"
                />
                {showCiudadSugerencias && ciudadSugerencias.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-background border border-input rounded-md shadow-lg">
                    {ciudadSugerencias.map((ciudad, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm"
                        onMouseDown={() => seleccionarCiudad(ciudad)}
                      >
                        {ciudad}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">{t("ciudadHint", lang)}</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setStep("identificacion")}
                className="flex-1 h-11"
              >
                {t("volver", lang)}
              </Button>
              <Button 
                onClick={registrarPaciente} 
                className="flex-1 h-11" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("registrando", lang)}
                  </>
                ) : (
                  t("registrar", lang)
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Portal view
  return (
    <div className="min-h-screen" style={{ backgroundImage: `url(${portalBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      {/* Sticky Status Banner - always visible at top */}
      <StickyStatusBanner />

      <div className="max-w-lg mx-auto space-y-4 p-4">
        <LanguageSelector />
        {/* Patient Card */}
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-bold text-lg">
                    #{atencion?.numero_ingreso || "--"}
                  </Badge>
                  <div className="font-medium text-lg text-foreground">
                    {paciente?.nombre}
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                  <span>{paciente?.rut}</span>
                  {atencion?.fecha_ingreso && (
                    <span>• {t("ingreso", lang)}: {format(new Date(atencion.fecha_ingreso), "HH:mm", { locale: es })}</span>
                  )}
                  {paciente?.tipo_servicio && (
                    <Badge variant="outline" className="text-xs">
                      {paciente.tipo_servicio === "workmed" ? "WM" : "J"}
                    </Badge>
                  )}
                </div>

                {/* Empresa */}
                {empresa && (
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{empresa.nombre}</span>
                  </div>
                )}

                {/* Pending Boxes */}
                {pendingBoxes.length > 0 && (
                  <div className="text-sm text-primary mt-2 font-medium">
                    {t("boxesPendientes", lang)}: {pendingBoxes.map(b => `Box ${b}`).join(", ")}
                  </div>
                )}

                {/* Exams grouped by box */}
                {atencion && atencion.atencion_examenes.length > 0 && (
                  <Collapsible className="mt-3" defaultOpen>
                    <CollapsibleTrigger className="flex items-center gap-1 text-sm text-primary hover:underline">
                      <ChevronDown className="h-4 w-4" />
                      <span className="font-medium">
                        {t("verExamenes", lang)} ({atencion.atencion_examenes.filter(ae => ae.estado === "pendiente" || ae.estado === "incompleto").length} {t("pendientes", lang)})
                      </span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-3 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                      {(() => {
                        const examenPorBox: { [boxNombre: string]: { nombre: string; estado: string }[] } = {};
                        
                        atencion.atencion_examenes.forEach((ae) => {
                          const boxConExamen = boxes.find((box) =>
                            box.box_examenes.some((be) => be.examen_id === ae.examen_id)
                          );
                          const boxNombre = boxConExamen?.nombre || "Sin box";
                          if (!examenPorBox[boxNombre]) {
                            examenPorBox[boxNombre] = [];
                          }
                          examenPorBox[boxNombre].push({ nombre: ae.examenes.nombre, estado: ae.estado });
                        });

                        return Object.entries(examenPorBox).map(([boxNombre, examenes]) => (
                          <div key={boxNombre} className="pl-3 border-l-2 border-primary/30">
                            <div className="text-xs font-semibold text-muted-foreground mb-1.5">
                              {boxNombre}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {examenes.map((examen, idx) => (
                                <Badge 
                                  key={idx} 
                                  variant={
                                    examen.estado === "completado" ? "default" 
                                    : examen.estado === "muestra_tomada" ? "default"
                                    : examen.estado === "incompleto" ? "outline" 
                                    : "secondary"
                                  }
                                  className={`text-xs py-0.5 px-2 ${
                                    examen.estado === "completado" 
                                      ? "bg-green-600" 
                                      : examen.estado === "muestra_tomada"
                                        ? "bg-blue-600 text-white"
                                      : examen.estado === "incompleto" 
                                        ? "border-amber-500 text-amber-600" 
                                        : ""
                                  }`}
                                >
                                  {(examen.estado === "completado" || examen.estado === "muestra_tomada") && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                  {examen.nombre}
                                  {examen.estado === "muestra_tomada" ? " ✓" : ""}
                                  {examen.estado === "incompleto" ? " (I)" : ""}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
              
              {/* Refresh button */}
              <div className="flex flex-col items-end gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={refreshData}
                  disabled={isRefreshing}
                  title="Actualizar información"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
            
            {/* No company warning */}
            {!empresa && (
              <div className="mt-3 p-2 rounded bg-warning/10 border border-warning/30">
                <div className="flex items-center gap-2 text-warning text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{t("esperandoEmpresa", lang)}</span>
                </div>
              </div>
            )}

            {/* No exams warning */}
            {atencion && atencion.atencion_examenes.length === 0 && (
              <div className="mt-3 p-2 rounded bg-muted/50 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <FileText className="h-4 w-4" />
                  <span>{t("examenesAparecen", lang)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documentos requeridos - expandibles inline */}
        {atencionDocumentos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                {t("documentosCompletar", lang)}
                {documentosPendientes > 0 && (
                  <Badge variant="outline" className="ml-2">
                    {documentosPendientes} {documentosPendientes > 1 ? t("pendientes", lang) : t("pendiente", lang)}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {t("toqueDocumento", lang)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {atencionDocumentos.map((doc, index) => (
                <Collapsible key={doc.id} open={selectedDocumentoIndex === index} onOpenChange={(open) => setSelectedDocumentoIndex(open ? index : null)}>
                  <CollapsibleTrigger asChild>
                    <DocumentoStatusCard
                      atencionDocumento={doc}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 mb-3 border rounded-lg p-3 bg-background">
                    <DocumentoFormViewer
                      atencionDocumento={doc}
                      campos={documentoCampos[doc.documento_id] || []}
                      onComplete={() => {
                        reloadDocumentos();
                        setSelectedDocumentoIndex(null);
                      }}
                      contextData={{
                        paciente: paciente ? {
                          nombre: paciente.nombre,
                          rut: paciente.rut || undefined,
                          fecha_nacimiento: paciente.fecha_nacimiento || undefined,
                          email: paciente.email || undefined,
                          telefono: paciente.telefono || undefined,
                          direccion: paciente.direccion || undefined,
                        } : undefined,
                        empresa: empresa?.nombre,
                        numero_ingreso: atencion?.numero_ingreso || undefined,
                      }}
                    />
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Cuestionarios completables por el paciente */}
        {atencion && <PortalCuestionarios atencionId={atencion.id} />}

        {/* Tests / Forms - opens in new tab */}
        {examenTests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                {t("formulariosExternos", lang)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {examenTests.map((test) => (
                <Button
                  key={test.id}
                  variant={isTestCompleted(test.id) ? "secondary" : "outline"}
                  className="w-full justify-between"
                  onClick={() => abrirTest(test)}
                >
                  <span>{test.nombre}</span>
                  {isTestCompleted(test.id) ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                </Button>
              ))}
            </CardContent>
          </Card>
        )}

        {!atencion && (
          <Card className="border-muted">
            <CardContent className="pt-6 text-center text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("esperandoRegistro", lang)}</p>
              <p className="text-sm mt-2">{t("examenesAparecen", lang)}</p>
            </CardContent>
          </Card>
        )}

        {/* Back button */}
        <Button 
          variant="ghost" 
          className="w-full"
          onClick={() => {
            setPaciente(null);
            setAtencion(null);
            setEmpresa(null);
            setBoxes([]);
            setPendingBoxes([]);
            setRut("");
            setStep("identificacion");
          }}
        >
          {t("cambiarPaciente", lang)}
        </Button>
      </div>

      {/* Indicador de versión */}
      <div className="fixed bottom-2 left-2 text-xs text-muted-foreground/50 select-none pointer-events-none">
        v{PORTAL_VERSION}
      </div>
    </div>
  );
}
