import { useEffect, useState, useMemo } from "react";
import { useEmpresaAuth } from "@/contexts/EmpresaAuthContext";
import EmpresaLayout from "@/components/empresa/EmpresaLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { Search, Package, FileText, DollarSign, MapPin } from "lucide-react";

interface Faena {
  id: string;
  nombre: string;
}

interface BateriaConPrecio {
  id: string;
  nombre: string;
  descripcion: string | null;
  valor: number;
  examenes: { examen: { id: string; nombre: string; codigo: string | null } }[];
  faenaNombre?: string;
}

interface FaenaExamenIndividual {
  id: string;
  nombre: string;
  codigo: string | null;
  valor_venta: number;
  faenaNombre: string;
}

const EmpresaBaterias = () => {
  const { currentEmpresaId } = useEmpresaAuth();

  const [faenas, setFaenas] = useState<Faena[]>([]);
  const [baterias, setBaterias] = useState<BateriaConPrecio[]>([]);
  const [examenesIndividuales, setExamenesIndividuales] = useState<FaenaExamenIndividual[]>([]);
  const [selectedFaenaId, setSelectedFaenaId] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState("");
  const [faenaBateriasMap, setFaenaBateriasMap] = useState<Record<string, { id: string; nombre: string; examenes: { nombre: string; codigo: string | null }[] }[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("faenas");

  useEffect(() => {
    if (currentEmpresaId) {
      loadFaenas();
    } else {
      setLoading(false);
    }
  }, [currentEmpresaId]);

  useEffect(() => {
    if (currentEmpresaId) {
      loadBaterias();
      loadExamenesIndividuales();
    }
  }, [selectedFaenaId, currentEmpresaId]);

  const loadFaenas = async () => {
    if (!currentEmpresaId) return;
    // Load faenas via empresa_faenas (many-to-many)
    const { data: efData } = await supabase
      .from("empresa_faenas")
      .select("faena_id, faenas(id, nombre)")
      .eq("empresa_id", currentEmpresaId)
      .eq("activo", true);

    const faenasList: Faena[] = (efData || [])
      .map((ef: any) => ef.faenas)
      .filter(Boolean)
      .sort((a: Faena, b: Faena) => a.nombre.localeCompare(b.nombre));
    setFaenas(faenasList);

    // Load bateria_faenas composition for each faena
    const faenaIds = faenasList.map(f => f.id);
    if (faenaIds.length > 0) {
      const { data: bfData } = await supabase
        .from("bateria_faenas")
        .select("faena_id, paquete_id, paquete:paquetes_examenes(id, nombre, examenes:paquete_examen_items(examen:examenes(nombre, codigo)))")
        .in("faena_id", faenaIds)
        .eq("activo", true);

      const map: Record<string, { id: string; nombre: string; examenes: { nombre: string; codigo: string | null }[] }[]> = {};
      (bfData || []).forEach((bf: any) => {
        if (!bf.paquete) return;
        if (!map[bf.faena_id]) map[bf.faena_id] = [];
        map[bf.faena_id].push({
          id: bf.paquete.id,
          nombre: bf.paquete.nombre,
          examenes: (bf.paquete.examenes || []).map((e: any) => e.examen).filter(Boolean),
        });
      });
      setFaenaBateriasMap(map);
    }
  };

  const loadBaterias = async () => {
    if (!currentEmpresaId) return;
    setLoading(true);
    try {
      // Get assigned faena IDs
      const { data: efData } = await supabase
        .from("empresa_faenas")
        .select("faena_id")
        .eq("empresa_id", currentEmpresaId)
        .eq("activo", true);
      const faenaIds = (efData || []).map((ef: any) => ef.faena_id);

      // If filtering by specific faena
      const targetFaenaIds = selectedFaenaId ? [selectedFaenaId] : faenaIds;

      if (targetFaenaIds.length === 0) {
        setBaterias([]);
        setLoading(false);
        return;
      }

      // Get paquete_ids from bateria_faenas for these faenas
      const { data: bfData } = await supabase
        .from("bateria_faenas")
        .select("paquete_id, faena_id")
        .in("faena_id", targetFaenaIds)
        .neq("activo", false);

      const paqueteIds = [...new Set((bfData || []).map((bf: any) => bf.paquete_id))];
      if (paqueteIds.length === 0) {
        setBaterias([]);
        setLoading(false);
        return;
      }

      // Build faena name map per paquete
      const faenaNameMap: Record<string, string[]> = {};
      const faenaMap = new Map(faenas.map(f => [f.id, f.nombre]));
      (bfData || []).forEach((bf: any) => {
        if (!faenaNameMap[bf.paquete_id]) faenaNameMap[bf.paquete_id] = [];
        const name = faenaMap.get(bf.faena_id);
        if (name && !faenaNameMap[bf.paquete_id].includes(name)) {
          faenaNameMap[bf.paquete_id].push(name);
        }
      });

      // Get empresa_baterias with prices
      const { data: empresaBaterias } = await supabase
        .from("empresa_baterias")
        .select(`
          valor,
          paquete_id,
          paquete:paquetes_examenes(
            id,
            nombre,
            descripcion,
            examenes:paquete_examen_items(examen:examenes(id, nombre, codigo))
          )
        `)
        .eq("empresa_id", currentEmpresaId)
        .eq("activo", true)
        .in("paquete_id", paqueteIds);

      const bats: BateriaConPrecio[] = (empresaBaterias || [])
        .filter((eb: any) => eb.paquete && eb.valor > 0)
        .map((eb: any) => ({
          id: eb.paquete.id,
          nombre: eb.paquete.nombre,
          descripcion: eb.paquete.descripcion,
          valor: eb.valor,
          examenes: eb.paquete.examenes || [],
          faenaNombre: (faenaNameMap[eb.paquete_id] || []).join(", "),
        }));
      setBaterias(bats);
    } catch (error) {
      console.error("Error cargando baterías:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadExamenesIndividuales = async () => {
    if (!currentEmpresaId) return;
    try {
      const { data: efData } = await supabase
        .from("empresa_faenas")
        .select("faena_id, faenas(id, nombre)")
        .eq("empresa_id", currentEmpresaId)
        .eq("activo", true);

      const targetFaenaIds = selectedFaenaId
        ? [selectedFaenaId]
        : (efData || []).map((ef: any) => ef.faena_id);

      if (targetFaenaIds.length === 0) {
        setExamenesIndividuales([]);
        return;
      }

      const faenaMap = new Map((efData || []).map((ef: any) => [ef.faena_id, ef.faenas?.nombre || ""]));

      const { data: feData } = await supabase
        .from("faena_examenes")
        .select("valor_venta, faena_id, examen:examenes(id, nombre, codigo)")
        .in("faena_id", targetFaenaIds)
        .eq("activo", true);

      const exams: FaenaExamenIndividual[] = (feData || [])
        .filter((fe: any) => fe.examen)
        .map((fe: any) => ({
          id: fe.examen.id,
          nombre: fe.examen.nombre,
          codigo: fe.examen.codigo,
          valor_venta: fe.valor_venta || 0,
          faenaNombre: faenaMap.get(fe.faena_id) || "",
        }));
      setExamenesIndividuales(exams);
    } catch (error) {
      console.error("Error cargando exámenes individuales:", error);
    }
  };

  const filteredBaterias = useMemo(() => {
    if (!searchFilter) return baterias;
    const search = searchFilter.toLowerCase();
    return baterias.filter(
      (b) =>
        b.nombre.toLowerCase().includes(search) ||
        b.descripcion?.toLowerCase().includes(search)
    );
  }, [baterias, searchFilter]);

  const formatCurrency = (value: number) =>
    `$${Math.round(value).toLocaleString("es-CL")}`;

  return (
    <EmpresaLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Baterías Contratadas</h1>
          <p className="text-muted-foreground">
            Consulte faenas, baterías contratadas, exámenes incluidos y precios
          </p>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Faena</label>
                <Select
                  value={selectedFaenaId || "__all__"}
                  onValueChange={(v) => setSelectedFaenaId(v === "__all__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las faenas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas las faenas</SelectItem>
                    {faenas.map((faena) => (
                      <SelectItem key={faena.id} value={faena.id}>
                        {faena.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar batería..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="faenas" className="gap-2">
              <MapPin className="h-4 w-4" />
              Faenas
            </TabsTrigger>
            <TabsTrigger value="precios" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Baterías y Precios
            </TabsTrigger>
            <TabsTrigger value="examenes" className="gap-2">
              <FileText className="h-4 w-4" />
              Detalle Exámenes
            </TabsTrigger>
          </TabsList>

          {/* Tab Faenas */}
          <TabsContent value="faenas">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Faenas Asignadas ({faenas.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {faenas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay faenas asignadas a esta empresa
                  </div>
                ) : (
                  <div className="space-y-3">
                    {faenas.map((faena) => {
                      const batsDeFaena = faenaBateriasMap[faena.id] || [];
                      const examsIndiv = examenesIndividuales.filter(e =>
                        e.faenaNombre === faena.nombre
                      );
                      return (
                        <div key={faena.id} className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <MapPin className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold text-lg">{faena.nombre}</h3>
                            <Badge variant="secondary" className="ml-auto">
                              {batsDeFaena.length} baterías
                            </Badge>
                            {examsIndiv.length > 0 && (
                              <Badge variant="outline">
                                {examsIndiv.length} exámenes individuales
                              </Badge>
                            )}
                          </div>

                          {batsDeFaena.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm font-medium text-muted-foreground mb-2">Baterías:</p>
                              <Accordion type="single" collapsible className="w-full">
                                {batsDeFaena.map((bat) => (
                                  <AccordionItem key={bat.id} value={bat.id}>
                                    <AccordionTrigger className="py-2 px-3 bg-muted/50 rounded-lg hover:no-underline">
                                      <div className="flex items-center gap-2">
                                        <Package className="h-4 w-4 text-primary" />
                                        <span className="font-medium text-sm">{bat.nombre}</span>
                                        <Badge variant="secondary" className="text-xs">
                                          {bat.examenes?.length || 0} exámenes
                                        </Badge>
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-3 pt-2">
                                      <div className="grid gap-1">
                                        {bat.examenes.map((ex, idx) => (
                                          <div key={idx} className="flex items-center gap-2 py-1 text-sm">
                                            <FileText className="h-3 w-3 text-muted-foreground" />
                                            <span>{ex.nombre}</span>
                                            {ex.codigo && (
                                              <span className="text-xs text-muted-foreground font-mono">({ex.codigo})</span>
                                            )}
                                          </div>
                                        ))}
                                        {(!bat.examenes || bat.examenes.length === 0) && (
                                          <p className="text-sm text-muted-foreground">Sin exámenes configurados</p>
                                        )}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                ))}
                              </Accordion>
                            </div>
                          )}

                          {examsIndiv.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-2">Exámenes individuales:</p>
                              <div className="grid gap-1">
                                {examsIndiv.map((ex) => (
                                  <div key={ex.id} className="flex items-center justify-between bg-muted/30 rounded p-2">
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-sm">{ex.nombre}</span>
                                      {ex.codigo && (
                                        <span className="text-xs text-muted-foreground font-mono">{ex.codigo}</span>
                                      )}
                                    </div>
                                    <span className="text-sm font-medium">
                                      {formatCurrency(ex.valor_venta)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {batsDeFaena.length === 0 && examsIndiv.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                              Sin baterías ni exámenes configurados para esta faena
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Precios */}
          <TabsContent value="precios">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Baterías Contratadas ({filteredBaterias.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredBaterias.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No se encontraron baterías contratadas
                  </div>
                ) : (
                  <div className="border rounded-md divide-y">
                    {filteredBaterias.map((bateria) => (
                      <div
                        key={bateria.id}
                        className="flex items-center justify-between p-4"
                      >
                        <div className="flex items-center gap-3">
                          <Package className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">{bateria.nombre}</p>
                            {bateria.faenaNombre && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {bateria.faenaNombre}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">
                            {bateria.examenes?.length || 0} exámenes
                          </Badge>
                          <span className="text-lg font-semibold text-primary">
                            {formatCurrency(bateria.valor)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Exámenes */}
          <TabsContent value="examenes">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Detalle de Exámenes por Batería ({filteredBaterias.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredBaterias.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No se encontraron baterías contratadas
                  </div>
                ) : (
                  <Accordion type="single" collapsible className="w-full">
                    {filteredBaterias.map((bateria) => (
                      <AccordionItem key={bateria.id} value={bateria.id}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3">
                            <Package className="h-4 w-4 text-primary" />
                            <div className="text-left">
                              <div className="font-medium">{bateria.nombre}</div>
                              {bateria.faenaNombre && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {bateria.faenaNombre}
                                </div>
                              )}
                            </div>
                            <div className="ml-auto mr-2 flex items-center gap-2">
                              <Badge variant="secondary">
                                {bateria.examenes?.length || 0} exámenes
                              </Badge>
                              <Badge variant="outline" className="font-mono">
                                {formatCurrency(bateria.valor)}
                              </Badge>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pl-7 space-y-2">
                            <p className="text-sm font-medium text-muted-foreground mb-3">
                              Exámenes incluidos:
                            </p>
                            <div className="grid gap-2 md:grid-cols-2">
                              {bateria.examenes?.map((e) => (
                                <div
                                  key={e.examen?.id}
                                  className="flex items-center gap-2 p-2 rounded-lg bg-muted"
                                >
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <div className="text-sm font-medium">
                                      {e.examen?.nombre}
                                    </div>
                                    {e.examen?.codigo && (
                                      <div className="text-xs text-muted-foreground font-mono">
                                        {e.examen.codigo}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </EmpresaLayout>
  );
};

export default EmpresaBaterias;
