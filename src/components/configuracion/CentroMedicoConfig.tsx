import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Building2, Upload, Save, Image, Trash2 } from "lucide-react";

const CentroMedicoConfig = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFondo, setUploadingFondo] = useState(false);
  const [config, setConfig] = useState({
    id: "",
    nombre_centro: "",
    direccion: "",
    telefono: "",
    web: "",
    email_contacto: "",
    parrafo_legal: "",
    logo_url: "",
    fondo_url: "",
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("configuracion_centro")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;
      if (data) {
        setConfig({
          id: data.id,
          nombre_centro: data.nombre_centro || "",
          direccion: data.direccion || "",
          telefono: data.telefono || "",
          web: data.web || "",
          email_contacto: data.email_contacto || "",
          parrafo_legal: data.parrafo_legal || "",
          logo_url: data.logo_url || "",
          fondo_url: (data as any).fondo_url || "",
        });
      }
    } catch (error) {
      console.error("Error loading config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("configuracion_centro")
        .update({
          nombre_centro: config.nombre_centro,
          direccion: config.direccion,
          telefono: config.telefono,
          web: config.web,
          email_contacto: config.email_contacto,
          parrafo_legal: config.parrafo_legal,
          logo_url: config.logo_url,
          fondo_url: config.fondo_url,
        } as any)
        .eq("id", config.id);

      if (error) throw error;
      toast.success("Configuración guardada");
    } catch (error: any) {
      toast.error("Error al guardar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `logo/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("centro-assets")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("centro-assets")
        .getPublicUrl(path);

      const logo_url = urlData.publicUrl;
      setConfig((prev) => ({ ...prev, logo_url }));

      await supabase
        .from("configuracion_centro")
        .update({ logo_url })
        .eq("id", config.id);

      toast.success("Logo actualizado");
    } catch (error: any) {
      toast.error("Error al subir logo: " + error.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFondoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFondo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `fondo/fondo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("centro-assets")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("centro-assets")
        .getPublicUrl(path);

      const fondo_url = urlData.publicUrl;
      setConfig((prev) => ({ ...prev, fondo_url }));

      await supabase
        .from("configuracion_centro")
        .update({ fondo_url } as any)
        .eq("id", config.id);

      toast.success("Fondo de hoja actualizado");
    } catch (error: any) {
      toast.error("Error al subir fondo: " + error.message);
    } finally {
      setUploadingFondo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Datos del Centro Médico
          </CardTitle>
          <CardDescription>
            Información que aparece en los informes PDF generados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo */}
          <div className="space-y-2">
            <Label>Logo del Centro</Label>
            <div className="flex items-center gap-4">
              {config.logo_url && (
                <img
                  src={config.logo_url}
                  alt="Logo"
                  className="h-16 object-contain border rounded p-1"
                />
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("logo-upload")?.click()}
                  disabled={uploadingLogo}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingLogo ? "Subiendo..." : "Subir Logo"}
                </Button>
              </div>
            </div>
          </div>

          {/* Fondo de hoja */}
          <div className="space-y-2">
            <Label>Fondo de Hoja (PDF)</Label>
            <p className="text-xs text-muted-foreground">
              Imagen de fondo para las páginas del informe PDF (tamaño carta recomendado: 816x1056px)
            </p>
            <div className="flex items-center gap-4">
              {config.fondo_url && (
                <img
                  src={config.fondo_url}
                  alt="Fondo"
                  className="h-24 object-contain border rounded p-1"
                />
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFondoUpload}
                  className="hidden"
                  id="fondo-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("fondo-upload")?.click()}
                  disabled={uploadingFondo}
                >
                  <Image className="h-4 w-4 mr-2" />
                  {uploadingFondo ? "Subiendo..." : "Subir Fondo"}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nombre del Centro</Label>
              <Input
                value={config.nombre_centro}
                onChange={(e) => setConfig({ ...config, nombre_centro: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input
                value={config.direccion}
                onChange={(e) => setConfig({ ...config, direccion: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={config.telefono}
                onChange={(e) => setConfig({ ...config, telefono: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Sitio Web</Label>
              <Input
                value={config.web}
                onChange={(e) => setConfig({ ...config, web: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Email de Contacto</Label>
              <Input
                value={config.email_contacto}
                onChange={(e) => setConfig({ ...config, email_contacto: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Párrafo Legal (final del informe PDF)</Label>
            <Textarea
              rows={4}
              value={config.parrafo_legal}
              onChange={(e) => setConfig({ ...config, parrafo_legal: e.target.value })}
            />
          </div>

          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Guardando..." : "Guardar Configuración"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CentroMedicoConfig;
