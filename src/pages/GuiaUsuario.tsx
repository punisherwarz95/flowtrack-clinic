import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  Search,
  Calendar,
  Play,
  RotateCcw,
  Clock,
  Activity,
  ClipboardCheck,
  UserCheck,
  Eye,
  MousePointer,
  ArrowRight,
  Check,
  X,
  RefreshCw,
  MessageSquare,
  Upload,
  Plus,
  Pencil,
  Trash2,
  FileWarning,
  BarChart3,
} from "lucide-react";

// ── Roles ──
const roles = [
  {
    id: "recepcion",
    label: "Recepción",
    icon: Monitor,
    gradient: "from-blue-500 to-cyan-500",
    description: "Gestión integral del flujo de pacientes, registro y configuración del sistema.",
    modules: ["dashboard", "pacientes", "flujo", "completados", "incompletos", "empresas", "boxes", "examenes", "documentos", "pantalla-tv", "configuracion"],
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

// ── Mock Navigation Bar ──
const MockNavBar = ({ items }: { items: string[] }) => (
  <div className="bg-card border-b mb-4 px-4 py-2 flex items-center gap-3 rounded-t-lg overflow-x-auto">
    <span className="font-bold text-sm text-primary whitespace-nowrap">MediFlow</span>
    <div className="flex gap-1">
      {items.map((item, i) => (
        <Badge key={i} variant={i === 0 ? "default" : "outline"} className="text-xs cursor-default whitespace-nowrap">
          {item}
        </Badge>
      ))}
    </div>
    <div className="ml-auto flex items-center gap-2">
      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">👤</div>
    </div>
  </div>
);

// ══════════════════════════════════════════════
//   MODULE CONTENT WITH MOCKUPS
// ══════════════════════════════════════════════

const DashboardGuide = ({ role }: { role: string }) => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">¿Qué es el Dashboard?</h3>
      <p className="text-muted-foreground">El Dashboard es la pantalla principal que muestra el estado del centro en tiempo real. Desde aquí puede ver cuántos pacientes hay, el estado de los exámenes y filtrar la información.</p>
    </div>

    {/* Stats cards mockup */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">1</span>
        Tarjetas de Estadísticas Diarias
      </h4>
      <MockScreen title="Dashboard — Estadísticas Diarias" caption="Las tarjetas muestran el resumen del día en tiempo real. Se actualizan automáticamente cada 30 segundos.">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-1 pt-3 px-3">
              <p className="text-xs text-muted-foreground">Total Pacientes</p>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-2xl font-bold">24</div>
              <div className="text-xs text-muted-foreground mt-1">WM: 15 | J: 09</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-1 pt-3 px-3">
              <p className="text-xs text-muted-foreground">En Espera</p>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-2xl font-bold">8</div>
              <div className="text-xs text-muted-foreground mt-1">WM: 05 | J: 03</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-1 pt-3 px-3">
              <p className="text-xs text-muted-foreground">En Atención</p>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-2xl font-bold">4</div>
              <div className="text-xs text-muted-foreground mt-1">WM: 03 | J: 01</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-1 pt-3 px-3">
              <p className="text-xs text-muted-foreground">Completados</p>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-2xl font-bold">12</div>
              <div className="text-xs text-muted-foreground mt-1">WM: 07 | J: 05</div>
            </CardContent>
          </Card>
        </div>
      </MockScreen>
      <Annotation type="info">
        <strong>WM</strong> = Workmed, <strong>J</strong> = Jenner. Cada tarjeta muestra la distribución por tipo de servicio.
      </Annotation>
    </div>

    {/* Filters mockup */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">2</span>
        Tabla de Pacientes con Filtros Dinámicos
      </h4>
      <MockScreen title="Dashboard — Tabla de Pacientes Ingresados" caption="Los filtros interactúan entre sí: al cambiar uno, los demás se actualizan mostrando solo opciones relevantes.">
        {/* Filters bar */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex-1 min-w-[150px]">
            <Input placeholder="🔍 Buscar por nombre..." className="h-8 text-xs" readOnly />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Empresa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las empresas</SelectItem>
              <SelectItem value="e1">Minera Los Andes</SelectItem>
              <SelectItem value="e2">Constructora Bío-Bío</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Box" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los boxes</SelectItem>
              <SelectItem value="201">Box 201</SelectItem>
              <SelectItem value="202">Box 202</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Examen" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="hemo">Hemograma</SelectItem>
              <SelectItem value="audio">Audiometría</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Color filters */}
        <div className="flex gap-3 mb-4">
          <Label className="flex items-center gap-1.5 text-xs cursor-pointer"><Checkbox defaultChecked /><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> Pendiente</Label>
          <Label className="flex items-center gap-1.5 text-xs cursor-pointer"><Checkbox defaultChecked /><span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> Muestra</Label>
          <Label className="flex items-center gap-1.5 text-xs cursor-pointer"><Checkbox defaultChecked /><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Completado</Label>
          <Label className="flex items-center gap-1.5 text-xs cursor-pointer"><Checkbox defaultChecked /><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Incompleto</Label>
        </div>
        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">N°</TableHead>
              <TableHead className="text-xs">Paciente</TableHead>
              <TableHead className="text-xs">RUT</TableHead>
              <TableHead className="text-xs">Empresa</TableHead>
              <TableHead className="text-xs">Tipo</TableHead>
              <TableHead className="text-xs">Exámenes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="text-xs font-mono">01</TableCell>
              <TableCell className="text-xs font-medium">Juan Pérez López</TableCell>
              <TableCell className="text-xs">12.345.678-9</TableCell>
              <TableCell className="text-xs">Minera Los Andes</TableCell>
              <TableCell><Badge className="text-xs bg-blue-100 text-blue-800 border-blue-300">WM</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">Hemograma</Badge>
                  <Badge className="text-xs bg-green-100 text-green-800 border-green-300">Audiometría</Badge>
                  <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-300">Orina</Badge>
                </div>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-xs font-mono">02</TableCell>
              <TableCell className="text-xs font-medium">María González</TableCell>
              <TableCell className="text-xs">9.876.543-2</TableCell>
              <TableCell className="text-xs">Constructora Bío-Bío</TableCell>
              <TableCell><Badge className="text-xs bg-amber-100 text-amber-800 border-amber-300">J</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  <Badge className="text-xs bg-green-100 text-green-800 border-green-300">ECG</Badge>
                  <Badge className="text-xs bg-green-100 text-green-800 border-green-300">Espirometría</Badge>
                  <Badge className="text-xs bg-red-100 text-red-800 border-red-300">Rx Tórax</Badge>
                </div>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-xs font-mono">03</TableCell>
              <TableCell className="text-xs font-medium">Carlos Muñoz</TableCell>
              <TableCell className="text-xs">15.678.901-K</TableCell>
              <TableCell className="text-xs">Minera Los Andes</TableCell>
              <TableCell><Badge className="text-xs bg-blue-100 text-blue-800 border-blue-300">WM</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">Hemograma</Badge>
                  <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">Audiometría</Badge>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </MockScreen>
      <Annotation type="tip">
        <strong>Filtros dinámicos:</strong> Si selecciona "Box 201", la tabla solo mostrará los exámenes que pertenecen a ese box. Los filtros de Empresa y Examen también se actualizan para mostrar solo opciones relevantes al box seleccionado.
      </Annotation>
      <Annotation type="info">
        Los <strong>checkboxes de color</strong> permiten mostrar/ocultar exámenes según su estado. Desactive "Completado" (verde) para ver solo los exámenes pendientes.
      </Annotation>
      {role === "clinico" && (
        <Annotation type="tip">
          <strong>Uso sugerido para clínicos:</strong> Filtre por su box asignado para ver rápidamente cuántos pacientes tiene pendientes.
        </Annotation>
      )}
      {role === "medico" && (
        <Annotation type="tip">
          <strong>Uso sugerido para médicos:</strong> Filtre por exámenes completados (verde) para identificar pacientes listos para evaluación médica.
        </Annotation>
      )}
    </div>

    {/* Monthly stats */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">3</span>
        Estadísticas Mensuales
      </h4>
      <MockScreen title="Dashboard — Estadísticas Mensuales">
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-3 pb-3 px-3">
              <p className="text-xs text-muted-foreground">Total Mes</p>
              <div className="text-2xl font-bold">342</div>
              <p className="text-xs text-muted-foreground">marzo 2026</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-3 pb-3 px-3">
              <p className="text-xs text-muted-foreground">Workmed</p>
              <div className="text-2xl font-bold">198</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-3 pb-3 px-3">
              <p className="text-xs text-muted-foreground">Jenner</p>
              <div className="text-2xl font-bold">144</div>
            </CardContent>
          </Card>
        </div>
      </MockScreen>
    </div>

    {/* Historical search */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">4</span>
        Búsqueda Histórica
      </h4>
      <p className="text-muted-foreground text-sm mb-2">En la parte inferior del Dashboard puede buscar pacientes y consultar su historial completo de atenciones pasadas.</p>
      <MockScreen title="Dashboard — Búsqueda Histórica">
        <div className="flex gap-2 mb-3">
          <Input placeholder="Buscar paciente por nombre o RUT..." className="text-sm" readOnly />
          <Button size="sm" variant="outline"><Search className="h-4 w-4" /></Button>
        </div>
        <div className="text-xs text-muted-foreground text-center py-4">
          Ingrese un nombre o RUT para buscar en el historial completo
        </div>
      </MockScreen>
    </div>
  </div>
);

const PacientesGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Módulo de Pacientes</h3>
      <p className="text-muted-foreground">Este es el módulo central para el registro e ingreso de pacientes al sistema. Tiene varias pestañas para distintas funcionalidades.</p>
    </div>

    <MockScreen title="Pacientes — Pestañas disponibles" caption="Use las pestañas superiores para acceder a distintas funcionalidades.">
      <Tabs defaultValue="pacientes" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="pacientes" className="text-xs gap-1"><Users className="h-3 w-3" /> Pacientes</TabsTrigger>
          <TabsTrigger value="codigo" className="text-xs gap-1"><Clock className="h-3 w-3" /> Código del Día</TabsTrigger>
          <TabsTrigger value="prereservas" className="text-xs gap-1"><Calendar className="h-3 w-3" /> Pre-Reservas</TabsTrigger>
          <TabsTrigger value="agenda" className="text-xs gap-1"><Calendar className="h-3 w-3" /> Agenda Diferida</TabsTrigger>
        </TabsList>
      </Tabs>
    </MockScreen>

    {/* Registration form */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">1</span>
        Registrar un Nuevo Paciente
      </h4>
      <MockScreen title="Pacientes — Formulario de Ingreso" caption="Complete los datos del paciente en el formulario lateral.">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nombre completo *</Label>
              <Input className="h-8 text-xs" defaultValue="Juan Pérez López" readOnly />
            </div>
            <div>
              <Label className="text-xs">RUT</Label>
              <Input className="h-8 text-xs" defaultValue="12.345.678-9" readOnly />
            </div>
            <div>
              <Label className="text-xs">Tipo de Servicio</Label>
              <Select defaultValue="workmed">
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="workmed">Workmed</SelectItem>
                  <SelectItem value="jenner">Jenner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Empresa</Label>
              <Input className="h-8 text-xs" defaultValue="Minera Los Andes" readOnly />
            </div>
            <div>
              <Label className="text-xs">Faena</Label>
              <Select defaultValue="f1">
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="f1">Faena Principal</SelectItem>
                  <SelectItem value="f2">Faena Norte</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold">Baterías de Exámenes</Label>
              <div className="border rounded-lg p-2 space-y-1.5 mt-1">
                <Label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox defaultChecked /> Pre-Ocupacional Altura
                </Label>
                <Label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox /> Ocupacional Estándar
                </Label>
                <Label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox /> Control Periódico
                </Label>
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Exámenes Adicionales</Label>
              <div className="border rounded-lg p-2 space-y-1.5 mt-1">
                <Label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox /> Test de Drogas
                </Label>
                <Label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox defaultChecked /> Electrocardiograma
                </Label>
              </div>
            </div>
            <Button className="w-full h-9 text-sm gap-2 mt-2" disabled>
              <Plus className="h-4 w-4" /> Ingresar Paciente
            </Button>
          </div>
        </div>
      </MockScreen>
      <Annotation type="action" number={1}>Complete todos los campos del formulario. El <strong>Nombre</strong> es obligatorio. El <strong>RUT</strong> se formatea automáticamente.</Annotation>
      <Annotation type="action" number={2}>Seleccione las <strong>baterías</strong> (paquetes de exámenes) que correspondan. Puede filtrar baterías por faena.</Annotation>
      <Annotation type="action" number={3}>Opcionalmente agregue <strong>exámenes individuales</strong> adicionales.</Annotation>
      <Annotation type="action" number={4}>Presione <strong>"Ingresar Paciente"</strong>. El sistema asigna un número de ingreso correlativo del día automáticamente.</Annotation>
    </div>

    {/* Patient list */}
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
            { n: "01", nombre: "Juan Pérez López", rut: "12.345.678-9", tipo: "WM", incompleto: false },
            { n: "02", nombre: "María González", rut: "9.876.543-2", tipo: "J", incompleto: true },
          ].map((p) => (
            <Card key={p.n} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground">{p.n}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{p.nombre}</span>
                      {p.incompleto && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                    </div>
                    <span className="text-xs text-muted-foreground">{p.rut}</span>
                  </div>
                  <Badge className="text-xs" variant="outline">{p.tipo}</Badge>
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
      <Annotation type="info">El ícono <AlertTriangle className="h-3 w-3 text-amber-500 inline" /> indica que el paciente tiene datos incompletos del portal.</Annotation>
    </div>

    {/* Código del día */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">3</span>
        Código del Día
      </h4>
      <p className="text-sm text-muted-foreground mb-2">El código del día permite a los pacientes completar sus datos desde el Portal Paciente. Se renueva automáticamente.</p>
      <MockScreen title="Pacientes — Código del Día">
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-2">Código activo del día</p>
          <div className="text-4xl font-mono font-bold text-primary tracking-widest">A7X3</div>
          <p className="text-xs text-muted-foreground mt-2">Se renueva automáticamente a las 06:00</p>
        </div>
      </MockScreen>
    </div>
  </div>
);

const FlujoGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Módulo de Flujo</h3>
      <p className="text-muted-foreground">Controla el flujo de pacientes entre los distintos boxes de atención. Desde aquí se asignan pacientes, se marcan exámenes y se completan atenciones.</p>
    </div>

    <MockScreen title="Flujo — Vista Principal" caption="La vista muestra pacientes en espera y en atención, con sus exámenes y boxes asignados.">
      <div className="flex gap-2 mb-4">
        <Select defaultValue="todos">
          <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Filtrar Box" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los boxes</SelectItem>
            <SelectItem value="201">Box 201</SelectItem>
            <SelectItem value="202">Box 202</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="text-xs gap-1"><Calendar className="h-3 w-3" /> Hoy</Button>
        <Button variant="outline" size="sm" className="text-xs gap-1"><RefreshCw className="h-3 w-3" /></Button>
      </div>

      <div className="space-y-3">
        {/* En espera */}
        <Card className="border-l-4 border-l-yellow-400">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground">01</span>
                <div>
                  <span className="text-sm font-medium">Juan Pérez López</span>
                  <span className="text-xs text-muted-foreground ml-2">12.345.678-9</span>
                </div>
                <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-300">WM</Badge>
                <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">En Espera</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Select defaultValue="">
                  <SelectTrigger className="w-[120px] h-7 text-xs"><SelectValue placeholder="Asignar box..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="201">Box 201</SelectItem>
                    <SelectItem value="202">Box 202</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" className="h-7 text-xs gap-1"><Play className="h-3 w-3" /> Llamar</Button>
              </div>
            </div>
            <div className="flex gap-1 flex-wrap">
              <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">Hemograma</Badge>
              <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">Audiometría</Badge>
              <Badge className="text-xs bg-green-100 text-green-800 border-green-300">ECG ✓</Badge>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" /> Documentos: <Badge variant="outline" className="text-xs">1/3</Badge>
              <span className="ml-2">Boxes pendientes:</span>
              <Badge variant="outline" className="text-xs">201</Badge>
              <Badge variant="outline" className="text-xs">203</Badge>
            </div>
          </CardContent>
        </Card>

        {/* En atención */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground">02</span>
                <div>
                  <span className="text-sm font-medium">María González</span>
                  <span className="text-xs text-muted-foreground ml-2">9.876.543-2</span>
                </div>
                <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-300">J</Badge>
                <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-300">En Box 201</Badge>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1"><CheckCircle2 className="h-3 w-3" /> Completar</Button>
              </div>
            </div>
            <div className="flex gap-1 flex-wrap">
              <Label className="flex items-center gap-1 text-xs cursor-pointer"><Checkbox /> <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">Espirometría</Badge></Label>
              <Label className="flex items-center gap-1 text-xs cursor-pointer"><Checkbox defaultChecked /> <Badge className="text-xs bg-green-100 text-green-800 border-green-300">Audiometría ✓</Badge></Label>
            </div>
          </CardContent>
        </Card>
      </div>
    </MockScreen>

    <Annotation type="action" number={1}><strong>Asignar a box:</strong> Seleccione el box en el desplegable y presione "Llamar". El paciente pasa a "En Atención".</Annotation>
    <Annotation type="action" number={2}><strong>Marcar exámenes:</strong> Use los checkboxes junto a cada examen para marcarlos como completados, muestra tomada o incompleto.</Annotation>
    <Annotation type="action" number={3}><strong>Completar atención:</strong> Cuando todos los exámenes estén listos, presione "Completar". Si quedan pendientes, se marcará como incompleto.</Annotation>
    <Annotation type="warning">Si otro usuario ya llamó al paciente a otro box, el sistema mostrará un error y actualizará la vista automáticamente.</Annotation>
    <Annotation type="info">El <strong>Chat Global</strong> en la esquina inferior permite comunicarse en tiempo real con todo el equipo.</Annotation>
  </div>
);

const MiBoxGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Mi Box</h3>
      <p className="text-muted-foreground">Módulo principal para la atención directa de pacientes. Permite gestionar la cola, completar formularios de exámenes y registrar resultados.</p>
    </div>

    {/* Box selection */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">1</span>
        Selección de Box
      </h4>
      <MockScreen title="Mi Box — Seleccionar Box">
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-3">Seleccione su box de trabajo</p>
          <Select defaultValue="">
            <SelectTrigger className="w-[200px] mx-auto"><SelectValue placeholder="Seleccionar box..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="201">Box 201 - Laboratorio</SelectItem>
              <SelectItem value="202">Box 202 - Audiometría</SelectItem>
              <SelectItem value="203">Box 203 - Espirometría</SelectItem>
            </SelectContent>
          </Select>
          <Button className="mt-3" disabled>Confirmar Box</Button>
        </div>
      </MockScreen>
      <Annotation type="info">El box seleccionado se guarda para sesiones futuras. Puede cambiarlo presionando "Cambiar Box".</Annotation>
    </div>

    {/* Tabs */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">2</span>
        Pestañas Principales
      </h4>
      <MockScreen title="Mi Box — Box 201 Laboratorio" caption="Tres pestañas principales: Cola de Espera, Paciente en Atención y Completados del Box.">
        <Tabs defaultValue="cola" className="w-full">
          <div className="flex items-center justify-between mb-3">
            <TabsList>
              <TabsTrigger value="cola" className="text-xs gap-1"><Clock className="h-3 w-3" /> Cola (5)</TabsTrigger>
              <TabsTrigger value="atencion" className="text-xs gap-1"><UserCheck className="h-3 w-3" /> En Atención</TabsTrigger>
              <TabsTrigger value="completados" className="text-xs gap-1"><Check className="h-3 w-3" /> Completados (8)</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Label className="text-xs flex items-center gap-1">Modo múltiple <Switch /></Label>
            </div>
          </div>

          <TabsContent value="cola">
            <div className="space-y-2">
              {[
                { n: "01", nombre: "Juan Pérez López", rut: "12.345.678-9", tipo: "WM", exams: ["Hemograma", "Orina"], otros: ["Audiometría (Box 202)"] },
                { n: "03", nombre: "Carlos Muñoz", rut: "15.678.901-K", tipo: "WM", exams: ["Hemograma"], otros: [] },
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
                    </div>
                    <Button size="sm" className="h-7 text-xs gap-1"><Play className="h-3 w-3" /> Llamar</Button>
                  </div>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {p.exams.map((e) => <Badge key={e} className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">{e}</Badge>)}
                    {p.otros.map((e) => <Badge key={e} className="text-xs bg-muted text-muted-foreground">{e}</Badge>)}
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </MockScreen>
      <Annotation type="info">Los <strong>badges amarillos</strong> son exámenes pendientes en SU box. Los <strong>badges grises</strong> son de otros boxes (solo referencia).</Annotation>
      <Annotation type="tip">Active el <strong>"Modo múltiple"</strong> para atender varios pacientes simultáneamente en su box.</Annotation>
    </div>

    {/* Patient in attention */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">3</span>
        Paciente en Atención — Formularios de Examen
      </h4>
      <MockScreen title="Mi Box — Paciente en Atención" caption="Al llamar un paciente, aparecen los formularios de cada examen para completar resultados.">
        <div className="space-y-4">
          {/* Patient header */}
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div>
                <p className="font-semibold">Juan Pérez López</p>
                <p className="text-xs text-muted-foreground">12.345.678-9 · 35 años · Minera Los Andes</p>
              </div>
              <Badge className="text-xs">Workmed</Badge>
            </div>
          </div>
          
          {/* Exam forms */}
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
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <Label className="text-xs">Glóbulos Blancos</Label>
                  <Input className="h-7 text-xs" placeholder="Valor..." readOnly />
                </div>
                <div>
                  <Label className="text-xs">Glóbulos Rojos</Label>
                  <Input className="h-7 text-xs" placeholder="Valor..." readOnly />
                </div>
                <div>
                  <Label className="text-xs">Hemoglobina</Label>
                  <Input className="h-7 text-xs" placeholder="Valor..." readOnly />
                </div>
                <div>
                  <Label className="text-xs">Hematocrito</Label>
                  <Input className="h-7 text-xs" placeholder="Valor..." readOnly />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="text-xs gap-1 bg-green-600 hover:bg-green-700" disabled><CheckCircle2 className="h-3 w-3" /> Completado</Button>
                <Button size="sm" variant="outline" className="text-xs gap-1 text-blue-600" disabled><Clock className="h-3 w-3" /> Muestra Tomada</Button>
                <Button size="sm" variant="outline" className="text-xs gap-1 text-red-600" disabled><XCircle className="h-3 w-3" /> Incompleto</Button>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="text-xs gap-1" disabled><RotateCcw className="h-3 w-3" /> Liberar</Button>
            <Button className="text-xs gap-1" disabled><CheckCircle2 className="h-3 w-3" /> Completar Atención</Button>
          </div>
        </div>
      </MockScreen>
      <Annotation type="action" number={1}>Complete los <strong>campos del formulario</strong> con los resultados del examen.</Annotation>
      <Annotation type="action" number={2}>Marque el examen como: <strong>✅ Completado</strong>, <strong>🔵 Muestra Tomada</strong> (resultado viene después) o <strong>❌ Incompleto</strong>.</Annotation>
      <Annotation type="action" number={3}><strong>"Liberar"</strong> devuelve al paciente a la cola para ir a otro box. <strong>"Completar Atención"</strong> finaliza si ya no quedan exámenes pendientes.</Annotation>
      <Annotation type="tip">Si el examen incluye <strong>presión arterial</strong>, puede configurar un temporizador para la segunda toma que aparecerá como badge en la cola.</Annotation>
    </div>
  </div>
);

const CompletadosGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Completados</h3>
      <p className="text-muted-foreground">Revise y gestione atenciones finalizadas. Puede revertir atenciones y hacer seguimiento de resultados pendientes.</p>
    </div>

    <MockScreen title="Completados — Atenciones Finalizadas" caption="Lista de atenciones completadas con opción de revertir.">
      <Tabs defaultValue="completados" className="w-full">
        <TabsList className="mb-3">
          <TabsTrigger value="completados" className="text-xs">Completados</TabsTrigger>
          <TabsTrigger value="metricas" className="text-xs">Métricas</TabsTrigger>
          <TabsTrigger value="pendientes" className="text-xs">Resultados Pendientes</TabsTrigger>
        </TabsList>
        <TabsContent value="completados">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-xs">WM: 7</Badge>
              <Badge variant="secondary" className="text-xs">J: 5</Badge>
              <Badge className="text-xs">Total: 12</Badge>
            </div>
            <Button variant="outline" size="sm" className="text-xs gap-1"><Calendar className="h-3 w-3" /> Hoy</Button>
          </div>
          <div className="space-y-2">
            <Card className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs">01</span>
                  <span className="text-sm font-medium">Ana Martínez</span>
                  <span className="text-xs text-muted-foreground">11.222.333-4</span>
                  <Badge variant="outline" className="text-xs">Minera Los Andes</Badge>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1"><RotateCcw className="h-3 w-3" /> Revertir</Button>
              </div>
              <div className="flex gap-1 mt-2">
                <Badge className="text-xs bg-green-100 text-green-800 border-green-300">Hemograma ✓</Badge>
                <Badge className="text-xs bg-green-100 text-green-800 border-green-300">ECG ✓</Badge>
                <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-300">Orina 🔵</Badge>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </MockScreen>

    <Annotation type="action"><strong>Revertir:</strong> Presione ↩️, seleccione qué exámenes revertir a pendiente, y la atención vuelve a "En Espera".</Annotation>
    <Annotation type="tip">La pestaña <strong>"Resultados Pendientes"</strong> lista exámenes con muestra tomada (🔵) sin resultado final. Revísela regularmente para completar resultados de laboratorio.</Annotation>
  </div>
);

const IncompletosGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Incompletos</h3>
      <p className="text-muted-foreground">Gestione atenciones que no pudieron completarse. Identifique qué exámenes quedaron pendientes y reactive atenciones.</p>
    </div>

    <MockScreen title="Incompletos — Atenciones No Completadas">
      <div className="flex gap-2 mb-3">
        <Button variant="outline" size="sm" className="text-xs gap-1"><Calendar className="h-3 w-3" /> Rango: 01/03 - 10/03</Button>
        <Badge variant="secondary" className="text-xs">WM: 3</Badge>
        <Badge variant="secondary" className="text-xs">J: 2</Badge>
      </div>
      <Card className="p-3 border-l-4 border-l-red-400">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Pedro Soto</span>
            <span className="text-xs text-muted-foreground">14.555.666-7</span>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"><RotateCcw className="h-3 w-3" /> Reactivar</Button>
        </div>
        <div className="flex gap-1 mt-2">
          <Badge className="text-xs bg-red-100 text-red-800 border-red-300">Espirometría ❌</Badge>
          <Badge className="text-xs bg-green-100 text-green-800 border-green-300">Hemograma ✓</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Motivo: Paciente con crisis de ansiedad, no pudo completar espirometría</p>
      </Card>
    </MockScreen>
    <Annotation type="action"><strong>Reactivar:</strong> Presione ↩️ para devolver la atención a "En Espera" con sus exámenes pendientes listos para retomar.</Annotation>
  </div>
);

const EvaluacionMedicaGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Evaluación Médica</h3>
      <p className="text-muted-foreground">Módulo exclusivo para la evaluación clínica integral. Revise resultados de exámenes y emita dictámenes de aptitud.</p>
    </div>

    {/* Status legend */}
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Estados de Baterías</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { color: "bg-green-500", label: "Lista para evaluar", desc: "Todos los exámenes completados" },
            { color: "bg-yellow-400", label: "Esperando resultados", desc: "Muestras tomadas sin resultado" },
            { color: "bg-gray-300 dark:bg-gray-600", label: "Pendiente", desc: "Exámenes sin realizar" },
            { color: "bg-blue-500", label: "Evaluado - Apto", desc: "Dictamen: Apto" },
            { color: "bg-orange-500", label: "Evaluado - Restricciones", desc: "Dictamen: Apto con restricciones" },
            { color: "bg-red-500", label: "Evaluado - No Apto", desc: "Dictamen: No Apto" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${s.color} shrink-0`} />
              <div>
                <p className="text-xs font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Patient list */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">1</span>
        Listado de Pacientes del Día
      </h4>
      <MockScreen title="Evaluación Médica — Listado" caption="Filtre por estado para ver solo los pacientes listos para evaluar.">
        <div className="flex gap-2 mb-3 flex-wrap">
          <Label className="flex items-center gap-1.5 text-xs cursor-pointer"><Checkbox defaultChecked /><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Lista</Label>
          <Label className="flex items-center gap-1.5 text-xs cursor-pointer"><Checkbox defaultChecked /><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> Esperando</Label>
          <Label className="flex items-center gap-1.5 text-xs cursor-pointer"><Checkbox /><span className="w-3 h-3 rounded-full bg-gray-300 inline-block" /> Pendiente</Label>
          <Label className="flex items-center gap-1.5 text-xs cursor-pointer"><Checkbox /><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Evaluado</Label>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">N°</TableHead>
              <TableHead className="text-xs">Paciente</TableHead>
              <TableHead className="text-xs">Empresa</TableHead>
              <TableHead className="text-xs">Baterías</TableHead>
              <TableHead className="text-xs">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="text-xs font-mono">01</TableCell>
              <TableCell className="text-xs font-medium">María González</TableCell>
              <TableCell className="text-xs">Constructora Bío-Bío</TableCell>
              <TableCell>
                <Badge className="text-xs bg-green-100 text-green-800 border-green-300">Pre-Ocupacional ✓</Badge>
              </TableCell>
              <TableCell><Button size="sm" className="h-6 text-xs" disabled>Evaluar</Button></TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-xs font-mono">02</TableCell>
              <TableCell className="text-xs font-medium">Pedro Soto</TableCell>
              <TableCell className="text-xs">Minera Los Andes</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">Altura ⏳</Badge>
                  <Badge className="text-xs bg-green-100 text-green-800 border-green-300">Estándar ✓</Badge>
                </div>
              </TableCell>
              <TableCell><Button size="sm" variant="outline" className="h-6 text-xs" disabled>Evaluar</Button></TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-xs font-mono">04</TableCell>
              <TableCell className="text-xs font-medium">Ana López</TableCell>
              <TableCell className="text-xs">Constructora Bío-Bío</TableCell>
              <TableCell>
                <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-300">Pre-Ocupacional: Apto ✓</Badge>
              </TableCell>
              <TableCell><Button size="sm" variant="ghost" className="h-6 text-xs" disabled>Ver</Button></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </MockScreen>
    </div>

    {/* Evaluation form */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">2</span>
        Formulario de Evaluación
      </h4>
      <MockScreen title="Evaluación Médica — Evaluar Paciente" caption="Revise los resultados de exámenes y complete el dictamen.">
        <div className="space-y-4">
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="font-semibold">María González · 9.876.543-2</p>
            <p className="text-xs text-muted-foreground">Constructora Bío-Bío · Ingreso #01</p>
          </div>

          <Card>
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-sm">Resultados de Exámenes — Pre-Ocupacional</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-xs font-medium">Hemograma</TableCell>
                    <TableCell className="text-xs">GB: 7.2 | GR: 4.8 | Hb: 14.2</TableCell>
                    <TableCell><Badge className="text-xs bg-green-100 text-green-800">✓</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs font-medium">Audiometría</TableCell>
                    <TableCell className="text-xs">Normal bilateral</TableCell>
                    <TableCell><Badge className="text-xs bg-green-100 text-green-800">✓</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs font-medium">Espirometría</TableCell>
                    <TableCell className="text-xs">FVC: 4.2L | FEV1: 3.8L</TableCell>
                    <TableCell><Badge className="text-xs bg-green-100 text-green-800">✓</Badge></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <div>
              <Label className="text-sm font-semibold">Resultado</Label>
              <RadioGroup defaultValue="apto" className="flex gap-4 mt-2">
                <Label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="apto" /> Apto</Label>
                <Label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="no_apto" /> No Apto</Label>
                <Label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="restricciones" /> Apto con Restricciones</Label>
              </RadioGroup>
            </div>
            <div>
              <Label className="text-xs">Observaciones</Label>
              <Textarea className="text-xs h-16" placeholder="Observaciones clínicas..." readOnly />
            </div>
            <div>
              <Label className="text-xs">Restricciones (si aplica)</Label>
              <Textarea className="text-xs h-12" placeholder="Detalle de restricciones..." readOnly />
            </div>
            <Button className="w-full" disabled>Guardar Evaluación</Button>
          </div>
        </div>
      </MockScreen>
      <Annotation type="action" number={1}>Revise los <strong>resultados de todos los exámenes</strong> de la batería.</Annotation>
      <Annotation type="action" number={2}>Seleccione el <strong>resultado</strong>: Apto, No Apto, o Apto con Restricciones.</Annotation>
      <Annotation type="action" number={3}>Complete las <strong>observaciones clínicas</strong> y restricciones si aplica.</Annotation>
      <Annotation type="action" number={4}>Presione <strong>"Guardar Evaluación"</strong>. Se asigna un número de informe correlativo automáticamente.</Annotation>
    </div>

    {/* No Aptos */}
    <div>
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">3</span>
        Pestaña "No Aptos" y Re-evaluación
      </h4>
      <MockScreen title="Evaluación Médica — No Aptos">
        <Card className="p-3 border-l-4 border-l-red-400">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Roberto Díaz</span>
              <span className="text-xs text-muted-foreground ml-2">· Minera Los Andes · Pre-Ocupacional Altura</span>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs" disabled>Re-evaluar</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Observaciones: Hipoacusia severa bilateral incompatible con trabajo en altura</p>
          <p className="text-xs text-muted-foreground">Evaluado: 08/03/2026 por Dr. García</p>
        </Card>
      </MockScreen>
      <Annotation type="tip">Use la pestaña <strong>"No Aptos"</strong> para hacer seguimiento y <strong>re-evaluar</strong> si las condiciones del paciente cambian. Se registra quién revisó y cuándo.</Annotation>
    </div>
  </div>
);

const EmpresasGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Empresas</h3>
      <p className="text-muted-foreground">Administre empresas cliente, sus baterías de exámenes con valores diferenciados y las faenas asociadas.</p>
    </div>
    <MockScreen title="Empresas — Gestión">
      <div className="flex justify-between mb-3">
        <Input placeholder="🔍 Buscar empresa..." className="w-[250px] h-8 text-xs" readOnly />
        <Button size="sm" className="text-xs gap-1"><Plus className="h-3 w-3" /> Nueva Empresa</Button>
      </div>
      <Table>
        <TableHeader><TableRow>
          <TableHead className="text-xs">Nombre</TableHead>
          <TableHead className="text-xs">RUT</TableHead>
          <TableHead className="text-xs">Contacto</TableHead>
          <TableHead className="text-xs">Acciones</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="text-xs font-medium">Minera Los Andes</TableCell>
            <TableCell className="text-xs">76.123.456-7</TableCell>
            <TableCell className="text-xs">contacto@mineraandes.cl</TableCell>
            <TableCell><div className="flex gap-1"><Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Pencil className="h-3 w-3" /></Button><Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"><Trash2 className="h-3 w-3" /></Button></div></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </MockScreen>
    <Annotation type="info">Al editar una empresa, accede a pestañas de <strong>Datos</strong>, <strong>Baterías</strong> (con valores por empresa) y <strong>Faenas</strong> asociadas.</Annotation>
  </div>
);

const BoxesGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Boxes</h3>
      <p className="text-muted-foreground">Configure las salas y estaciones de atención del centro.</p>
    </div>
    <MockScreen title="Boxes — Configuración">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {["201 - Laboratorio", "202 - Audiometría", "203 - Espirometría"].map((box) => (
          <Card key={box} className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{box}</span>
              <Switch defaultChecked />
            </div>
            <p className="text-xs text-muted-foreground mt-1">3 exámenes asignados</p>
          </Card>
        ))}
      </div>
    </MockScreen>
    <Annotation type="warning">La asignación correcta de exámenes a boxes es <strong>crucial</strong> para el flujo de pacientes. Configúrelo en el módulo de Exámenes.</Annotation>
  </div>
);

const ExamenesGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Exámenes</h3>
      <p className="text-muted-foreground">Catálogo de exámenes, baterías (paquetes), formularios y trazabilidad.</p>
    </div>
    <MockScreen title="Exámenes — Pestañas" caption="Cuatro pestañas principales para gestionar todo el catálogo.">
      <Tabs defaultValue="examenes" className="w-full">
        <TabsList className="mb-3">
          <TabsTrigger value="examenes" className="text-xs">Exámenes</TabsTrigger>
          <TabsTrigger value="baterias" className="text-xs">Baterías</TabsTrigger>
          <TabsTrigger value="formularios" className="text-xs">Formularios</TabsTrigger>
          <TabsTrigger value="trazabilidad" className="text-xs">Trazabilidad</TabsTrigger>
        </TabsList>
        <TabsContent value="examenes">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-xs">Nombre</TableHead>
              <TableHead className="text-xs">Código</TableHead>
              <TableHead className="text-xs">Box</TableHead>
              <TableHead className="text-xs">Costo</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="text-xs">Hemograma</TableCell>
                <TableCell className="text-xs font-mono">HEM-001</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">Box 201</Badge></TableCell>
                <TableCell className="text-xs">$5.000</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-xs">Audiometría</TableCell>
                <TableCell className="text-xs font-mono">AUD-001</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">Box 202</Badge></TableCell>
                <TableCell className="text-xs">$8.000</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </MockScreen>
    <Annotation type="info"><strong>Baterías</strong> = paquetes de exámenes. Cada empresa puede tener un precio diferenciado para la misma batería.</Annotation>
    <Annotation type="info"><strong>Formularios</strong>: configure los campos (texto, número, select, archivo) que aparecen en Mi Box al realizar el examen.</Annotation>
  </div>
);

const DocumentosGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Documentos</h3>
      <p className="text-muted-foreground">Cree y administre formularios digitales: consentimientos, declaraciones y cuestionarios.</p>
    </div>
    <MockScreen title="Documentos — Editor">
      <div className="space-y-3">
        <div className="flex gap-2 mb-3">
          <Badge variant="outline" className="text-xs">Consentimiento</Badge>
          <Badge variant="outline" className="text-xs">Declaración</Badge>
          <Badge variant="outline" className="text-xs">Cuestionario</Badge>
        </div>
        <Card className="p-3 border-dashed">
          <p className="text-xs text-muted-foreground">Ejemplo de texto con variable dinámica:</p>
          <p className="text-sm mt-1">Yo, <strong className="text-primary">{"{{nombre}}"}</strong>, RUT <strong className="text-primary">{"{{rut}}"}</strong>, trabajador de <strong className="text-primary">{"{{empresa}}"}</strong>, declaro...</p>
        </Card>
        <div className="flex gap-2">
          <Badge className="text-xs">{"{{nombre}}"}</Badge>
          <Badge className="text-xs">{"{{rut}}"}</Badge>
          <Badge className="text-xs">{"{{empresa}}"}</Badge>
          <Badge className="text-xs">{"{{fecha_actual}}"}</Badge>
          <Badge className="text-xs">{"{{numero_ingreso}}"}</Badge>
        </div>
      </div>
    </MockScreen>
    <Annotation type="tip">Las <strong>variables dinámicas</strong> se reemplazan automáticamente con los datos reales del paciente al completar el documento.</Annotation>
  </div>
);

const PantallaTvGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Pantalla TV</h3>
      <p className="text-muted-foreground">Configure la pantalla de sala de espera con llamados de pacientes y códigos QR.</p>
    </div>
    <MockScreen title="Pantalla TV — Modo Pantalla" caption="Vista de pantalla completa que se muestra en la TV de sala de espera.">
      <div className="bg-foreground text-background rounded-lg p-8 text-center">
        <p className="text-xs opacity-60 mb-4">CENTRO MÉDICO JENNER</p>
        <div className="text-3xl font-bold mb-2">🔔 Juan Pérez López</div>
        <div className="text-xl opacity-80">Diríjase a <strong>Box 201</strong></div>
        <div className="text-sm opacity-50 mt-4">Ingreso #01</div>
        <Separator className="my-4 bg-background/20" />
        <div className="text-sm opacity-60">Código del día: <span className="font-mono font-bold">A7X3</span></div>
      </div>
    </MockScreen>
    <Annotation type="info">Incluye <strong>llamado por voz automático</strong> que anuncia el nombre del paciente y el box destino.</Annotation>
    <Annotation type="info">El modo <strong>QR</strong> alterna entre la pantalla de llamados y los códigos QR configurados.</Annotation>
  </div>
);

const ConfiguracionGuide = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-bold text-foreground mb-2">Configuración</h3>
      <p className="text-muted-foreground">Configure bloques de agenda y gestione faenas del sistema.</p>
    </div>
    <MockScreen title="Configuración — Bloques de Agenda">
      <Table>
        <TableHeader><TableRow>
          <TableHead className="text-xs">Bloque</TableHead>
          <TableHead className="text-xs">Horario</TableHead>
          <TableHead className="text-xs">Cupo</TableHead>
          <TableHead className="text-xs">Activo</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="text-xs">Mañana</TableCell>
            <TableCell className="text-xs">07:00 - 12:00</TableCell>
            <TableCell className="text-xs">15</TableCell>
            <TableCell><Switch defaultChecked /></TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="text-xs">Tarde</TableCell>
            <TableCell className="text-xs">14:00 - 18:00</TableCell>
            <TableCell className="text-xs">10</TableCell>
            <TableCell><Switch defaultChecked /></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </MockScreen>
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
};

// ── Color legend ──
const colorLegend = [
  { color: "bg-yellow-400", label: "Pendiente", desc: "Examen aún no realizado" },
  { color: "bg-blue-400", label: "Muestra Tomada", desc: "Muestra tomada, resultado pendiente" },
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
                <p className="text-sm text-muted-foreground">Ingrese con su usuario y contraseña. La barra de navegación mostrará solo sus módulos. Use 🌙/☀️ para modo claro/oscuro y el candado 🔒 para cambiar contraseña.</p>
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
                    <div className="flex-1">
                      <CardTitle className="text-base">{mod.label}</CardTitle>
                    </div>
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
