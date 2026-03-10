import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Monitor,
  Stethoscope,
  Syringe,
  Heart,
  LayoutDashboard,
  Users,
  GitBranch,
  CheckCircle2,
  XCircle,
  Building2,
  Grid3X3,
  FlaskConical,
  FileText,
  Tv,
  Settings,
  ClipboardList,
  Lightbulb,
  Info,
  AlertTriangle,
} from "lucide-react";

// ── Role definitions ──
const roles = [
  {
    id: "recepcion",
    label: "Recepción",
    icon: Monitor,
    color: "bg-blue-500",
    description: "Gestión integral del flujo de pacientes, registro y configuración del sistema.",
    modules: [
      "dashboard", "pacientes", "flujo", "completados", "incompletos",
      "empresas", "boxes", "examenes", "documentos", "pantalla-tv", "configuracion",
    ],
  },
  {
    id: "clinico",
    label: "Clínico",
    icon: Stethoscope,
    color: "bg-emerald-500",
    description: "Atención de pacientes en box, registro de resultados y formularios de exámenes.",
    modules: ["dashboard", "mi-box"],
  },
  {
    id: "enfermera",
    label: "Enfermera",
    icon: Syringe,
    color: "bg-purple-500",
    description: "Toma de muestras, registro de resultados y seguimiento de exámenes pendientes.",
    modules: ["dashboard", "mi-box", "completados", "incompletos"],
  },
  {
    id: "medico",
    label: "Médico",
    icon: Heart,
    color: "bg-rose-500",
    description: "Evaluación médica de aptitud, revisión de resultados y dictámenes.",
    modules: ["dashboard", "mi-box", "evaluacion-medica"],
  },
];

// ── Module content ──
type Section = { title: string; content: string; tip?: string; warning?: string };
type ModuleDef = {
  id: string;
  label: string;
  icon: React.ElementType;
  summary: string;
  sections: Section[];
};

