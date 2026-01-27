import { useEffect, useState, useMemo } from "react";
import { useEmpresaAuth } from "@/contexts/EmpresaAuthContext";
import EmpresaLayout from "@/components/empresa/EmpresaLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Search, Package, FileText } from "lucide-react";

interface Faena {
  id: string;
  nombre: string;
}

interface Bateria {
  id: string;
  nombre: string;
  descripcion: string | null;
  examenes: { examen: { id: string; nombre: string; codigo: string | null } }[];
}

const EmpresaBaterias = () => {
  const { empresaUsuario } = useEmpresaAuth();

  const [faenas, setFaenas] = useState<Faena[]>([]);
  const [baterias, setBaterias] = useState<Bateria[]>([]);
  const [selectedFaenaId, setSelectedFaenaId] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (empresaUsuario?.empresa_id) {
      loadFaenas();
    }
  }, [empresaUsuario?.empresa_id]);

  useEffect(() => {
    if (selectedFaenaId) {
      loadBateriasForFaena(selectedFaenaId);
    } else {
      loadAllBaterias();
    }
  }, [selectedFaenaId, empresaUsuario?.empresa_id]);

  const loadFaenas = async () => {
    if (!empresaUsuario?.empresa_id) return;

    const { data } = await supabase
      .from("faenas")
      .select("*")
      .eq("empresa_id", empresaUsuario.empresa_id)
      .eq("activo", true)
      .order("nombre");

    setFaenas(data || []);
  };

  const loadAllBaterias = async () => {
    if (!empresaUsuario?.empresa_id) return;

    setLoading(true);
    try {
      // Cargar baterías contratadas por la empresa
      const { data: empresaBaterias } = await supabase
        .from("empresa_baterias")
        .select(`
          paquete:paquetes_examenes(
            id,
            nombre,
            descripcion,
            examenes:paquete_examen_items(examen:examenes(id, nombre, codigo))
          )
        `)
        .eq("empresa_id", empresaUsuario.empresa_id)
        .eq("activo", true);

      const bats = empresaBaterias?.map((eb: any) => eb.paquete).filter(Boolean) || [];
      setBaterias(bats);
    } catch (error) {
      console.error("Error cargando baterías:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadBateriasForFaena = async (faenaId: string) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("bateria_faenas")
        .select(`
          paquete:paquetes_examenes(
            id,
            nombre,
            descripcion,
            examenes:paquete_examen_items(examen:examenes(id, nombre, codigo))
          )
        `)
        .eq("faena_id", faenaId)
        .eq("activo", true);

      const bats = data?.map((d: any) => d.paquete).filter(Boolean) || [];
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

  return (
    <EmpresaLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Información de Baterías</h1>
          <p className="text-muted-foreground">
            Consulte las baterías disponibles y su composición
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

        {/* Lista de baterías */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Baterías Disponibles ({filteredBaterias.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredBaterias.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron baterías
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
                        <Badge variant="secondary" className="ml-auto mr-2">
                          {bateria.examenes?.length || 0} exámenes
                        </Badge>
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
      </div>
    </EmpresaLayout>
  );
};

export default EmpresaBaterias;
