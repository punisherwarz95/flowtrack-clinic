import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowLeft, ChevronDown, ChevronRight, Monitor, Stethoscope, Syringe, Heart,
  LayoutDashboard, Users, GitBranch, CheckCircle2, XCircle, Building2, Grid3X3,
  FlaskConical, FileText, Tv, Settings, ClipboardList, Lightbulb, Info, AlertTriangle,
  Search, Calendar, Play, RotateCcw, Clock, UserCheck, MousePointer, Check, X,
  RefreshCw, Plus, Pencil, Trash2, Eye, BarChart3, Upload, DollarSign, ShieldCheck,
  Activity, MessageSquare, FileWarning, Timer, Mic, QrCode, Download, Copy, List,
} from "lucide-react";

// ── Roles ──
const roles = [
  {
    id: "recepcion",
    label: "Recepción",
    icon: Monitor,
    gradient: "from-blue-500 to-cyan-500",
    description: "Gestión integral del flujo de pacientes, registro, configuración del sistema y administración.",
    modules: ["dashboard", "pacientes", "flujo", "completados", "incompletos", "empresas", "boxes", "examenes", "documentos", "pantalla-tv", "cotizaciones", "prestadores", "usuarios", "configuracion", "actividad-log"],
  },
  {
    id: "clinico",
    label: "Clínico",
    icon: Stethoscope,
    gradient: "from-emerald-500 to-teal-500",
    description: "Atención de pacientes en box, registro de resultados y formularios de exámenes.",
    modules: ["dashboard", "mi-box"],
  },
  {
    id: "enfermera",
    label: "Enfermera",
    icon: Syringe,
    gradient: "from-purple-500 to-pink-500",
    description: "Toma de muestras, registro de resultados y seguimiento de exámenes pendientes.",
    modules: ["dashboard", "mi-box", "completados", "incompletos"],
  },
  {
    id: "medico",
    label: "Médico",
    icon: Heart,
    gradient: "from-rose-500 to-orange-500",
    description: "Evaluación médica de aptitud, revisión de resultados y dictámenes.",
    modules: ["dashboard", "mi-box", "evaluacion-medica"],
  },
];