const moduleDefinitions: ModuleDef[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    summary: "Pantalla principal con resumen en tiempo real del centro.",
    sections: [
      {
        title: "Resumen del Día",
        content:
          "En la parte superior encontrará tarjetas con: Pacientes Ingresados (total del día), Atenciones Completadas y Distribución por Tipo de Servicio (Workmed / Jenner).",
      },
      {
        title: "Métricas Mensuales",
        content:
          "Seleccione un mes para ver estadísticas acumuladas. Muestra totales de atenciones completadas en el período seleccionado.",
      },
      {
        title: "Tabla de Pacientes Ingresados",
        content:
          "Vista detallada con todos los pacientes del día. Incluye: número de ingreso, nombre, RUT, empresa, tipo de servicio, estado y badges de exámenes con código de colores.",
      },
      {
        title: "Filtros Dinámicos",
        content:
          "Puede filtrar por: nombre, estado de atención, empresa, tipo de servicio, examen específico, box y colores de estado de examen. Los filtros interactúan entre sí — al seleccionar un Box, la tabla solo muestra los exámenes de ese box.",
        tip: "Los filtros son dinámicos entre sí. Por ejemplo, si selecciona un Box, las listas de Empresa y Examen se actualizarán para mostrar solo opciones relevantes.",
      },
      {
        title: "Búsqueda Histórica",
        content:
          "En la parte inferior hay un buscador que permite consultar historiales de atenciones pasadas de cualquier paciente.",
      },
    ],
  },
  {
    id: "pacientes",
    label: "Pacientes",
    icon: Users,
    summary: "Registro, ingreso y gestión de pacientes del centro.",
    sections: [
      {
        title: "Registrar Nuevo Paciente",
        content:
          "Complete los datos del formulario lateral: Nombre (obligatorio), RUT (formato automático), Tipo de servicio, Empresa, Faena, Email, Teléfono, Fecha de nacimiento. Luego seleccione las baterías y exámenes individuales, y presione \"Ingresar Paciente\". Se asigna un número de ingreso correlativo automático.",
      },
      {
        title: "Buscar Pacientes",
        content:
          "Use el campo de búsqueda para filtrar por nombre o RUT. Use el selector de fecha para ver pacientes de otros días. Los pacientes con datos incompletos del portal se marcan con un ícono de alerta.",
      },
      {
        title: "Código del Día",
        content:
          "En la pestaña correspondiente se muestra el código diario activo para que los pacientes completen sus datos desde el Portal Paciente. El código se renueva automáticamente.",
      },
      {
        title: "Pre-Reservas y Agenda Diferida",
        content:
          "Gestione pre-reservas de atención creadas por empresas: confirme, cancele o vincule con atenciones existentes. La agenda diferida administra pacientes que requieren atención programada en fecha futura.",
      },
    ],
  },
  {
    id: "flujo",
    label: "Flujo",
    icon: GitBranch,
    summary: "Control del flujo de pacientes entre boxes de atención.",
    sections: [
      {
        title: "Vista Principal",
        content:
          "Muestra todas las atenciones del día en estado \"En Espera\" o \"En Atención\", con: número de ingreso, nombre, RUT, tipo de servicio, estado de ficha y box actual.",
      },
      {
        title: "Asignar Paciente a un Box",
        content:
          "Localice al paciente en la lista, seleccione el box destino en el desplegable. El paciente pasará a estado \"En Atención\" en ese box.",
      },
      {
        title: "Marcar Exámenes",
        content:
          "Cada paciente muestra sus exámenes con badges de colores. Puede marcar como: Completado (✅), Muestra Tomada (🔵) o Incompleto (❌). Seleccione múltiples exámenes y guárdelos de una vez.",
      },
      {
        title: "Completar Atención",
        content:
          "Cuando todos los exámenes estén finalizados, presione \"Completar\". Si hay exámenes pendientes, se mostrará una advertencia y la atención se marcará como \"Incompleta\".",
        warning: "Si hay exámenes sin completar, la atención se marcará como Incompleta automáticamente.",
      },
      {
        title: "Chat Global",
        content:
          "En la esquina inferior hay un chat en tiempo real para comunicarse con otros usuarios del sistema.",
      },
    ],
  },
  {
    id: "completados",
    label: "Completados",
    icon: CheckCircle2,
    summary: "Revisión y gestión de atenciones finalizadas.",
    sections: [
      {
        title: "Vista de Atenciones Completadas",
        content:
          "Lista todas las atenciones marcadas como \"Completado\" en la fecha seleccionada. Muestra: número de ingreso, nombre, RUT, empresa, tipo de servicio, fecha y badges de exámenes.",
      },
      {
        title: "Revertir Atención",
        content:
          "Presione el botón ↩️ Revertir, seleccione qué exámenes desea revertir a estado pendiente y confirme. La atención volverá a estado \"En Espera\".",
      },
      {
        title: "Resultados Pendientes",
        content:
          "En la pestaña correspondiente, lista exámenes en estado \"Muestra Tomada\" sin resultado final. Útil para seguimiento de muestras enviadas a laboratorio.",
        tip: "Revise esta pestaña regularmente para completar resultados de laboratorio pendientes.",
      },
      {
        title: "Métricas",
        content: "Estadísticas detalladas de productividad del período seleccionado.",
      },
    ],
  },
  {
    id: "incompletos",
    label: "Incompletos",
    icon: XCircle,
    summary: "Gestión de atenciones que no pudieron completarse.",
    sections: [
      {
        title: "Vista de Atenciones Incompletas",
        content:
          "Muestra atenciones marcadas como \"Incompleto\" en un rango de fechas (por defecto: mes actual). Incluye exámenes incompletos resaltados en rojo y observaciones del motivo.",
      },
      {
        title: "Reactivar Atención",
        content:
          "Presione ↩️ Reactivar y confirme. La atención vuelve a estado \"En Espera\" con sus exámenes pendientes, lista para ser retomada.",
      },
    ],
  },
  {
    id: "empresas",
    label: "Empresas",
    icon: Building2,
    summary: "Administración de empresas cliente del centro.",
    sections: [
      {
        title: "Gestión de Empresas",
        content:
          "Crear nueva empresa con: Nombre, RUT, Razón Social, Contacto, Email, Teléfono, Centro de Costo. Editar con el ícono ✏️ o eliminar con 🗑️.",
      },
      {
        title: "Baterías por Empresa",
        content:
          "Asigne paquetes de exámenes (baterías) con valores de venta específicos para cada empresa. Esto permite tarifas diferenciadas.",
      },
      {
        title: "Faenas",
        content:
          "Gestione las faenas (ubicaciones de trabajo) asociadas a cada empresa. Cada faena puede tener exámenes y baterías específicas.",
      },
    ],
  },
  {
    id: "boxes",
    label: "Boxes",
    icon: Grid3X3,
    summary: "Configuración de salas y estaciones de atención.",
    sections: [
      {
        title: "Gestión de Boxes",
        content:
          "Crear box con nombre y descripción. Activar/desactivar con el switch sin eliminarlo. Cada box se configura con los exámenes que se realizan en él.",
      },
      {
        title: "Asignación de Exámenes",
        content:
          "En el módulo de Exámenes se define qué exámenes se realizan en cada box. Esto es fundamental para el correcto funcionamiento del flujo de pacientes.",
        warning: "La asignación correcta de exámenes a boxes es crucial para el flujo de pacientes.",
      },
    ],
  },
  {
    id: "examenes",
    label: "Exámenes",
    icon: FlaskConical,
    summary: "Catálogo de exámenes, baterías y formularios.",
    sections: [
      {
        title: "Catálogo de Exámenes",
        content:
          "Crear examen con: nombre, descripción, código, duración estimada y costo neto. Asignar cada examen a los boxes donde se realiza.",
      },
      {
        title: "Baterías (Paquetes)",
        content:
          "Agrupe varios exámenes en un paquete con nombre. Asigne documentos y configure precios diferenciados por empresa.",
      },
      {
        title: "Formularios de Examen",
        content:
          "Configure campos de formulario para cada examen: texto, número, select, checkbox, archivo, etc. Los campos se agrupan lógicamente.",
      },
      {
        title: "Trazabilidad",
        content:
          "Configure relaciones de trazabilidad entre exámenes que comparten resultados o archivos.",
      },
    ],
  },
  {
    id: "documentos",
    label: "Documentos",
    icon: FileText,
    summary: "Creación y administración de formularios digitales.",
    sections: [
      {
        title: "Tipos de Documentos",
        content:
          "Tres tipos disponibles: Consentimiento (requiere firma), Declaración (informativa) y Cuestionario (con preguntas para el paciente).",
      },
      {
        title: "Crear Documento",
        content:
          "Agregue campos: texto informativo, texto corto/largo, checkbox, select/radio, fecha y firma digital. Ordene los campos arrastrándolos.",
      },
      {
        title: "Variables Dinámicas",
        content:
          "Los textos pueden incluir variables automáticas: {{nombre}}, {{rut}}, {{empresa}}, {{fecha_actual}}, {{numero_ingreso}}, que se reemplazan con los datos reales del paciente.",
        tip: "Use variables dinámicas como {{nombre}} para personalizar automáticamente los documentos.",
      },
    ],
  },
  {
    id: "pantalla-tv",
    label: "Pantalla TV",
    icon: Tv,
    summary: "Información en pantallas de sala de espera.",
    sections: [
      {
        title: "Configuración",
        content:
          "Seleccione los boxes a mostrar, configure códigos QR opcionales y presione \"Iniciar Pantalla\" o \"Pantalla con QR\".",
      },
      {
        title: "Modo Pantalla",
        content:
          "Muestra en pantalla completa: nombre del paciente llamado, box destino, número de ingreso y código del día con cuenta regresiva. Incluye llamado por voz automático.",
      },
      {
        title: "Modo QR",
        content:
          "Alterna entre la pantalla de llamados y códigos QR configurados. Útil para mostrar enlaces al Portal Paciente.",
      },
    ],
  },
  {
    id: "configuracion",
    label: "Configuración",
    icon: Settings,
    summary: "Configuración general del sistema.",
    sections: [
      {
        title: "Bloques de Agenda",
        content:
          "Configure bloques horarios para la agenda de citas: nombre, hora inicio/fin, cupo máximo. Active/desactive y ordene bloques.",
      },
      {
        title: "Faenas",
        content:
          "Gestión centralizada de faenas. Crear, editar, activar/desactivar y asociar a empresas.",
      },
    ],
  },
  {
    id: "mi-box",
    label: "Mi Box",
    icon: ClipboardList,
    summary: "Gestión de atención de pacientes en su box asignado.",
    sections: [
      {
        title: "Selección de Box",
        content:
          "Al ingresar por primera vez, seleccione su box de trabajo. Se guarda para sesiones futuras. Puede cambiarlo con \"Cambiar Box\".",
      },
      {
        title: "Cola de Espera",
        content:
          "Muestra pacientes con exámenes pendientes en su box: número de ingreso, nombre, RUT, tipo de servicio, badges de exámenes (amarillos = pendientes, grises = otros boxes), temporizadores de presión arterial.",
      },
      {
        title: "Llamar Paciente",
        content:
          "Presione ▶️ Llamar para cambiar el estado del paciente a \"En Atención\" en su box. Modo individual (uno a uno) o múltiple (varios simultáneamente).",
      },
      {
        title: "Paciente en Atención",
        content:
          "Al llamar un paciente, aparece su ficha completa con formularios de exámenes. Complete los campos, adjunte archivos si aplica y marque cada examen como: ✅ Completado, 🔵 Muestra Tomada o ❌ Incompleto.",
      },
      {
        title: "Documentos",
        content:
          "Acceda a documentos/formularios asignados: cuestionarios, consentimientos firmados. Los pendientes se marcan con un contador.",
      },
      {
        title: "Liberar o Completar",
        content:
          "\"Liberar\" devuelve al paciente a la cola para ser atendido en otro box. \"Completar atención\" finaliza si todos los exámenes están completos.",
      },
    ],
  },
  {
    id: "evaluacion-medica",
    label: "Evaluación Médica",
    icon: Heart,
    summary: "Evaluación clínica integral y dictámenes de aptitud.",
    sections: [
      {
        title: "Listado de Pacientes",
        content:
          "Muestra pacientes del día con sus baterías y estado. Los estados incluyen: Lista para evaluar (verde), Esperando resultados (amarillo), Pendiente (gris), Evaluado-Apto (azul), Evaluado-Restricciones (naranja), Evaluado-No Apto (rojo).",
      },
      {
        title: "Evaluación del Paciente",
        content:
          "Al seleccionar un paciente, revise resultados de exámenes y complete el formulario: Resultado (Apto / No Apto / Apto con Restricciones), Observaciones clínicas, Restricciones (si aplica) y evaluación por examen (Normal/Anormal).",
      },
      {
        title: "No Aptos y Re-evaluación",
        content:
          "Lista histórica de pacientes No Apto. Permite re-evaluar cambiando el resultado y las observaciones. Se registra quién revisó y cuándo.",
        tip: "Use la pestaña No Aptos para hacer seguimiento y re-evaluar si las condiciones del paciente cambian.",
      },
    ],
  },
];

