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
import { Search, Package, FileText, DollarSign } from "lucide-react";

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
}

const EmpresaBaterias = () => {
  const { currentEmpresaId } = useEmpresaAuth();

  const [faenas, setFaenas] = useState<Faena[]>([]);
  const [baterias, setBaterias] = useState<BateriaConPrecio[]>([]);
  const [selectedFaenaId, setSelectedFaenaId] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("precios");

  useEffect(() => {
    if (currentEmpresaId) {
      loadFaenas();
    } else {
      setLoading(false);
    }
  }, [currentEmpresaId]);

  useEffect(() => {
    if (selectedFaenaId) {
      loadBateriasForFaena(selectedFaenaId);
    } else if (currentEmpresaId) {
      loadAllBaterias();
    }
  }, [selectedFaenaId, currentEmpresaId]);

  const loadFaenas = async () => {
    if (!currentEmpresaId) return;
    const { data } = await supabase
      .from("faenas")
      .select("*")
      .eq("empresa_id", currentEmpresaId)
      .eq("activo", true)
      .order("nombre");
    setFaenas(data || []);
  };

  const loadAllBaterias = async () => {
    if (!currentEmpresaId) return;
    setLoading(true);
    try {
      const { data: empresaBaterias } = await supabase
        .from("empresa_baterias")
        .select(`
          valor,
          paquete:paquetes_examenes(
            id,
            nombre,
            descripcion,
            examenes:paquete_examen_items(examen:examenes(id, nombre, codigo))
          )
        `)
        .eq("empresa_id", currentEmpresaId)
        .eq("activo", true);

      const bats: BateriaConPrecio[] = (empresaBaterias || [])
        .filter((eb: any) => eb.paquete && eb.valor > 0)
        .map((eb: any) => ({
          id: eb.paquete.id,
          nombre: eb.paquete.nombre,
          descripcion: eb.paquete.descripcion,
          valor: eb.valor,
          examenes: eb.paquete.examenes || [],
        }));
      setBaterias(bats);
    } catch (error) {
      console.error("Error cargando baterías:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadBateriasForFaena = async (faenaId: string) => {
    if (!currentEmpresaId) return;
    setLoading(true);
    try {
      // Get batteries for this faena
      const { data: faenaBaterias } = await supabase
        .from("bateria_faenas")
        .select("paquete_id")
        .eq("faena_id", faenaId)
        .eq("activo", true);

      const paqueteIds = (faenaBaterias || []).map((fb: any) => fb.paquete_id);
      if (paqueteIds.length === 0) {
        setBaterias([]);
        setLoading(false);
        return;
      }

      // Get empresa_baterias with prices for those paquetes
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
        }));
      setBaterias(bats);
    } catch (error) {
      console.error("Error cargando baterías de faena:", error);
    } finally {
      setLoading(false);
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
            Consulte las baterías contratadas, sus precios y exámenes incluidos
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
                  value={selectedFaenaId}
                  onValueChange={(v) => setSelectedFaenaId(v === "__all__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las faenas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas las faenas</SelectItem>
                    {faenas.filter((f) => f.id).map((faena) => (
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

        {/* Tabs: Precios / Exámenes */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="precios" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Precios
            </TabsTrigger>
            <TabsTrigger value="examenes" className="gap-2">
              <FileText className="h-4 w-4" />
              Exámenes Contratados
            </TabsTrigger>
          </TabsList>

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
                            {bateria.descripcion && (
                              <p className="text-sm text-muted-foreground">
                                {bateria.descripcion}
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
                              {bateria.descripcion && (
                                <div className="text-sm text-muted-foreground">
                                  {bateria.descripcion}
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