// ── Annotation component ──
const Annotation = ({ number, children, type = "info" }: { number?: number; children: React.ReactNode; type?: "info" | "action" | "tip" | "warning" }) => {
  const colors = {
    info: "bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200",
    action: "bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200",
    tip: "bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200",
    warning: "bg-red-100 dark:bg-red-950 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200",
  };
  const icons = {
    info: <Info className="h-4 w-4 shrink-0" />,
    action: <MousePointer className="h-4 w-4 shrink-0" />,
    tip: <Lightbulb className="h-4 w-4 shrink-0" />,
    warning: <AlertTriangle className="h-4 w-4 shrink-0" />,
  };
  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${colors[type]} my-3`}>
      {number !== undefined ? (
        <span className="w-6 h-6 rounded-full bg-current/10 flex items-center justify-center text-xs font-bold shrink-0">{number}</span>
      ) : icons[type]}
      <div className="flex-1">{children}</div>
    </div>
  );
};

// ── Mock UI wrapper ──
const MockScreen = ({ title, children, caption }: { title: string; children: React.ReactNode; caption?: string }) => (
  <div className="my-6">
    <div className="border-2 border-border rounded-xl overflow-hidden shadow-lg">
      <div className="bg-muted/50 border-b px-4 py-2 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <span className="text-xs text-muted-foreground font-medium ml-2">{title}</span>
      </div>
      <div className="bg-background p-4 overflow-x-auto">{children}</div>
    </div>
    {caption && <p className="text-xs text-muted-foreground mt-2 text-center italic">{caption}</p>}
  </div>
);

// ══════════════════════════════════════════════
//   MODULE GUIDES
// ══════════════════════════════════════════════

// ─── 1. DASHBOARD ───
const DashboardGuide = ({ role }: { role: string }) => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">¿Qué es el Dashboard?</h3>
      <p className="text-muted-foreground">Pantalla principal que muestra el estado del centro en tiempo real. Se auto-refresca cada 30 segundos.</p>
    </div>

    {/* 1.1 Stats cards */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">1</span>
        Estadísticas Diarias
      </h4>
      <p className="text-sm text-muted-foreground mb-2">Sección con selector de fecha independiente. Cada tarjeta muestra desglose WM (WorkMed) y J (Jenner).</p>
      <MockScreen title="Dashboard — Estadísticas Diarias" caption="Las tarjetas muestran el resumen del día. Se actualizan automáticamente cada 30 segundos.">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-1 pt-3 px-3"><p className="text-xs text-muted-foreground">Total Pacientes</p></CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-2xl font-bold">24</div>
              <div className="text-xs text-muted-foreground mt-1">WM: 15 | J: 09</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-1 pt-3 px-3"><p className="text-xs text-muted-foreground">En Espera</p></CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-2xl font-bold">8</div>
              <div className="text-xs text-muted-foreground mt-1">WM: 05 | J: 03</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-1 pt-3 px-3"><p className="text-xs text-muted-foreground">En Atención</p></CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-2xl font-bold">4</div>
              <div className="text-xs text-muted-foreground mt-1">WM: 03 | J: 01</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-1 pt-3 px-3"><p className="text-xs text-muted-foreground">Completados</p></CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-2xl font-bold">12</div>
              <div className="text-xs text-muted-foreground mt-1">WM: 07 | J: 05</div>
            </CardContent>
          </Card>
        </div>
      </MockScreen>
      <Annotation type="info"><strong>Total Pacientes</strong> = suma de en espera + en atención + completados para la fecha seleccionada.</Annotation>
    </div>

    {/* 1.1b Exámenes del día por box */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">2</span>
        Exámenes del Día por Box
      </h4>
      <MockScreen title="Dashboard — Exámenes por Box" caption="Cada tarjeta muestra completados/asignados. El badge se pone verde cuando todos están completos.">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { box: "Box 201 - Lab", exams: [{ n: "Hemograma", c: 8, t: 12 }, { n: "Orina", c: 6, t: 10 }] },
            { box: "Box 202 - Audio", exams: [{ n: "Audiometría", c: 10, t: 10 }] },
            { box: "Box 203 - Espiro", exams: [{ n: "Espirometría", c: 5, t: 8 }, { n: "Rx Tórax", c: 3, t: 8 }] },
          ].map((b) => (
            <Card key={b.box} className="p-3">
              <p className="text-xs font-semibold mb-2">{b.box}</p>
              {b.exams.map((e) => (
                <div key={e.n} className="flex items-center justify-between text-xs mb-1">
                  <span>{e.n}</span>
                  <Badge className={`text-xs ${e.c === e.t ? "bg-green-100 text-green-800 border-green-300" : "bg-muted"}`}>{e.c}/{e.t}</Badge>
                </div>
              ))}
            </Card>
          ))}
        </div>
      </MockScreen>
    </div>

    {/* 1.2 Monthly stats */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">3</span>
        Estadísticas Mensuales
      </h4>
      <p className="text-sm text-muted-foreground mb-2">Sección con selector de mes y año independiente. Incluye filtros por Prestador o por Box (excluyentes).</p>
      <MockScreen title="Dashboard — Estadísticas Mensuales">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-3 pb-3 px-3">
              <p className="text-xs text-muted-foreground">Total Pacientes Mes</p>
              <div className="text-2xl font-bold">342</div>
              <p className="text-xs text-muted-foreground">WM: 198 | J: 144</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-3 pb-3 px-3">
              <p className="text-xs text-muted-foreground">Exámenes Realizados Mes</p>
              <div className="text-2xl font-bold">1.847</div>
              <p className="text-xs text-muted-foreground">Usa paginación interna (>1000)</p>
            </CardContent>
          </Card>
        </div>
        <div className="flex gap-2 mb-3">
          <Select defaultValue="all">
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Filtrar por..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Vista global</SelectItem>
              <SelectItem value="prest">Por Prestador</SelectItem>
              <SelectItem value="box">Por Box</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["Hemograma 120/130", "Audiometría 98/105", "Espirometría 85/90", "ECG 78/80", "Orina 110/115", "Rx Tórax 60/65"].map((e) => (
            <div key={e} className="text-xs p-2 bg-muted/50 rounded">{e}</div>
          ))}
        </div>
      </MockScreen>
      <Annotation type="info">Al seleccionar <strong>Prestador</strong>, solo muestra exámenes vinculados a ese prestador. Al seleccionar <strong>Box</strong>, solo exámenes de ese box.</Annotation>
    </div>

    {/* 1.3 Tabla de pacientes */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">4</span>
        Tabla de Pacientes del Día con Filtros Dinámicos
      </h4>
      <MockScreen title="Dashboard — Tabla de Pacientes Ingresados" caption="Los filtros interactúan entre sí: al cambiar uno, los demás se actualizan mostrando solo opciones relevantes.">
        <div className="flex flex-wrap gap-2 mb-4">
          <Input placeholder="🔍 Buscar por nombre..." className="h-8 text-xs flex-1 min-w-[150px]" readOnly />
          <Select defaultValue="all">
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Empresa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="e1">Minera Los Andes</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue placeholder="Servicio" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="wm">WM</SelectItem>
              <SelectItem value="j">J</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Box" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="201">Box 201</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Examen" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="hemo">Hemograma</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-3 mb-4 flex-wrap">
          <Label className="flex items-center gap-1.5 text-xs cursor-pointer"><Checkbox defaultChecked /><span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> Pendiente</Label>
          <Label className="flex items-center gap-1.5 text-xs cursor-pointer"><Checkbox defaultChecked /><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> Muestra</Label>
          <Label className="flex items-center gap-1.5 text-xs cursor-pointer"><Checkbox defaultChecked /><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Completado</Label>
          <Label className="flex items-center gap-1.5 text-xs cursor-pointer"><Checkbox defaultChecked /><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Incompleto</Label>
          <Separator orientation="vertical" className="h-4" />
          <Label className="flex items-center gap-1.5 text-xs cursor-pointer"><Checkbox /> Completado (atención)</Label>
          <Label className="flex items-center gap-1.5 text-xs cursor-pointer"><Checkbox defaultChecked /> Listo</Label>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">N°</TableHead>
              <TableHead className="text-xs">Paciente</TableHead>
              <TableHead className="text-xs">Tipo</TableHead>
              <TableHead className="text-xs">Empresa</TableHead>
              <TableHead className="text-xs">Box Actual</TableHead>
              <TableHead className="text-xs">Exámenes</TableHead>
              <TableHead className="text-xs">⏱</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="text-xs font-mono">01</TableCell>
              <TableCell className="text-xs font-medium">Juan Pérez López</TableCell>
              <TableCell><Badge className="text-xs bg-blue-100 text-blue-800 border-blue-300">WM</Badge></TableCell>
              <TableCell className="text-xs">Minera Los Andes</TableCell>
              <TableCell className="text-xs">Box 201</TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">Hemograma</Badge>
                  <Badge className="text-xs bg-green-100 text-green-800 border-green-300">Audiometría</Badge>
                  <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-300">Orina</Badge>
                </div>
              </TableCell>
              <TableCell><Badge variant="outline" className="text-xs"><Timer className="h-3 w-3 mr-1" />04:32</Badge></TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-xs font-mono">02</TableCell>
              <TableCell className="text-xs font-medium">María González</TableCell>
              <TableCell><Badge className="text-xs bg-amber-100 text-amber-800 border-amber-300">J</Badge></TableCell>
              <TableCell className="text-xs">Constructora Bío-Bío</TableCell>
              <TableCell className="text-xs">—</TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  <Badge className="text-xs bg-green-100 text-green-800 border-green-300">ECG</Badge>
                  <Badge className="text-xs bg-red-100 text-red-800 border-red-300">Rx Tórax</Badge>
                </div>
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </MockScreen>
      <Annotation type="tip"><strong>Filtros dinámicos:</strong> Al filtrar por examen, aparecen contadores: "X completados | Y pendientes | Z total". Los dropdowns se actualizan mutuamente.</Annotation>
      <Annotation type="info">Los <strong>checkboxes de color</strong> permiten mostrar/ocultar exámenes según su estado. Desactive "Completado" (verde) para ver solo los pendientes.</Annotation>
      <Annotation type="info">La columna <strong>⏱ Timer</strong> muestra la cuenta regresiva del temporizador de presión arterial cuando aplica.</Annotation>
      {role === "clinico" && <Annotation type="tip"><strong>Uso sugerido:</strong> Filtre por su box para ver rápidamente cuántos pacientes tiene pendientes.</Annotation>}
      {role === "medico" && <Annotation type="tip"><strong>Uso sugerido:</strong> Filtre por exámenes completados (verde) para identificar pacientes listos para evaluación.</Annotation>}
    </div>

    {/* 1.4 Historical search */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">5</span>
        Búsqueda Historial de Pacientes
      </h4>
      <p className="text-sm text-muted-foreground mb-2">Campo de búsqueda por nombre o RUT. Muestra historial de atenciones previas del paciente encontrado.</p>
      <MockScreen title="Dashboard — Búsqueda Histórica">
        <div className="flex gap-2 mb-3">
          <Input placeholder="Buscar paciente por nombre o RUT..." className="text-sm" readOnly />
          <Button size="sm" variant="outline"><Search className="h-4 w-4" /></Button>
        </div>
        <div className="text-xs text-muted-foreground text-center py-4">Ingrese un nombre o RUT para buscar en el historial completo</div>
      </MockScreen>
    </div>
  </div>
);

// ─── 2. PACIENTES ───
const PacientesGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Módulo de Pacientes</h3>
      <p className="text-muted-foreground">Módulo central para el registro e ingreso de pacientes. Tiene 4 pestañas principales.</p>
    </div>

    <MockScreen title="Pacientes — Pestañas disponibles">
      <Tabs defaultValue="pacientes" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="pacientes" className="text-xs gap-1"><Users className="h-3 w-3" /> Pacientes del Día</TabsTrigger>
          <TabsTrigger value="prereservas" className="text-xs gap-1"><Calendar className="h-3 w-3" /> Pre-Reservas</TabsTrigger>
          <TabsTrigger value="codigo" className="text-xs gap-1"><Clock className="h-3 w-3" /> Código del Día</TabsTrigger>
          <TabsTrigger value="agenda" className="text-xs gap-1"><Calendar className="h-3 w-3" /> Agenda Diferida</TabsTrigger>
        </TabsList>
      </Tabs>
    </MockScreen>

    {/* 2.1 Registration form */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">1</span>
        Registrar un Nuevo Paciente
      </h4>
      <MockScreen title="Pacientes — Formulario de Ingreso" caption="Complete los datos del paciente. Al seleccionar empresa se cargan faenas; al seleccionar faena se filtran baterías.">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div><Label className="text-xs">Nombre completo *</Label><Input className="h-8 text-xs" defaultValue="Juan Pérez López" readOnly /></div>
            <div><Label className="text-xs">RUT</Label><Input className="h-8 text-xs" defaultValue="12.345.678-9" readOnly /></div>
            <div>
              <Label className="text-xs">Tipo de Servicio *</Label>
              <Select defaultValue="workmed">
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="workmed">Workmed</SelectItem><SelectItem value="jenner">Jenner</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Empresa</Label><Input className="h-8 text-xs" defaultValue="Minera Los Andes" readOnly /></div>
            <div>
              <Label className="text-xs">Faena</Label>
              <Select defaultValue="f1">
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="f1">Faena Principal</SelectItem><SelectItem value="f2">Faena Norte</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Cargo</Label><Input className="h-8 text-xs" placeholder="Cargo del trabajador" readOnly /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Email</Label><Input className="h-8 text-xs" placeholder="email@..." readOnly /></div>
              <div><Label className="text-xs">Teléfono</Label><Input className="h-8 text-xs" placeholder="+56 9..." readOnly /></div>
            </div>
            <div><Label className="text-xs">Fecha Nacimiento</Label><Input className="h-8 text-xs" type="date" readOnly /></div>
            <div><Label className="text-xs">Dirección</Label><Input className="h-8 text-xs" placeholder="Dirección..." readOnly /></div>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold">Baterías de Exámenes</Label>
              <Input className="h-7 text-xs mb-1" placeholder="🔍 Filtrar baterías..." readOnly />
              <div className="border rounded-lg p-2 space-y-1.5 mt-1">
                <Label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox defaultChecked /> Pre-Ocupacional Altura</Label>
                <Label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox /> Ocupacional Estándar</Label>
                <Label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox /> Control Periódico</Label>
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Exámenes Adicionales</Label>
              <Input className="h-7 text-xs mb-1" placeholder="🔍 Filtrar exámenes..." readOnly />
              <div className="border rounded-lg p-2 space-y-1.5 mt-1">
                <Label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox /> Test de Drogas</Label>
                <Label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox defaultChecked /> Electrocardiograma</Label>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Si hay faena seleccionada, muestra solo exámenes vinculados a esa faena.</p>
            </div>
            <Button className="w-full h-9 text-sm gap-2 mt-2" disabled><Plus className="h-4 w-4" /> Ingresar Paciente</Button>
            <Separator />
            <Button variant="outline" className="w-full h-8 text-xs gap-1" disabled><Upload className="h-3 w-3" /> Pegar texto WorkMed</Button>
          </div>
        </div>
      </MockScreen>
      <Annotation type="action" number={1}>Complete los campos. El <strong>Nombre</strong> y <strong>Tipo Servicio</strong> son obligatorios.</Annotation>
      <Annotation type="action" number={2}>Seleccione las <strong>baterías</strong> correspondientes. Las baterías se filtran por faena seleccionada.</Annotation>
      <Annotation type="action" number={3}>Opcionalmente agregue <strong>exámenes individuales</strong> adicionales.</Annotation>
      <Annotation type="action" number={4}>Presione <strong>"Ingresar Paciente"</strong>. El sistema: crea/busca paciente por RUT, crea atención con estado <code>en_espera</code>, registra baterías y exámenes, genera documentos automáticos y asigna número de ingreso correlativo.</Annotation>
      <Annotation type="tip"><strong>Pegar texto WorkMed:</strong> Parsea automáticamente nombre, RUT, empresa, cargo, fecha nacimiento y dirección desde el portapapeles.</Annotation>
    </div>

    {/* 2.1b Patient list */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">2</span>
        Lista de Pacientes del Día
      </h4>
      <MockScreen title="Pacientes — Lista del Día">
        <div className="flex gap-2 mb-3">
          <Input placeholder="🔍 Buscar por nombre o RUT..." className="h-8 text-xs flex-1" readOnly />
          <Button variant="outline" size="sm" className="text-xs gap-1"><Calendar className="h-3 w-3" /> Hoy</Button>
        </div>
        <div className="space-y-2">
          {[
            { n: "01", nombre: "Juan Pérez López", rut: "12.345.678-9", tipo: "WM", warn: false, docs: "3/3" },
            { n: "02", nombre: "PENDIENTE DE REGISTRO", rut: "9.876.543-2", tipo: "J", warn: true, docs: "1/3" },
          ].map((p) => (
            <Card key={p.n} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground">{p.n}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{p.nombre}</span>
                      {p.warn && <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-300"><AlertTriangle className="h-3 w-3 mr-1" />Datos incompletos</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">{p.rut}</span>
                  </div>
                  <Badge className="text-xs" variant="outline">{p.tipo}</Badge>
                  <Badge variant="outline" className="text-xs"><FileText className="h-3 w-3 mr-1" />{p.docs}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Pencil className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Eye className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </MockScreen>
      <Annotation type="info"><strong>Badge "Datos incompletos"</strong>: Aparece si el nombre es "PENDIENTE DE REGISTRO" o falta fecha nacimiento, email o teléfono.</Annotation>
      <Annotation type="info"><strong>Badge documentos</strong>: Muestra cantidad de documentos completados vs total asignado.</Annotation>
    </div>

    {/* 2.2 Pre-reservas */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">3</span>
        Pre-Reservas
      </h4>
      <p className="text-sm text-muted-foreground mb-2">Gestión de pacientes agendados por empresas desde el portal.</p>
      <MockScreen title="Pacientes — Pre-Reservas">
        <div className="flex gap-2 mb-3">
          <Button variant="outline" size="sm" className="text-xs gap-1"><Calendar className="h-3 w-3" /> 10/03/2026</Button>
          <Select defaultValue="all"><SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Empresa" /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem></SelectContent></Select>
          <Select defaultValue="pendiente"><SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendiente">Pendiente</SelectItem><SelectItem value="confirmada">Confirmada</SelectItem><SelectItem value="rechazada">Rechazada</SelectItem></SelectContent></Select>
        </div>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Carlos Muñoz</span>
              <span className="text-xs text-muted-foreground ml-2">15.678.901-K · Bloque Mañana · Minera Los Andes</span>
            </div>
            <div className="flex gap-1">
              <Button size="sm" className="h-7 text-xs gap-1"><Check className="h-3 w-3" /> Confirmar</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive"><X className="h-3 w-3" /> Rechazar</Button>
            </div>
          </div>
          <div className="flex gap-1 mt-2">
            <Badge variant="outline" className="text-xs">Pre-Ocupacional Altura</Badge>
            <Badge variant="outline" className="text-xs">Electrocardiograma</Badge>
          </div>
        </Card>
      </MockScreen>
      <Annotation type="action"><strong>Confirmar:</strong> Convierte la pre-reserva en atención activa (crea paciente + atención + exámenes automáticamente).</Annotation>
    </div>

    {/* 2.3 Código del día */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">4</span>
        Código del Día
      </h4>
      <MockScreen title="Pacientes — Código del Día">
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-2">Código activo del día</p>
          <div className="text-4xl font-mono font-bold text-primary tracking-widest">A7X3</div>
          <p className="text-xs text-muted-foreground mt-2">Se renueva automáticamente según hora configurada</p>
          <Button variant="outline" size="sm" className="mt-3 text-xs" disabled><RefreshCw className="h-3 w-3 mr-1" /> Generar nuevo</Button>
        </div>
      </MockScreen>
      <Annotation type="info">El código permite a los pacientes completar datos desde el <strong>Portal Paciente</strong> (<code>/portal</code>) ingresando código + RUT.</Annotation>
    </div>

    {/* 2.4 Agenda diferida */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">5</span>
        Agenda Diferida
      </h4>
      <p className="text-sm text-muted-foreground mb-2">Pacientes agendados con fecha programada futura.</p>
      <MockScreen title="Pacientes — Agenda Diferida">
        <div className="flex gap-2 mb-3">
          <Select defaultValue="pendiente"><SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendiente">Pendiente</SelectItem><SelectItem value="vinculado">Vinculado</SelectItem></SelectContent></Select>
          <Button size="sm" className="text-xs gap-1"><Plus className="h-3 w-3" /> Nueva agenda</Button>
        </div>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Ana Soto</span>
              <span className="text-xs text-muted-foreground ml-2">· Programada: 15/03/2026 · Minera Los Andes</span>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"><Play className="h-3 w-3" /> Vincular</Button>
          </div>
        </Card>
      </MockScreen>
      <Annotation type="action"><strong>Vincular:</strong> Cuando el paciente llega, se vincula a una atención activa creando el ingreso automáticamente con sus baterías y exámenes.</Annotation>
    </div>
  </div>
);

// ─── 3. FLUJO ───
const FlujoGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Módulo de Flujo</h3>
      <p className="text-muted-foreground">Controla el flujo de pacientes entre boxes. Tiene canal Realtime + auto-refresh cada 30 segundos.</p>
    </div>

    {/* 3.1 En espera */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">1</span>
        Sección "En Espera"
      </h4>
      <MockScreen title="Flujo — En Espera" caption="Pacientes con estado en_espera. Se puede filtrar por box.">
        <div className="flex gap-2 mb-4">
          <Select defaultValue="todos">
            <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Filtrar Box" /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Todos los boxes</SelectItem><SelectItem value="201">Box 201</SelectItem></SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="text-xs gap-1"><Calendar className="h-3 w-3" /> Hoy</Button>
          <Button variant="outline" size="sm" className="text-xs gap-1"><RefreshCw className="h-3 w-3" /></Button>
        </div>
        <Card className="border-l-4 border-l-yellow-400 mb-3">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded">01</span>
                <span className="text-sm font-medium">Juan Pérez López</span>
                <span className="text-xs text-muted-foreground">12.345.678-9</span>
                <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-300">WM</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Select defaultValue=""><SelectTrigger className="w-[120px] h-7 text-xs"><SelectValue placeholder="Asignar box..." /></SelectTrigger><SelectContent><SelectItem value="201">Box 201</SelectItem><SelectItem value="202">Box 202</SelectItem></SelectContent></Select>
                <Button size="sm" className="h-7 text-xs gap-1"><Play className="h-3 w-3" /> Llamar</Button>
              </div>
            </div>
            <div className="flex gap-1 flex-wrap mb-2">
              <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">Hemograma</Badge>
              <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">Audiometría</Badge>
              <Badge className="text-xs bg-green-100 text-green-800 border-green-300">ECG ✓</Badge>
              <Badge className="text-xs bg-red-100 text-red-800 border-red-300">Orina (I)</Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Docs: <Badge variant="outline" className="text-xs">1/3</Badge></span>
              <span>Boxes pendientes: <Badge variant="outline" className="text-xs">201</Badge> <Badge variant="outline" className="text-xs">203</Badge></span>
              <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> <Badge variant="outline" className="text-xs">04:32</Badge></span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Estado ficha:</span>
              <Label className="flex items-center gap-1 text-xs"><Checkbox /> Pendiente</Label>
              <Label className="flex items-center gap-1 text-xs"><Checkbox defaultChecked /> En mano</Label>
              <Label className="flex items-center gap-1 text-xs"><Checkbox /> Completada</Label>
            </div>
          </CardContent>
        </Card>
      </MockScreen>
      <Annotation type="action"><strong>Llamar:</strong> Seleccione el box y presione "Llamar". Usa bloqueo optimista: si otro box lo llamó primero, muestra error con overlay oscuro.</Annotation>
      <Annotation type="info"><strong>"(I)"</strong> junto a un examen indica que fue marcado como incompleto previamente.</Annotation>
    </div>

    {/* 3.2 En atención */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">2</span>
        Sección "En Atención"
      </h4>
      <MockScreen title="Flujo — En Atención" caption="Pacientes actualmente en un box.">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded">02</span>
                <span className="text-sm font-medium">María González</span>
                <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-300">En Box 201</Badge>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1"><RotateCcw className="h-3 w-3" /> Devolver</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1"><CheckCircle2 className="h-3 w-3" /> Completar</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive"><XCircle className="h-3 w-3" /> Incompleto</Button>
              </div>
            </div>
            <div className="flex gap-1 flex-wrap">
              <Label className="flex items-center gap-1 text-xs cursor-pointer"><Checkbox /> <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">Espirometría</Badge></Label>
              <Label className="flex items-center gap-1 text-xs cursor-pointer"><Checkbox defaultChecked /> <Badge className="text-xs bg-green-100 text-green-800 border-green-300">Audiometría ✓</Badge></Label>
            </div>
            <div className="mt-2">
              <Button size="sm" variant="outline" className="h-6 text-xs" disabled>Guardar seleccionados</Button>
            </div>
          </CardContent>
        </Card>
      </MockScreen>
      <Annotation type="action"><strong>Guardar seleccionados:</strong> Marca los exámenes con checkbox como completados sin finalizar la atención.</Annotation>
      <Annotation type="action"><strong>Completar ✓:</strong> Completa TODOS los exámenes del box. Si quedan exámenes en otros boxes, devuelve a espera; si no, finaliza la atención.</Annotation>
      <Annotation type="action"><strong>Incompleto ✗:</strong> Marca los exámenes como incompletos. Misma lógica de verificación de otros boxes.</Annotation>
      <Annotation type="action"><strong>Devolver:</strong> Devuelve a la cola sin modificar exámenes.</Annotation>
    </div>

    {/* 3.3 Completar diálogo */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">3</span>
        Diálogo de Confirmación al Completar
      </h4>
      <MockScreen title="Flujo — ¿Completar atención?">
        <Card className="p-4 border-2 border-amber-300">
          <p className="text-sm font-medium mb-2">⚠ Este paciente tiene exámenes pendientes en otros boxes:</p>
          <div className="flex gap-1 mb-3">
            <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">Rx Tórax (Box 203)</Badge>
            <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">ECG (Box 204)</Badge>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-xs" disabled>Devolver a espera</Button>
            <Button size="sm" className="text-xs bg-amber-600" disabled>Forzar completar</Button>
          </div>
        </Card>
      </MockScreen>
      <Annotation type="warning">Si quedan exámenes en otros boxes, el sistema pregunta si desea devolver a espera o forzar el completado.</Annotation>
    </div>

    <Annotation type="info"><strong>Chat Global</strong> disponible en la esquina inferior para comunicación en tiempo real con el equipo.</Annotation>
    <Annotation type="info"><strong>Actualización:</strong> Canal Realtime en tablas <code>atenciones</code>, <code>atencion_examenes</code> y <code>pacientes</code> + auto-refresh cada 30s.</Annotation>
  </div>
);

// ─── 4. MI BOX ───
const MiBoxGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Mi Box</h3>
      <p className="text-muted-foreground">Módulo principal para atención directa. Gestiona cola, formularios y resultados. Realtime + refresh cada 10 segundos.</p>
    </div>

    {/* 4.1 Box selection */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">1</span>
        Selección de Box
      </h4>
      <MockScreen title="Mi Box — Seleccionar Box">
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-3">Seleccione su box de trabajo</p>
          <Select defaultValue=""><SelectTrigger className="w-[200px] mx-auto"><SelectValue placeholder="Seleccionar box..." /></SelectTrigger><SelectContent><SelectItem value="201">Box 201 - Laboratorio</SelectItem><SelectItem value="202">Box 202 - Audiometría</SelectItem></SelectContent></Select>
          <Button className="mt-3" disabled>Confirmar Box</Button>
        </div>
      </MockScreen>
      <Annotation type="info">Se guarda en <code>localStorage</code> para persistir entre sesiones. Botón "Cambiar Box" disponible siempre.</Annotation>
    </div>

    {/* 4.2 Modo de llamado */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">2</span>
        Modo de Llamado
      </h4>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Modo Individual (por defecto)</p>
            <p className="text-xs text-muted-foreground">Al llamar, cambia automáticamente a pestaña "Atención"</p>
          </div>
          <Switch />
        </div>
        <Separator className="my-3" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Modo Múltiple</p>
            <p className="text-xs text-muted-foreground">Permite llamar varios pacientes sin cambiar de pestaña</p>
          </div>
          <Switch defaultChecked />
        </div>
      </Card>
    </div>

    {/* 4.3 Pestañas */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">3</span>
        Pestaña "Cola" — Pacientes en Espera
      </h4>
      <MockScreen title="Mi Box — Box 201 Laboratorio" caption="Solo muestra pacientes con exámenes pendientes para ESTE box.">
        <Tabs defaultValue="cola" className="w-full">
          <TabsList className="mb-3">
            <TabsTrigger value="cola" className="text-xs gap-1"><Clock className="h-3 w-3" /> Cola (5)</TabsTrigger>
            <TabsTrigger value="atencion" className="text-xs gap-1"><UserCheck className="h-3 w-3" /> En Atención</TabsTrigger>
            <TabsTrigger value="completados" className="text-xs gap-1"><Check className="h-3 w-3" /> Completados (8)</TabsTrigger>
          </TabsList>
          <TabsContent value="cola">
            <div className="space-y-2">
              {[
                { n: "01", nombre: "Juan Pérez López", rut: "12.345.678-9", tipo: "WM", empresa: "Minera Los Andes", exams: ["Hemograma", "Orina"], timer: "04:32" },
                { n: "03", nombre: "Carlos Muñoz", rut: "15.678.901-K", tipo: "WM", empresa: "Minera Los Andes", exams: ["Hemograma"], timer: null },
              ].map((p) => (
                <Card key={p.n} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{p.n}</span>
                      <div>
                        <span className="text-sm font-medium">{p.nombre}</span>
                        <span className="text-xs text-muted-foreground ml-2">{p.rut}</span>
                      </div>
                      <Badge className="text-xs" variant="outline">{p.tipo}</Badge>
                      <span className="text-xs text-muted-foreground">{p.empresa}</span>
                      {p.timer && <Badge variant="outline" className="text-xs"><Timer className="h-3 w-3 mr-1" />{p.timer}</Badge>}
                    </div>
                    <Button size="sm" className="h-7 text-xs gap-1"><Play className="h-3 w-3" /> Llamar</Button>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {p.exams.map((e) => <Badge key={e} className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">{e}</Badge>)}
                  </div>
                </Card>
              ))}
            </div>
            <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
              <Badge variant="outline" className="text-xs">👥 2 en otros boxes con exámenes pendientes aquí</Badge>
            </div>
          </TabsContent>
        </Tabs>
      </MockScreen>
      <Annotation type="info">Usa <strong>Optimistic UI</strong>: mueve el paciente visualmente antes de confirmar con el servidor.</Annotation>
    </div>

    {/* 4.3b Paciente en atención */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">4</span>
        Pestaña "Atención" — Formularios de Examen
      </h4>
      <MockScreen title="Mi Box — Paciente en Atención" caption="Panel izquierdo: lista de pacientes. Panel derecho: detalle del seleccionado con formularios expandibles.">
        <div className="space-y-4">
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div>
                <p className="font-semibold">Juan Pérez López</p>
                <p className="text-xs text-muted-foreground">12.345.678-9 · 35 años · Minera Los Andes · WM</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Estado ficha:</span>
              <Label className="flex items-center gap-1 text-xs"><Checkbox /> Pendiente</Label>
              <Label className="flex items-center gap-1 text-xs"><Checkbox defaultChecked /> En mano</Label>
            </div>
          </div>

          {/* Exam form expanded */}
          <Card>
            <CardHeader className="py-3 px-4 cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">Pendiente</Badge>
                  <span className="font-medium text-sm">Hemograma</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Tipos de campo soportados: texto, texto largo, checkbox, select, radio, fecha, firma digital, audiometría.</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div><Label className="text-xs">Glóbulos Blancos</Label><Input className="h-7 text-xs" placeholder="Valor..." readOnly /></div>
                <div><Label className="text-xs">Glóbulos Rojos</Label><Input className="h-7 text-xs" placeholder="Valor..." readOnly /></div>
                <div><Label className="text-xs">Hemoglobina</Label><Input className="h-7 text-xs" placeholder="Valor..." readOnly /></div>
                <div><Label className="text-xs">Hematocrito</Label><Input className="h-7 text-xs" placeholder="Valor..." readOnly /></div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="text-xs gap-1 bg-green-600 hover:bg-green-700" disabled><CheckCircle2 className="h-3 w-3" /> Completado</Button>
                <Button size="sm" variant="outline" className="text-xs gap-1 text-blue-600" disabled><Clock className="h-3 w-3" /> Muestra Tomada</Button>
                <Button size="sm" variant="outline" className="text-xs gap-1 text-red-600" disabled><XCircle className="h-3 w-3" /> Incompleto</Button>
              </div>
            </CardContent>
          </Card>

          {/* Resultados otros boxes */}
          <Card className="bg-muted/20">
            <CardHeader className="py-2 px-4"><CardTitle className="text-xs text-muted-foreground">Resultados de Otros Boxes (solo lectura)</CardTitle></CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-xs">
                <span className="font-medium">Audiometría (Box 202):</span> Normal bilateral
              </div>
            </CardContent>
          </Card>

          {/* Timer presión */}
          <Card className="border border-amber-300 bg-amber-50 dark:bg-amber-950">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2 text-sm">
                <Timer className="h-4 w-4 text-amber-600" />
                <span className="font-medium">Temporizador Presión Arterial</span>
                <Badge className="text-xs bg-amber-200 text-amber-800">04:32 restantes</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Al expirar, permite tomar nueva medición con formulario de retoma.</p>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="text-xs gap-1" disabled><FileText className="h-3 w-3" /> Documentos</Button>
            <Button variant="outline" className="text-xs gap-1" disabled><RotateCcw className="h-3 w-3" /> Liberar</Button>
            <Button className="text-xs gap-1" disabled><CheckCircle2 className="h-3 w-3" /> Completar</Button>
            <Button variant="outline" className="text-xs gap-1 text-destructive" disabled><XCircle className="h-3 w-3" /> Incompleto</Button>
          </div>
        </div>
      </MockScreen>
      <Annotation type="action" number={1}>Complete los <strong>campos del formulario</strong> de cada examen (expandibles).</Annotation>
      <Annotation type="action" number={2}>Marque cada examen: <strong>✅ Completado</strong>, <strong>🔵 Muestra Tomada</strong> o <strong>❌ Incompleto</strong>.</Annotation>
      <Annotation type="action" number={3}><strong>"Documentos"</strong> abre diálogo para ver/completar consentimientos y declaraciones.</Annotation>
      <Annotation type="action" number={4}><strong>"Liberar"</strong> devuelve a la cola. <strong>"Completar"</strong> finaliza si no quedan pendientes.</Annotation>
    </div>

    {/* 4.4 Completados del box */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">5</span>
        Pestaña "Completados"
      </h4>
      <p className="text-sm text-muted-foreground mb-2">Pacientes que ya pasaron por este box hoy. Muestra nombre, RUT, tipo y lista de exámenes realizados en este box.</p>
    </div>

    <Annotation type="info"><strong>Chat Global:</strong> Botón flotante para chat interno entre usuarios del staff en tiempo real.</Annotation>
  </div>
);

// ─── 5. COMPLETADOS ───
const CompletadosGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Completados</h3>
      <p className="text-muted-foreground">Gestión de atenciones finalizadas con 3 pestañas: Completados, Resultados Pendientes y Métricas.</p>
    </div>

    {/* 5.1 Completados */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">1</span>
        Pestaña "Completados"
      </h4>
      <MockScreen title="Completados — Atenciones Finalizadas">
        <Tabs defaultValue="completados" className="w-full">
          <TabsList className="mb-3">
            <TabsTrigger value="completados" className="text-xs">Completados</TabsTrigger>
            <TabsTrigger value="pendientes" className="text-xs">Resultados Pendientes</TabsTrigger>
            <TabsTrigger value="metricas" className="text-xs">Métricas</TabsTrigger>
          </TabsList>
          <TabsContent value="completados">
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-2"><Badge variant="secondary" className="text-xs">WM: 7</Badge><Badge variant="secondary" className="text-xs">J: 5</Badge><Badge className="text-xs">Total: 12</Badge></div>
              <Button variant="outline" size="sm" className="text-xs gap-1"><Calendar className="h-3 w-3" /> Hoy</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">N°</TableHead>
                  <TableHead className="text-xs">Paciente</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Empresa</TableHead>
                  <TableHead className="text-xs">Hora Ingreso</TableHead>
                  <TableHead className="text-xs">Hora Fin</TableHead>
                  <TableHead className="text-xs">Tiempo</TableHead>
                  <TableHead className="text-xs">Exámenes</TableHead>
                  <TableHead className="text-xs">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-xs font-mono">01</TableCell>
                  <TableCell className="text-xs font-medium">Ana Martínez</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">WM</Badge></TableCell>
                  <TableCell className="text-xs">Minera Los Andes</TableCell>
                  <TableCell className="text-xs">08:15</TableCell>
                  <TableCell className="text-xs">10:42</TableCell>
                  <TableCell className="text-xs font-medium">147 min</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Badge className="text-xs bg-green-100 text-green-800 border-green-300">Hemograma ✓</Badge>
                      <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-300">Orina 🔵</Badge>
                    </div>
                  </TableCell>
                  <TableCell><Button size="sm" variant="outline" className="h-7 text-xs gap-1"><RotateCcw className="h-3 w-3" /> Devolver</Button></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </MockScreen>
      <Annotation type="action"><strong>Devolver:</strong> Abre diálogo donde se seleccionan exámenes a revertir a <code>pendiente</code>. La atención vuelve a <code>en_espera</code> con <code>box_id = null</code>.</Annotation>
    </div>

    {/* 5.2 Resultados Pendientes */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">2</span>
        Pestaña "Resultados Pendientes"
      </h4>
      <p className="text-sm text-muted-foreground mb-2">Atenciones completadas que tienen exámenes en estado <code>muestra_tomada</code>. Permite ingresar resultados de laboratorio externo.</p>
      <MockScreen title="Completados — Resultados Pendientes">
        <Card className="p-3 border-l-4 border-l-blue-400">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Juan Pérez</span>
              <span className="text-xs text-muted-foreground ml-2">· 12.345.678-9</span>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs" disabled>Ingresar resultados</Button>
          </div>
          <div className="flex gap-1 mt-2">
            <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-300">Orina 🔵</Badge>
            <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-300">Droga 🔵</Badge>
          </div>
        </Card>
      </MockScreen>
    </div>

    {/* 5.3 Métricas */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">3</span>
        Pestaña "Métricas"
      </h4>
      <p className="text-sm text-muted-foreground mb-2">Cada atención completada con datos detallados, baterías, exámenes y tabla de visitas a boxes.</p>
      <MockScreen title="Completados — Métricas">
        <Card className="p-3">
          <div className="mb-2">
            <span className="text-sm font-medium">Ana Martínez</span>
            <span className="text-xs text-muted-foreground ml-2">· Minera Los Andes · Llegada: 08:15 · Fin: 10:42 · Total: 147 min</span>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-xs">Box</TableHead>
              <TableHead className="text-xs">Instancia</TableHead>
              <TableHead className="text-xs">Entrada</TableHead>
              <TableHead className="text-xs">Salida</TableHead>
              <TableHead className="text-xs">Duración</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="text-xs">Box 201</TableCell>
                <TableCell className="text-xs">#1</TableCell>
                <TableCell className="text-xs">08:20</TableCell>
                <TableCell className="text-xs">08:45</TableCell>
                <TableCell className="text-xs">25 min</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-xs">Box 202</TableCell>
                <TableCell className="text-xs">#1</TableCell>
                <TableCell className="text-xs">08:50</TableCell>
                <TableCell className="text-xs">09:15</TableCell>
                <TableCell className="text-xs">25 min</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </MockScreen>
      <Annotation type="info">Las atenciones anteriores a la activación de trazabilidad muestran "Sin datos de visitas".</Annotation>
    </div>
  </div>
);

// ─── 6. INCOMPLETOS ───
const IncompletosGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Incompletos</h3>
      <p className="text-muted-foreground">Gestión de atenciones que no pudieron completarse. Doble búsqueda: atenciones con estado <code>incompleto</code> + atenciones con exámenes individuales incompletos.</p>
    </div>

    <MockScreen title="Incompletos — Atenciones No Completadas">
      <div className="flex gap-2 mb-3 items-center">
        <Button variant="outline" size="sm" className="text-xs gap-1"><Calendar className="h-3 w-3" /> 01/03 - 10/03</Button>
        <Button variant="ghost" size="sm" className="text-xs">Limpiar (ver todas)</Button>
        <Separator orientation="vertical" className="h-4" />
        <Badge variant="secondary" className="text-xs">WM: 3</Badge>
        <Badge variant="secondary" className="text-xs">J: 2</Badge>
        <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-300">7 exámenes incompletos</Badge>
      </div>
      <div className="space-y-2">
        <Card className="p-3 border-l-4 border-l-red-400">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Pedro Soto</span>
              <span className="text-xs text-muted-foreground ml-2">14.555.666-7 · WM</span>
              <Badge className="text-xs ml-2 bg-red-100 text-red-800">Atención Incompleta</Badge>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"><RotateCcw className="h-3 w-3" /> Reactivar</Button>
          </div>
          <div className="flex gap-1 mt-2">
            <Badge className="text-xs bg-red-100 text-red-800 border-red-300">⚠ Espirometría</Badge>
            <Badge className="text-xs bg-green-100 text-green-800 border-green-300">✓ Hemograma</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Ingreso: 08/03 · Incompleto: 08/03</p>
        </Card>
        <Card className="p-3 border-l-4 border-l-amber-400">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Laura Díaz</span>
              <span className="text-xs text-muted-foreground ml-2">16.789.012-3 · J</span>
              <Badge className="text-xs ml-2 bg-amber-100 text-amber-800">Exámenes Incompletos</Badge>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"><RotateCcw className="h-3 w-3" /> Reactivar</Button>
          </div>
          <div className="flex gap-1 mt-2">
            <Badge className="text-xs bg-red-100 text-red-800 border-red-300">⚠ Rx Tórax</Badge>
            <Badge className="text-xs bg-green-100 text-green-800 border-green-300">✓ ECG</Badge>
            <Badge className="text-xs bg-green-100 text-green-800 border-green-300">✓ Orina</Badge>
          </div>
        </Card>
      </div>
    </MockScreen>
    <Annotation type="action"><strong>Reactivar:</strong> Crea una NUEVA atención con los exámenes incompletos como pendientes. Copia las baterías originales. Genera nuevo número de ingreso para el día actual.</Annotation>
    <Annotation type="info"><strong>"Atención Incompleta"</strong> = estado general incompleto. <strong>"Exámenes Incompletos"</strong> = atención con otro estado pero con exámenes individuales marcados incompletos.</Annotation>
  </div>
);

// ─── 7. BOXES ───
const BoxesGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Boxes</h3>
      <p className="text-muted-foreground">CRUD de consultorios/estaciones de atención. Los boxes inactivos no aparecen en Flujo ni Mi Box.</p>
    </div>
    <MockScreen title="Boxes — Configuración" caption="Grid de tarjetas. Cada tarjeta muestra nombre, descripción y estado activo/inactivo.">
      <div className="flex justify-end mb-3"><Button size="sm" className="text-xs gap-1"><Plus className="h-3 w-3" /> Nuevo Box</Button></div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { name: "201 - Laboratorio", desc: "Hemograma, Orina, Drogas", active: true },
          { name: "202 - Audiometría", desc: "Audiometría tonal", active: true },
          { name: "203 - Espirometría", desc: "Espirometría, ECG", active: true },
          { name: "204 - Rayos X", desc: "Rx Tórax, Columna", active: false },
        ].map((box) => (
          <Card key={box.name} className={`p-3 ${!box.active ? "opacity-50" : ""}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">{box.name}</span>
              <Switch checked={box.active} />
            </div>
            <p className="text-xs text-muted-foreground">{box.desc}</p>
            <div className="flex gap-1 mt-2">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Pencil className="h-3 w-3" /></Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"><Trash2 className="h-3 w-3" /></Button>
            </div>
          </Card>
        ))}
      </div>
    </MockScreen>
    <Annotation type="warning">Boxes inactivos (opacidad reducida) no aparecen en los selectores de Flujo y Mi Box.</Annotation>
    <Annotation type="info">Los exámenes se asignan a boxes desde el módulo de <strong>Exámenes</strong>, no desde aquí.</Annotation>
  </div>
);