// ── Color legend ──
const colorLegend = [
  { color: "bg-yellow-400", label: "Pendiente", desc: "Examen aún no realizado" },
  { color: "bg-blue-400", label: "Muestra Tomada", desc: "Muestra tomada, resultado pendiente" },
  { color: "bg-green-500", label: "Completado", desc: "Examen realizado exitosamente" },
  { color: "bg-red-500", label: "Incompleto", desc: "Examen no pudo completarse" },
];

// ── Component ──
const GuiaUsuario = () => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const activeRole = roles.find((r) => r.id === selectedRole);
  const activeModule = moduleDefinitions.find((m) => m.id === selectedModule);

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── Landing: role selector ──
  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-5xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-3">
              📘 Guía de Usuario — MediFlow
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Seleccione su perfil para ver los módulos disponibles y aprender a usar el sistema paso a paso.
            </p>
          </div>

          {/* Color legend */}
          <Card className="mb-10">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Código de Colores de Exámenes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {colorLegend.map((c) => (
                  <div key={c.label} className="flex items-center gap-3">
                    <span className={`w-4 h-4 rounded-full ${c.color} shrink-0`} />
                    <div>
                      <p className="text-sm font-medium">{c.label}</p>
                      <p className="text-xs text-muted-foreground">{c.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Role cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <Card
                  key={role.id}
                  className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 border-2 border-transparent hover:border-primary/30"
                  onClick={() => setSelectedRole(role.id)}
                >
                  <CardHeader className="text-center pb-3">
                    <div className={`mx-auto w-16 h-16 rounded-2xl ${role.color} flex items-center justify-center mb-3`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl">{role.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center text-sm">
                      {role.description}
                    </CardDescription>
                    <div className="mt-4 flex flex-wrap gap-1 justify-center">
                      {role.modules.map((m) => {
                        const mod = moduleDefinitions.find((md) => md.id === m);
                        return (
                          <Badge key={m} variant="secondary" className="text-xs">
                            {mod?.label ?? m}
                          </Badge>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <Link to="/">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Volver al sistema
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Module detail view ──
  if (selectedModule && activeModule) {
    const Icon = activeModule.icon;
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <button onClick={() => { setSelectedRole(null); setSelectedModule(null); }} className="hover:text-foreground transition-colors">
              Inicio
            </button>
            <ChevronRight className="h-4 w-4" />
            <button onClick={() => setSelectedModule(null)} className="hover:text-foreground transition-colors">
              {activeRole?.label}
            </button>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">{activeModule.label}</span>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{activeModule.label}</h1>
              <p className="text-muted-foreground">{activeModule.summary}</p>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            {activeModule.sections.map((section, idx) => {
              const key = `${activeModule.id}-${idx}`;
              const isOpen = openSections[key] !== false; // default open
              return (
                <Collapsible key={key} open={isOpen} onOpenChange={() => toggleSection(key)}>
                  <Card>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="flex flex-row items-center justify-between py-4 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                            {idx + 1}
                          </div>
                          <CardTitle className="text-lg text-left">{section.title}</CardTitle>
                        </div>
                        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-5">
                        <p className="text-foreground/80 leading-relaxed">{section.content}</p>
                        {section.tip && (
                          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                            <Lightbulb className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-blue-700 dark:text-blue-300">{section.tip}</p>
                          </div>
                        )}
                        {section.warning && (
                          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-700 dark:text-amber-300">{section.warning}</p>
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>

          <div className="mt-8 flex gap-3">
            <Button variant="outline" onClick={() => setSelectedModule(null)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Volver a módulos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Role overview: module list ──
  const RoleIcon = activeRole!.icon;
  const roleModules = activeRole!.modules
    .map((id) => moduleDefinitions.find((m) => m.id === id))
    .filter(Boolean) as ModuleDef[];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <button onClick={() => { setSelectedRole(null); setSelectedModule(null); }} className="hover:text-foreground transition-colors">
            Inicio
          </button>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{activeRole!.label}</span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className={`w-16 h-16 rounded-2xl ${activeRole!.color} flex items-center justify-center`}>
            <RoleIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manual de {activeRole!.label}</h1>
            <p className="text-muted-foreground">{activeRole!.description}</p>
          </div>
        </div>

        {/* Quick info */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground mb-1">Acceso al Sistema</p>
                <p className="text-sm text-muted-foreground">
                  Ingrese con su usuario y contraseña. La barra de navegación mostrará solo los módulos a los que tiene acceso.
                  Use 🌙/☀️ para cambiar entre modo claro y oscuro, y el botón de candado para cambiar su contraseña.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modules grid */}
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Sus módulos disponibles ({roleModules.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {roleModules.map((mod) => {
            const MIcon = mod.icon;
            return (
              <Card
                key={mod.id}
                className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 border-2 border-transparent hover:border-primary/20"
                onClick={() => setSelectedModule(mod.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{mod.label}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">{mod.summary}</CardDescription>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <p className="text-xs text-muted-foreground">
                    {mod.sections.length} {mod.sections.length === 1 ? "sección" : "secciones"} de contenido
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8">
          <Button variant="outline" onClick={() => { setSelectedRole(null); setSelectedModule(null); }} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Cambiar perfil
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GuiaUsuario;