// ─── 8. EMPRESAS ───
const EmpresasGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Empresas</h3>
      <p className="text-muted-foreground">Administre empresas cliente con 3 pestañas: Datos Generales, Faenas y Baterías/Precios.</p>
    </div>

    <MockScreen title="Empresas — Lista" caption="Grid de tarjetas con buscador por nombre o RUT.">
      <div className="flex justify-between mb-3">
        <Input placeholder="🔍 Buscar empresa por nombre o RUT..." className="w-[300px] h-8 text-xs" readOnly />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="text-xs gap-1"><Upload className="h-3 w-3" /> Importar CSV</Button>
          <Button size="sm" className="text-xs gap-1"><Plus className="h-3 w-3" /> Nueva Empresa</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Minera Los Andes</p>
              <p className="text-xs text-muted-foreground">76.123.456-7 · Minera Los Andes SpA</p>
              <p className="text-xs text-muted-foreground">contacto@mineraandes.cl · +56 2 2345 6789</p>
            </div>
            <div className="flex gap-1"><Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Pencil className="h-3 w-3" /></Button></div>
          </div>
        </Card>
      </div>
    </MockScreen>

    {/* Tabs inside dialog */}
    <div>
      <h4 className="font-semibold text-foreground mb-3">Diálogo de Empresa (3 pestañas)</h4>
      <MockScreen title="Empresa — Editar">
        <Tabs defaultValue="datos" className="w-full">
          <TabsList className="mb-3">
            <TabsTrigger value="datos" className="text-xs">Datos Generales</TabsTrigger>
            <TabsTrigger value="faenas" className="text-xs">Faenas</TabsTrigger>
            <TabsTrigger value="baterias" className="text-xs">Baterías y Precios</TabsTrigger>
          </TabsList>
          <TabsContent value="datos">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Nombre *</Label><Input className="h-8 text-xs" defaultValue="Minera Los Andes" readOnly /></div>
              <div><Label className="text-xs">RUT</Label><Input className="h-8 text-xs" defaultValue="76.123.456-7" readOnly /></div>
              <div><Label className="text-xs">Razón Social</Label><Input className="h-8 text-xs" defaultValue="Minera Los Andes SpA" readOnly /></div>
              <div><Label className="text-xs">Contacto</Label><Input className="h-8 text-xs" defaultValue="José Pérez" readOnly /></div>
              <div><Label className="text-xs">Email</Label><Input className="h-8 text-xs" defaultValue="contacto@mineraandes.cl" readOnly /></div>
              <div><Label className="text-xs">Teléfono</Label><Input className="h-8 text-xs" readOnly /></div>
              <div><Label className="text-xs">Centro de Costo</Label><Input className="h-8 text-xs" placeholder="Código interno..." readOnly /></div>
            </div>
          </TabsContent>
        </Tabs>
      </MockScreen>
      <Annotation type="info"><strong>Faenas:</strong> Lista de faenas vinculadas a la empresa. Crear, editar, activar/desactivar. Cada faena tiene nombre y dirección.</Annotation>
      <Annotation type="info"><strong>Baterías y Precios:</strong> Muestra baterías vinculadas con precio de venta ($) configurable por empresa.</Annotation>
    </div>
  </div>
);

// ─── 9. EXÁMENES ───
const ExamenesGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Exámenes</h3>
      <p className="text-muted-foreground">Catálogo de exámenes individuales y baterías (paquetes). Incluye formularios configurables y trazabilidad.</p>
    </div>

    {/* 9.1 Exámenes */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">1</span>
        Pestaña "Exámenes"
      </h4>
      <MockScreen title="Exámenes — Lista">
        <div className="flex justify-between mb-3">
          <Input placeholder="🔍 Filtrar exámenes..." className="w-[250px] h-8 text-xs" readOnly />
          <Button size="sm" className="text-xs gap-1"><Plus className="h-3 w-3" /> Nuevo Examen</Button>
        </div>
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-xs">Nombre</TableHead>
            <TableHead className="text-xs">Código</TableHead>
            <TableHead className="text-xs">Duración</TableHead>
            <TableHead className="text-xs">Costo Neto</TableHead>
            <TableHead className="text-xs">Boxes</TableHead>
            <TableHead className="text-xs">Acciones</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="text-xs font-medium">Hemograma</TableCell>
              <TableCell className="text-xs font-mono">HEM-001</TableCell>
              <TableCell className="text-xs">15 min</TableCell>
              <TableCell className="text-xs">$5.000</TableCell>
              <TableCell><Badge variant="outline" className="text-xs">Box 201</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 text-xs" disabled>Formulario</Button>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" disabled>Trazabilidad</Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Pencil className="h-3 w-3" /></Button>
                </div>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-xs font-medium">Audiometría</TableCell>
              <TableCell className="text-xs font-mono">AUD-001</TableCell>
              <TableCell className="text-xs">20 min</TableCell>
              <TableCell className="text-xs">$8.000</TableCell>
              <TableCell><Badge variant="outline" className="text-xs">Box 202</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 text-xs" disabled>Formulario</Button>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" disabled>Trazabilidad</Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Pencil className="h-3 w-3" /></Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </MockScreen>
      <Annotation type="info"><strong>Boxes asignados:</strong> Al crear/editar un examen, se definen los boxes donde se realiza (obligatorio al menos 1).</Annotation>
    </div>

    {/* 9.1b Formulario config */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">2</span>
        Configurar Formulario del Examen
      </h4>
      <MockScreen title="Exámenes — Configurar Formulario" caption="Los campos definidos aquí aparecen en Mi Box al realizar el examen.">
        <p className="text-xs text-muted-foreground mb-3">Tipos de campo disponibles:</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {["Texto", "Texto largo", "Checkbox", "Select", "Radio", "Fecha", "Firma digital", "Audiometría"].map((t) => (
            <Badge key={t} variant="outline" className="text-xs justify-center">{t}</Badge>
          ))}
        </div>
        <div className="space-y-2">
          {[
            { label: "Glóbulos Blancos", tipo: "Texto", req: true, grupo: "Resultados" },
            { label: "Glóbulos Rojos", tipo: "Texto", req: true, grupo: "Resultados" },
            { label: "Observaciones", tipo: "Texto largo", req: false, grupo: "" },
          ].map((c, i) => (
            <Card key={i} className="p-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">{i + 1}</span>
                <span className="text-xs font-medium">{c.label}</span>
                <Badge variant="outline" className="text-xs">{c.tipo}</Badge>
                {c.req && <Badge className="text-xs bg-red-100 text-red-800">Requerido</Badge>}
                {c.grupo && <Badge variant="secondary" className="text-xs">{c.grupo}</Badge>}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Pencil className="h-3 w-3" /></Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"><Trash2 className="h-3 w-3" /></Button>
              </div>
            </Card>
          ))}
        </div>
      </MockScreen>
      <Annotation type="info">Cada campo tiene: <strong>etiqueta</strong>, <strong>tipo</strong>, <strong>opciones</strong> (para select/radio), <strong>requerido</strong>, <strong>grupo</strong> y <strong>orden</strong>.</Annotation>
      <Annotation type="info"><strong>Trazabilidad:</strong> Permite vincular exámenes entre sí para que al completar uno se vea junto al otro.</Annotation>
    </div>

    {/* 9.2 Baterías */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">3</span>
        Pestaña "Paquetes / Baterías"
      </h4>
      <MockScreen title="Exámenes — Baterías" caption="Cada batería tiene sub-pestañas: Exámenes, Faenas, Documentos y Precios.">
        <div className="flex justify-between mb-3">
          <div className="flex gap-2">
            <Input placeholder="🔍 Filtrar baterías..." className="w-[200px] h-8 text-xs" readOnly />
            <Select defaultValue="all"><SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Faena" /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem></SelectContent></Select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-xs gap-1"><Upload className="h-3 w-3" /> Importar Excel</Button>
            <Button size="sm" className="text-xs gap-1"><Plus className="h-3 w-3" /> Nueva Batería</Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="p-3">
            <p className="text-sm font-medium">Pre-Ocupacional Altura</p>
            <p className="text-xs text-muted-foreground">5 exámenes · 2 faenas · 1 documento</p>
            <div className="flex gap-1 mt-2">
              <Badge variant="outline" className="text-xs">Hemograma</Badge>
              <Badge variant="outline" className="text-xs">Audiometría</Badge>
              <Badge variant="outline" className="text-xs">+3</Badge>
            </div>
          </Card>
        </div>
      </MockScreen>
      <Annotation type="info"><strong>Sub-pestañas del diálogo:</strong> Exámenes (checkboxes), Faenas (dónde aplica), Documentos (se generan auto al asignar), Precios (valor por empresa).</Annotation>
    </div>
  </div>
);

// ─── 10. DOCUMENTOS ───
const DocumentosGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Documentos</h3>
      <p className="text-muted-foreground">Formularios digitales: consentimientos, declaraciones y cuestionarios con variables dinámicas.</p>
    </div>

    <MockScreen title="Documentos — Editor">
      <div className="flex justify-between mb-3">
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs">Consentimiento</Badge>
          <Badge variant="outline" className="text-xs">Declaración</Badge>
          <Badge variant="outline" className="text-xs">Cuestionario</Badge>
        </div>
        <Button size="sm" className="text-xs gap-1"><Plus className="h-3 w-3" /> Nuevo Documento</Button>
      </div>

      <Card className="p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-medium">Consentimiento General</p>
            <p className="text-xs text-muted-foreground">Tipo: Consentimiento · 5 campos</p>
          </div>
          <div className="flex gap-1 items-center">
            <Switch defaultChecked />
            <Button variant="ghost" size="sm" className="h-6 text-xs" disabled>Vista previa</Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Pencil className="h-3 w-3" /></Button>
          </div>
        </div>
      </Card>

      <Card className="p-3 border-dashed">
        <p className="text-xs text-muted-foreground mb-1">Ejemplo de texto con variables dinámicas:</p>
        <p className="text-sm">Yo, <strong className="text-primary">{"{{nombre}}"}</strong>, RUT <strong className="text-primary">{"{{rut}}"}</strong>, de <strong className="text-primary">{"{{edad}}"}</strong> años, trabajador de <strong className="text-primary">{"{{empresa}}"}</strong>, declaro...</p>
      </Card>
    </MockScreen>

    <div>
      <h4 className="font-semibold text-foreground mb-3">Variables Dinámicas Disponibles</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { v: "{{nombre}}", d: "Nombre del paciente" },
          { v: "{{rut}}", d: "RUT del paciente" },
          { v: "{{fecha_nacimiento}}", d: "Fecha de nacimiento" },
          { v: "{{edad}}", d: "Edad calculada" },
          { v: "{{email}}", d: "Email" },
          { v: "{{telefono}}", d: "Teléfono" },
          { v: "{{direccion}}", d: "Dirección" },
          { v: "{{empresa}}", d: "Nombre empresa" },
          { v: "{{fecha_actual}}", d: "Fecha de hoy" },
          { v: "{{numero_ingreso}}", d: "N° de ingreso" },
        ].map((v) => (
          <Card key={v.v} className="p-2">
            <p className="text-xs font-mono font-bold text-primary">{v.v}</p>
            <p className="text-xs text-muted-foreground">{v.d}</p>
          </Card>
        ))}
      </div>
    </div>

    <Annotation type="info"><strong>Tipos de campo:</strong> Texto informativo (solo lectura, soporta variables), texto corto, texto largo, checkbox, select, radio, fecha y firma digital.</Annotation>
    <Annotation type="tip"><strong>Vista previa:</strong> Reemplaza variables con datos ficticios para verificar el formato antes de publicar.</Annotation>
    <Annotation type="tip">Botones <strong>↑↓</strong> para reordenar campos.</Annotation>
  </div>
);

// ─── 11. PANTALLA TV ───
const PantallaTvGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Pantalla TV</h3>
      <p className="text-muted-foreground">Pantalla para la sala de espera con 3 modos: Configuración, Display Boxes y Display QR.</p>
    </div>

    {/* Config mode */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">1</span>
        Modo Configuración
      </h4>
      <MockScreen title="Pantalla TV — Configuración">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold mb-2">Selección de Boxes a mostrar:</p>
            <div className="space-y-1.5">
              {["Box 201 - Laboratorio", "Box 202 - Audiometría", "Box 203 - Espirometría"].map((b) => (
                <Label key={b} className="flex items-center gap-2 text-xs"><Checkbox defaultChecked /> {b}</Label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold mb-2">Gestión de QR:</p>
            <div className="space-y-1.5">
              <Card className="p-2 flex items-center justify-between">
                <div className="flex items-center gap-2"><QrCode className="h-4 w-4" /><span className="text-xs">Encuesta Satisfacción</span></div>
                <div className="flex gap-1">
                  <Switch defaultChecked />
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                </div>
              </Card>
              <Button variant="outline" size="sm" className="w-full text-xs gap-1"><Upload className="h-3 w-3" /> Subir QR</Button>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button className="text-xs gap-1" disabled><Tv className="h-3 w-3" /> Iniciar Pantalla</Button>
          <Button variant="outline" className="text-xs gap-1" disabled><QrCode className="h-3 w-3" /> Pantalla QR</Button>
        </div>
      </MockScreen>
    </div>

    {/* Display mode */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">2</span>
        Modo Display (Pantalla de Boxes)
      </h4>
      <MockScreen title="Pantalla TV — Modo Pantalla" caption="Vista de pantalla completa para TV de sala de espera.">
        <div className="bg-foreground text-background rounded-lg p-6 text-center">
          <p className="text-xs opacity-60 mb-4">CENTRO MÉDICO JENNER</p>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { box: "Box 201", patients: ["01 - Juan Pérez"] },
              { box: "Box 202", patients: ["03 - Carlos Muñoz"] },
              { box: "Box 203", patients: [] },
            ].map((b) => (
              <div key={b.box} className="border border-background/20 rounded-lg p-3">
                <p className="text-sm font-bold mb-2">{b.box}</p>
                {b.patients.length > 0 ? b.patients.map((p) => <p key={p} className="text-xs">{p}</p>) : <p className="text-xs opacity-40">Sin pacientes</p>}
              </div>
            ))}
          </div>
          <Separator className="my-4 bg-background/20" />
          <div className="flex justify-center gap-8">
            <div className="text-sm opacity-60">Código del día: <span className="font-mono font-bold">A7X3</span></div>
            <div className="text-sm opacity-60">Próximo reset: <span className="font-mono">05:23:41</span></div>
          </div>
        </div>
      </MockScreen>
      <Annotation type="info"><strong>Llamado por voz:</strong> Cuando un paciente es llamado, el sistema anuncia: "Paciente [nombre], pasar a [box]" usando <code>speechSynthesis</code>.</Annotation>
      <Annotation type="info">Auto-refresh en tiempo real. Los QR se pueden reordenar y activar/desactivar.</Annotation>
    </div>
  </div>
);

// ─── 12. EVALUACIÓN MÉDICA ───
const EvaluacionMedicaGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Evaluación Médica</h3>
      <p className="text-muted-foreground">Evaluación clínica integral con dictámenes de aptitud. Solo pacientes Jenner (WorkMed excluidos automáticamente).</p>
    </div>

    {/* Status legend */}
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Estados de Baterías</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { color: "bg-green-500", label: "✅ Lista para evaluar", desc: "Todos los exámenes completados" },
            { color: "bg-yellow-400", label: "⏳ Esperando resultados", desc: "Muestras tomadas sin resultado" },
            { color: "bg-gray-300 dark:bg-gray-600", label: "⏸ Pendiente", desc: "Exámenes sin realizar" },
            { color: "bg-green-700", label: "✓ Evaluado APTO", desc: "Dictamen: Apto" },
            { color: "bg-red-500", label: "✗ Evaluado NO APTO", desc: "Dictamen: No Apto" },
            { color: "bg-orange-500", label: "⚠ Apto C/R", desc: "Apto con restricciones" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${s.color} shrink-0`} />
              <div><p className="text-xs font-medium">{s.label}</p><p className="text-xs text-muted-foreground">{s.desc}</p></div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* 12.1 Patient list */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">1</span>
        Pestaña "Pacientes del Día"
      </h4>
      <MockScreen title="Evaluación Médica — Listado" caption="Filtros de estado para ver solo pacientes en determinada etapa.">
        <div className="flex gap-2 mb-3 flex-wrap">
          <Label className="flex items-center gap-1.5 text-xs cursor-pointer"><Checkbox defaultChecked /><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Lista</Label>
          <Label className="flex items-center gap-1.5 text-xs cursor-pointer"><Checkbox defaultChecked /><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> Esperando</Label>
          <Label className="flex items-center gap-1.5 text-xs cursor-pointer"><Checkbox /><span className="w-3 h-3 rounded-full bg-gray-300 inline-block" /> Pendiente</Label>
          <Label className="flex items-center gap-1.5 text-xs cursor-pointer"><Checkbox /><span className="w-3 h-3 rounded-full bg-green-700 inline-block" /> Evaluado</Label>
        </div>
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-xs">N°</TableHead>
            <TableHead className="text-xs">Paciente</TableHead>
            <TableHead className="text-xs">RUT</TableHead>
            <TableHead className="text-xs">Empresa</TableHead>
            <TableHead className="text-xs">Baterías</TableHead>
            <TableHead className="text-xs">Acción</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="text-xs font-mono">01</TableCell>
              <TableCell className="text-xs font-medium">María González</TableCell>
              <TableCell className="text-xs">9.876.543-2</TableCell>
              <TableCell className="text-xs">Constructora Bío-Bío</TableCell>
              <TableCell><Badge className="text-xs bg-green-100 text-green-800 border-green-300">Pre-Ocupacional ✓</Badge></TableCell>
              <TableCell><Button size="sm" className="h-6 text-xs" disabled>Evaluar</Button></TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-xs font-mono">02</TableCell>
              <TableCell className="text-xs font-medium">Pedro Soto</TableCell>
              <TableCell className="text-xs">14.555.666-7</TableCell>
              <TableCell className="text-xs">Minera Los Andes</TableCell>
              <TableCell><div className="flex gap-1"><Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">Altura ⏳</Badge><Badge className="text-xs bg-green-100 text-green-800 border-green-300">Estándar ✓</Badge></div></TableCell>
              <TableCell><Button size="sm" variant="outline" className="h-6 text-xs" disabled>Evaluar</Button></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </MockScreen>
    </div>

    {/* 12.2 Evaluation form */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">2</span>
        Pestaña "Evaluación" — Pantalla Dividida
      </h4>
      <MockScreen title="Evaluación Médica — Evaluar" caption="Izquierda: formulario. Derecha: resultados clínicos, audiogramas, archivos y documentos.">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="font-semibold text-sm">María González · 9.876.543-2</p>
              <p className="text-xs text-muted-foreground">Constructora Bío-Bío · Ingreso #01</p>
            </div>
            <div>
              <Label className="text-sm font-semibold">Batería: Pre-Ocupacional</Label>
            </div>
            <div>
              <Label className="text-sm font-semibold">Resultado</Label>
              <RadioGroup defaultValue="apto" className="flex gap-4 mt-2">
                <Label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="apto" /> Apto</Label>
                <Label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="no_apto" /> No Apto</Label>
                <Label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="restricciones" /> Apto C/R</Label>
              </RadioGroup>
            </div>
            <div>
              <Label className="text-xs">Duración vigencia certificado</Label>
              <Select defaultValue="12m"><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="6m">6 meses</SelectItem><SelectItem value="12m">12 meses</SelectItem><SelectItem value="no">No mostrar</SelectItem></SelectContent></Select>
              <p className="text-xs text-muted-foreground mt-1">Se oculta si es NO APTO o "No mostrar"</p>
            </div>
            <div><Label className="text-xs">Restricciones (si Apto C/R)</Label><Textarea className="text-xs h-12" placeholder="Detalle de restricciones..." readOnly /></div>
            <div><Label className="text-xs">Observaciones</Label><Textarea className="text-xs h-16" placeholder="Observaciones clínicas..." readOnly /></div>
            <Button className="w-full" disabled>Guardar Evaluación</Button>
          </div>
          <div className="space-y-3">
            <Card>
              <CardHeader className="py-2 px-4"><CardTitle className="text-xs">Resultados de Exámenes</CardTitle></CardHeader>
              <CardContent className="px-4 pb-3">
                <Table>
                  <TableBody>
                    <TableRow><TableCell className="text-xs font-medium">Hemograma</TableCell><TableCell className="text-xs">GB: 7.2 | GR: 4.8 | Hb: 14.2</TableCell><TableCell><Badge className="text-xs bg-green-100 text-green-800">✓</Badge></TableCell></TableRow>
                    <TableRow><TableCell className="text-xs font-medium">Audiometría</TableCell><TableCell className="text-xs">Normal bilateral</TableCell><TableCell><Badge className="text-xs bg-green-100 text-green-800">✓</Badge></TableCell></TableRow>
                    <TableRow><TableCell className="text-xs font-medium">Espirometría</TableCell><TableCell className="text-xs">FVC: 4.2L | FEV1: 3.8L</TableCell><TableCell><Badge className="text-xs bg-green-100 text-green-800">✓</Badge></TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card className="bg-muted/20">
              <CardContent className="py-3 px-4">
                <p className="text-xs font-medium mb-1">📊 Audiograma</p>
                <p className="text-xs text-muted-foreground">Gráfico audiométrico renderizado con AudiometriaChart</p>
                <div className="h-20 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">[ Gráfico Audiometría ]</div>
              </CardContent>
            </Card>
            <Card className="bg-muted/20">
              <CardContent className="py-3 px-4">
                <p className="text-xs font-medium mb-1">📎 Archivos PDF</p>
                <Button variant="outline" size="sm" className="text-xs gap-1" disabled><Download className="h-3 w-3" /> resultado_lab.pdf</Button>
              </CardContent>
            </Card>
            <Card className="bg-muted/20">
              <CardContent className="py-3 px-4">
                <p className="text-xs font-medium mb-1">📄 Documentos asociados</p>
                <p className="text-xs text-muted-foreground">Consentimiento, declaraciones con respuestas del paciente.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </MockScreen>
      <Annotation type="action" number={1}>Revise los <strong>resultados</strong> en el panel derecho (valores, audiogramas, archivos).</Annotation>
      <Annotation type="action" number={2}>Seleccione <strong>resultado</strong>: Apto, No Apto, o Apto con Restricciones.</Annotation>
      <Annotation type="action" number={3}>Complete <strong>observaciones y restricciones</strong>. Se asigna número de informe correlativo.</Annotation>
    </div>

    {/* 12.3 Historial */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">3</span>
        Pestaña "Historial" y Re-evaluación
      </h4>
      <MockScreen title="Evaluación Médica — Historial / No Aptos">
        <Card className="p-3 border-l-4 border-l-red-400 mb-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Roberto Díaz</span>
              <span className="text-xs text-muted-foreground ml-2">· Minera Los Andes · Pre-Ocupacional Altura</span>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs" disabled>Re-evaluar</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Observaciones: Hipoacusia severa bilateral</p>
          <p className="text-xs text-muted-foreground">Evaluado: 08/03/2026 por Dr. García</p>
        </Card>
      </MockScreen>
      <Annotation type="tip">Use <strong>"Re-evaluar"</strong> si las condiciones del paciente cambian. Se registra quién revisó y cuándo.</Annotation>
    </div>
  </div>
);

// ─── 13. COTIZACIONES ───
const CotizacionesGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Cotizaciones</h3>
      <p className="text-muted-foreground">Generación de cotizaciones con baterías/exámenes, márgenes de ganancia, IVA y generación de PDF. Incluye gestión de solicitudes desde portal de empresas.</p>
    </div>

    {/* 13.1 Lista */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">1</span>
        Pestaña "Cotizaciones"
      </h4>
      <MockScreen title="Cotizaciones — Lista">
        <div className="flex justify-between mb-3">
          <div className="flex gap-2">
            <Input placeholder="🔍 Buscar..." className="w-[200px] h-8 text-xs" readOnly />
            <Select defaultValue="all"><SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="borrador">Borrador</SelectItem><SelectItem value="enviada">Enviada</SelectItem><SelectItem value="aceptada">Aceptada</SelectItem><SelectItem value="rechazada">Rechazada</SelectItem></SelectContent></Select>
          </div>
          <Button size="sm" className="text-xs gap-1"><Plus className="h-3 w-3" /> Nueva Cotización</Button>
        </div>
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-xs">N°</TableHead>
            <TableHead className="text-xs">Fecha</TableHead>
            <TableHead className="text-xs">Empresa</TableHead>
            <TableHead className="text-xs">Estado</TableHead>
            <TableHead className="text-xs">Total</TableHead>
            <TableHead className="text-xs">Acciones</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="text-xs font-mono">COT-001</TableCell>
              <TableCell className="text-xs">10/03/2026</TableCell>
              <TableCell className="text-xs">Minera Los Andes</TableCell>
              <TableCell><Badge className="text-xs bg-green-100 text-green-800">Aceptada</Badge></TableCell>
              <TableCell className="text-xs font-medium">$2.450.000</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 text-xs" disabled><Download className="h-3 w-3" /> PDF</Button>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" disabled><Copy className="h-3 w-3" /> Duplicar</Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Pencil className="h-3 w-3" /></Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </MockScreen>
    </div>

    {/* 13.2 Solicitudes */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">2</span>
        Pestaña "Solicitudes"
      </h4>
      <p className="text-sm text-muted-foreground mb-2">Solicitudes de cotización recibidas desde el portal de empresas.</p>
      <MockScreen title="Cotizaciones — Solicitudes">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Solicitud: Pre-Ocupacional 50 trabajadores</p>
              <p className="text-xs text-muted-foreground">Minera Los Andes · Recibida: 08/03/2026</p>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled>Ver detalle</Button>
              <Button size="sm" className="h-7 text-xs" disabled>Responder</Button>
            </div>
          </div>
        </Card>
      </MockScreen>
      <Annotation type="action"><strong>Responder:</strong> Crea una cotización a partir de la solicitud con los items y cantidades estimadas.</Annotation>
    </div>

    {/* 13.3 Márgenes */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">3</span>
        Pestaña "Márgenes"
      </h4>
      <p className="text-sm text-muted-foreground mb-2">Márgenes de ganancia predefinidos para calcular precio final en cotizaciones.</p>
      <MockScreen title="Cotizaciones — Márgenes">
        <Table>
          <TableHeader><TableRow><TableHead className="text-xs">Nombre</TableHead><TableHead className="text-xs">Porcentaje</TableHead><TableHead className="text-xs">Activo</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell className="text-xs">Estándar</TableCell><TableCell className="text-xs">30%</TableCell><TableCell><Switch defaultChecked /></TableCell></TableRow>
            <TableRow><TableCell className="text-xs">Premium</TableCell><TableCell className="text-xs">50%</TableCell><TableCell><Switch defaultChecked /></TableCell></TableRow>
          </TableBody>
        </Table>
      </MockScreen>
    </div>
  </div>
);

// ─── 14. PRESTADORES ───
const PrestadoresGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Prestadores</h3>
      <p className="text-muted-foreground">Gestión de prestadores internos y externos con tarifas por examen y sistema de reemplazos.</p>
    </div>

    <MockScreen title="Prestadores — Lista">
      <div className="flex justify-between mb-3">
        <Input placeholder="🔍 Buscar por nombre, RUT o especialidad..." className="w-[300px] h-8 text-xs" readOnly />
        <Button size="sm" className="text-xs gap-1"><Plus className="h-3 w-3" /> Nuevo Prestador</Button>
      </div>
      <Table>
        <TableHeader><TableRow>
          <TableHead className="text-xs">Nombre</TableHead>
          <TableHead className="text-xs">RUT</TableHead>
          <TableHead className="text-xs">Especialidad</TableHead>
          <TableHead className="text-xs">Tipo</TableHead>
          <TableHead className="text-xs">Activo</TableHead>
          <TableHead className="text-xs">Usuario</TableHead>
          <TableHead className="text-xs">Acciones</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="text-xs font-medium">Dr. García</TableCell>
            <TableCell className="text-xs">10.111.222-3</TableCell>
            <TableCell className="text-xs">Medicina General</TableCell>
            <TableCell><Badge variant="outline" className="text-xs">Interno</Badge></TableCell>
            <TableCell><Switch defaultChecked /></TableCell>
            <TableCell className="text-xs">dr.garcia</TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-6 text-xs" disabled><DollarSign className="h-3 w-3" /> Tarifas</Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Pencil className="h-3 w-3" /></Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="text-xs font-medium">Lab Externo SPA</TableCell>
            <TableCell className="text-xs">77.888.999-K</TableCell>
            <TableCell className="text-xs">Laboratorio</TableCell>
            <TableCell><Badge variant="outline" className="text-xs">Externo</Badge></TableCell>
            <TableCell><Switch defaultChecked /></TableCell>
            <TableCell className="text-xs">—</TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-6 text-xs" disabled><DollarSign className="h-3 w-3" /> Tarifas</Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Pencil className="h-3 w-3" /></Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </MockScreen>

    <Annotation type="info"><strong>Tarifas:</strong> Lista de exámenes con valor de prestación configurable por cada examen. Checkboxes para vincular/desvincular exámenes al prestador.</Annotation>
    <Annotation type="info"><strong>Reemplazos:</strong> Registra prestador original, reemplazante, fecha y motivo del reemplazo temporal.</Annotation>
    <Annotation type="info"><strong>Usuario vinculado:</strong> Opcionalmente se puede vincular a un usuario del sistema para tracking.</Annotation>
  </div>
);

// ─── 15. USUARIOS ───
const UsuariosGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Usuarios</h3>
      <p className="text-muted-foreground">Gestión de usuarios del staff y del portal de empresas. Incluye permisos de menú por usuario.</p>
    </div>

    {/* 15.1 Staff */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">1</span>
        Pestaña "Staff"
      </h4>
      <MockScreen title="Usuarios — Staff">
        <div className="flex justify-end mb-3"><Button size="sm" className="text-xs gap-1"><Plus className="h-3 w-3" /> Nuevo Usuario</Button></div>
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-xs">Username</TableHead>
            <TableHead className="text-xs">Rol</TableHead>
            <TableHead className="text-xs">Acciones</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="text-xs font-medium">admin</TableCell>
              <TableCell><Badge className="text-xs">admin</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 text-xs" disabled><ShieldCheck className="h-3 w-3" /> Permisos</Button>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" disabled>Cambiar contraseña</Button>
                </div>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-xs font-medium">recepcion1</TableCell>
              <TableCell><Badge variant="outline" className="text-xs">user</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 text-xs" disabled><ShieldCheck className="h-3 w-3" /> Permisos</Button>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" disabled>Cambiar contraseña</Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </MockScreen>
      <Annotation type="info"><strong>Permisos de menú:</strong> Checkboxes por cada módulo del sistema para controlar qué módulos puede ver cada usuario. Administradores tienen acceso total.</Annotation>
    </div>

    {/* 15.2 Empresa users */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">2</span>
        Pestaña "Empresas"
      </h4>
      <p className="text-sm text-muted-foreground mb-2">Usuarios del portal de empresas. Se vinculan a una empresa específica.</p>
      <MockScreen title="Usuarios — Portal Empresas">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-xs">Nombre</TableHead>
            <TableHead className="text-xs">Email</TableHead>
            <TableHead className="text-xs">Empresa</TableHead>
            <TableHead className="text-xs">Activo</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="text-xs">José Pérez</TableCell>
              <TableCell className="text-xs">jperez@mineraandes.cl</TableCell>
              <TableCell className="text-xs">Minera Los Andes</TableCell>
              <TableCell><Switch defaultChecked /></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </MockScreen>
    </div>
  </div>
);

// ─── 16. CONFIGURACIÓN ───
const ConfiguracionGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Configuración</h3>
      <p className="text-muted-foreground">Bloques horarios para agenda de pre-reservas y gestión global de faenas.</p>
    </div>

    {/* 16.1 Bloques */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">1</span>
        Bloques Horarios
      </h4>
      <MockScreen title="Configuración — Bloques de Agenda">
        <div className="flex justify-end mb-3"><Button size="sm" className="text-xs gap-1"><Plus className="h-3 w-3" /> Nuevo Bloque</Button></div>
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-xs">Bloque</TableHead>
            <TableHead className="text-xs">Hora Inicio</TableHead>
            <TableHead className="text-xs">Hora Fin</TableHead>
            <TableHead className="text-xs">Cupo Máximo</TableHead>
            <TableHead className="text-xs">Activo</TableHead>
            <TableHead className="text-xs">Acciones</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="text-xs">Mañana</TableCell>
              <TableCell className="text-xs">07:00</TableCell>
              <TableCell className="text-xs">12:00</TableCell>
              <TableCell className="text-xs">15</TableCell>
              <TableCell><Switch defaultChecked /></TableCell>
              <TableCell><div className="flex gap-1"><Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Pencil className="h-3 w-3" /></Button><Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"><Trash2 className="h-3 w-3" /></Button></div></TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-xs">Tarde</TableCell>
              <TableCell className="text-xs">14:00</TableCell>
              <TableCell className="text-xs">18:00</TableCell>
              <TableCell className="text-xs">10</TableCell>
              <TableCell><Switch defaultChecked /></TableCell>
              <TableCell><div className="flex gap-1"><Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Pencil className="h-3 w-3" /></Button><Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"><Trash2 className="h-3 w-3" /></Button></div></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </MockScreen>
    </div>

    {/* 16.2 Faenas */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">2</span>
        Faenas Globales
      </h4>
      <p className="text-sm text-muted-foreground mb-2">Gestión global de faenas (no vinculadas a una empresa específica). Se pueden crear, editar y activar/desactivar.</p>
    </div>
  </div>
);

// ─── 17. REGISTRO DE ACTIVIDAD ───
const ActividadLogGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Registro de Actividad</h3>
      <p className="text-muted-foreground">Log de auditoría de todas las acciones realizadas en el sistema.</p>
    </div>

    <MockScreen title="Actividad — Log del Sistema">
      <div className="flex gap-2 mb-3 flex-wrap">
        <Input placeholder="🔍 Buscar en acción, usuario, detalles..." className="flex-1 min-w-[200px] h-8 text-xs" readOnly />
        <Input type="date" className="w-[140px] h-8 text-xs" readOnly />
        <Input type="date" className="w-[140px] h-8 text-xs" readOnly />
        <Button variant="outline" size="sm" className="text-xs gap-1"><RefreshCw className="h-3 w-3" /></Button>
      </div>
      <Table>
        <TableHeader><TableRow>
          <TableHead className="text-xs">Fecha/Hora</TableHead>
          <TableHead className="text-xs">Usuario</TableHead>
          <TableHead className="text-xs">Acción</TableHead>
          <TableHead className="text-xs">Módulo</TableHead>
          <TableHead className="text-xs">Detalles</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {[
            { fecha: "10/03 08:15:23", user: "recepcion1", accion: "crear_atencion", modulo: "/pacientes", detalles: "Juan Pérez López - Minera Los Andes" },
            { fecha: "10/03 08:20:45", user: "lab1", accion: "llamar_paciente", modulo: "/mi-box", detalles: "Juan Pérez → Box 201" },
            { fecha: "10/03 08:45:12", user: "lab1", accion: "completar_box", modulo: "/mi-box", detalles: "Hemograma, Orina completados" },
            { fecha: "10/03 09:10:33", user: "recepcion1", accion: "revertir_atencion", modulo: "/completados", detalles: "Ana Martínez - Rx Tórax revertido" },
            { fecha: "10/03 09:15:00", user: "admin", accion: "crear_usuario", modulo: "/usuarios", detalles: "nuevo_user creado" },
          ].map((log, i) => (
            <TableRow key={i}>
              <TableCell className="text-xs font-mono">{log.fecha}</TableCell>
              <TableCell className="text-xs">{log.user}</TableCell>
              <TableCell><Badge variant="outline" className="text-xs">{log.accion}</Badge></TableCell>
              <TableCell className="text-xs font-mono">{log.modulo}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{log.detalles}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </MockScreen>

    <div>
      <h4 className="font-semibold text-foreground mb-3">Acciones Registradas</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {[
          "login", "logout", "crear_paciente", "editar_paciente", "eliminar_paciente",
          "crear_atencion", "completar_atencion", "incompleto_atencion", "llamar_paciente",
          "devolver_espera", "revertir_atencion", "reactivar_paciente", "crear_usuario",
          "eliminar_usuario", "cambiar_password", "crear_empresa", "editar_empresa",
          "crear_cotizacion", "editar_cotizacion", "eliminar_cotizacion", "duplicar_cotizacion",
          "crear_prereserva", "eliminar_prereserva", "cambiar_estado_examen",
          "crear_agenda_diferida", "vincular_agenda_diferida", "generar_estado_pago",
          "seleccionar_box", "completar_box", "devolver_espera_box",
        ].map((a) => (
          <Badge key={a} variant="outline" className="text-xs font-mono justify-center">{a}</Badge>
        ))}
      </div>
    </div>
  </div>
);

// ── Module registry ──
const moduleRegistry: Record<string, { label: string; icon: React.ElementType; component: React.ComponentType<{ role: string }> }> = {
  "dashboard": { label: "Dashboard", icon: LayoutDashboard, component: DashboardGuide },
  "pacientes": { label: "Pacientes", icon: Users, component: PacientesGuide },
  "flujo": { label: "Flujo", icon: GitBranch, component: FlujoGuide },
  "completados": { label: "Completados", icon: CheckCircle2, component: CompletadosGuide },
  "incompletos": { label: "Incompletos", icon: XCircle, component: IncompletosGuide },
  "empresas": { label: "Empresas", icon: Building2, component: EmpresasGuide },
  "boxes": { label: "Boxes", icon: Grid3X3, component: BoxesGuide },
  "examenes": { label: "Exámenes", icon: FlaskConical, component: ExamenesGuide },
  "documentos": { label: "Documentos", icon: FileText, component: DocumentosGuide },
  "pantalla-tv": { label: "Pantalla TV", icon: Tv, component: PantallaTvGuide },
  "configuracion": { label: "Configuración", icon: Settings, component: ConfiguracionGuide },
  "mi-box": { label: "Mi Box", icon: ClipboardList, component: MiBoxGuide },
  "evaluacion-medica": { label: "Evaluación Médica", icon: Heart, component: EvaluacionMedicaGuide },
  "cotizaciones": { label: "Cotizaciones", icon: DollarSign, component: CotizacionesGuide },
  "prestadores": { label: "Prestadores", icon: UserCheck, component: PrestadoresGuide },
  "usuarios": { label: "Usuarios", icon: ShieldCheck, component: UsuariosGuide },
  "actividad-log": { label: "Registro de Actividad", icon: Activity, component: ActividadLogGuide },
};

// ── Color legend ──
const colorLegend = [
  { color: "bg-blue-400", label: "Pendiente", desc: "Examen aún no realizado" },
  { color: "bg-yellow-400", label: "Muestra Tomada", desc: "Muestra tomada, resultado pendiente" },
  { color: "bg-green-500", label: "Completado", desc: "Examen realizado exitosamente" },
  { color: "bg-red-500", label: "Incompleto", desc: "Examen no pudo completarse" },
];

// ══════════════════════════════════════════════
//   MAIN COMPONENT
// ══════════════════════════════════════════════

const GuiaUsuario = () => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const activeRole = roles.find((r) => r.id === selectedRole);

  // ── Landing ──
  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-5xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-3">📘 Guía Interactiva — MediFlow</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Seleccione su perfil para ver una guía visual completa con ejemplos de cada pantalla del sistema.
            </p>
          </div>

          <Card className="mb-10">
            <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Info className="h-5 w-5 text-primary" /> Código de Colores de Exámenes</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {colorLegend.map((c) => (
                  <div key={c.label} className="flex items-center gap-3">
                    <span className={`w-4 h-4 rounded-full ${c.color} shrink-0`} />
                    <div><p className="text-sm font-medium">{c.label}</p><p className="text-xs text-muted-foreground">{c.desc}</p></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Transversal features */}
          <Card className="mb-10">
            <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Funcionalidades Transversales</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Auto-refresh</p>
                  <ul className="text-xs text-muted-foreground ml-6 mt-1 space-y-0.5">
                    <li>Dashboard: cada 30 segundos</li>
                    <li>Flujo: Realtime + cada 30 segundos</li>
                    <li>Mi Box: Realtime + cada 10 segundos</li>
                    <li>Pacientes: Realtime + cada 15 segundos</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Chat Global</p>
                  <p className="text-xs text-muted-foreground ml-6 mt-1">Disponible en Flujo, Mi Box, Documentos y Prestadores. Mensajes en tiempo real.</p>
                </div>
                <div>
                  <p className="font-medium flex items-center gap-2"><Timer className="h-4 w-4" /> Timer Presión Arterial</p>
                  <p className="text-xs text-muted-foreground ml-6 mt-1">Badge con cuenta regresiva. Al expirar, permite tomar nueva medición.</p>
                </div>
                <div>
                  <p className="font-medium flex items-center gap-2"><Users className="h-4 w-4" /> Portal Paciente</p>
                  <p className="text-xs text-muted-foreground ml-6 mt-1">Ruta /portal. El paciente ingresa código del día + RUT para completar datos y documentos.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <Card key={role.id} className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 border-2 border-transparent hover:border-primary/30 group" onClick={() => setSelectedRole(role.id)}>
                  <CardHeader className="text-center pb-3">
                    <div className={`mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br ${role.gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl">{role.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center text-sm">{role.description}</CardDescription>
                    <div className="mt-4 flex flex-wrap gap-1 justify-center">
                      {role.modules.map((m) => (
                        <Badge key={m} variant="secondary" className="text-xs">{moduleRegistry[m]?.label ?? m}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <Link to="/"><Button variant="outline" className="gap-2"><ArrowLeft className="h-4 w-4" /> Volver al sistema</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Module detail ──
  if (selectedModule) {
    const mod = moduleRegistry[selectedModule];
    if (!mod) return null;
    const ModComponent = mod.component;
    const MIcon = mod.icon;
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <button onClick={() => { setSelectedRole(null); setSelectedModule(null); }} className="hover:text-foreground transition-colors">Inicio</button>
            <ChevronRight className="h-4 w-4" />
            <button onClick={() => setSelectedModule(null)} className="hover:text-foreground transition-colors">{activeRole?.label}</button>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">{mod.label}</span>
          </div>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center"><MIcon className="h-7 w-7 text-primary" /></div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{mod.label}</h1>
              <p className="text-muted-foreground">Guía detallada para {activeRole?.label}</p>
            </div>
          </div>
          <ModComponent role={selectedRole} />
          <div className="mt-10 flex gap-3">
            <Button variant="outline" onClick={() => setSelectedModule(null)} className="gap-2"><ArrowLeft className="h-4 w-4" /> Volver a módulos</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Role overview ──
  const RoleIcon = activeRole!.icon;
  const roleModules = activeRole!.modules.map((id) => ({ id, ...moduleRegistry[id] })).filter((m) => m.label);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <button onClick={() => { setSelectedRole(null); setSelectedModule(null); }} className="hover:text-foreground transition-colors">Inicio</button>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{activeRole!.label}</span>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${activeRole!.gradient} flex items-center justify-center`}>
            <RoleIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manual de {activeRole!.label}</h1>
            <p className="text-muted-foreground">{activeRole!.description}</p>
          </div>
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground mb-1">Acceso al Sistema</p>
                <p className="text-sm text-muted-foreground">Ingrese con su usuario y contraseña. La barra de navegación mostrará solo sus módulos permitidos. Use 🌙/☀️ para modo claro/oscuro y el candado 🔒 para cambiar contraseña.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <h2 className="text-xl font-semibold text-foreground mb-4">Sus módulos ({roleModules.length})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {roleModules.map((mod) => {
            const MIcon = mod.icon;
            return (
              <Card key={mod.id} className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 border-2 border-transparent hover:border-primary/20" onClick={() => setSelectedModule(mod.id)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><MIcon className="h-5 w-5 text-primary" /></div>
                    <div className="flex-1"><CardTitle className="text-base">{mod.label}</CardTitle></div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <p className="text-xs text-muted-foreground">Haga clic para ver la guía visual detallada con ejemplos</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8">
          <Button variant="outline" onClick={() => { setSelectedRole(null); setSelectedModule(null); }} className="gap-2"><ArrowLeft className="h-4 w-4" /> Cambiar perfil</Button>
        </div>
      </div>
    </div>
  );
};

export default GuiaUsuario;
