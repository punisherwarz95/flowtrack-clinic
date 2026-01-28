import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, Key, Search, Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface EmpresaUsuario {
  id: string;
  email: string;
  nombre: string;
  cargo: string | null;
  activo: boolean;
  auth_user_id: string | null;
  empresa_id: string;
  empresas: {
    id: string;
    nombre: string;
  } | null;
  roles: { role: string }[];
}

interface Empresa {
  id: string;
  nombre: string;
}

const EmpresaUsersList = () => {
  const [usuarios, setUsuarios] = useState<EmpresaUsuario[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<EmpresaUsuario | null>(null);
  const [newPassword, setNewPassword] = useState("");
  
  // Filters
  const [searchFilter, setSearchFilter] = useState("");
  const [empresaFilter, setEmpresaFilter] = useState<string>("");
  
  // Form state
  const [formNombre, setFormNombre] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formCargo, setFormCargo] = useState("");
  const [formEmpresaId, setFormEmpresaId] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usuariosResult, empresasResult] = await Promise.all([
        supabase
          .from("empresa_usuarios")
          .select(`
            *,
            empresas(id, nombre),
            roles:empresa_user_roles(role)
          `)
          .order("created_at", { ascending: false }),
        supabase
          .from("empresas")
          .select("id, nombre")
          .eq("activo", true)
          .order("nombre")
      ]);

      if (usuariosResult.error) throw usuariosResult.error;
      if (empresasResult.error) throw empresasResult.error;

      setUsuarios(usuariosResult.data as unknown as EmpresaUsuario[]);
      setEmpresas(empresasResult.data || []);
    } catch (error: any) {
      toast.error("Error al cargar datos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsuarios = useMemo(() => {
    return usuarios.filter((u) => {
      const matchesSearch = 
        u.nombre.toLowerCase().includes(searchFilter.toLowerCase()) ||
        u.email.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (u.cargo?.toLowerCase().includes(searchFilter.toLowerCase()) ?? false);
      
      const matchesEmpresa = !empresaFilter || u.empresa_id === empresaFilter;
      
      return matchesSearch && matchesEmpresa;
    });
  }, [usuarios, searchFilter, empresaFilter]);

  const handleCreateUser = async () => {
    if (!formNombre || !formEmail || !formPassword || !formEmpresaId) {
      toast.error("Todos los campos son requeridos");
      return;
    }

    if (formPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setIsCreating(true);
    try {
      // Obtener RUT de la empresa para el signup
      const { data: empresa } = await supabase
        .from("empresas")
        .select("rut")
        .eq("id", formEmpresaId)
        .single();

      if (!empresa?.rut) {
        toast.error("La empresa seleccionada no tiene RUT configurado");
        return;
      }

      // Usar la edge function de empresa-auth para crear el usuario
      const { data, error } = await supabase.functions.invoke("empresa-auth/signup", {
        body: {
          email: formEmail,
          password: formPassword,
          nombre: formNombre,
          cargo: formCargo || null,
          empresa_rut: empresa.rut,
        },
      });

      if (error) {
        toast.error("Error al crear usuario: " + error.message);
        return;
      }

      if (data?.error) {
        toast.error("Error: " + data.error);
        return;
      }

      toast.success("Usuario de empresa creado exitosamente");
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error("Error inesperado: " + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setFormNombre("");
    setFormEmail("");
    setFormPassword("");
    setFormCargo("");
    setFormEmpresaId("");
  };

  const handleToggleActive = async (usuario: EmpresaUsuario) => {
    try {
      const { error } = await supabase
        .from("empresa_usuarios")
        .update({ activo: !usuario.activo })
        .eq("id", usuario.id);

      if (error) throw error;

      toast.success(usuario.activo ? "Usuario desactivado" : "Usuario activado");
      loadData();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    }
  };

  const handleOpenPasswordDialog = (usuario: EmpresaUsuario) => {
    setSelectedUser(usuario);
    setNewPassword("");
    setPasswordDialogOpen(true);
  };

  const handleUpdatePassword = async () => {
    if (!selectedUser?.auth_user_id || !newPassword) {
      toast.error("El usuario no tiene cuenta de auth o falta la contraseña");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('update-password', {
        body: {
          userId: selectedUser.auth_user_id,
          newPassword: newPassword,
        }
      });

      if (error) {
        toast.error("Error al actualizar contraseña: " + error.message);
        return;
      }

      if (data?.error) {
        toast.error("Error: " + data.error);
        return;
      }

      toast.success("Contraseña actualizada exitosamente");
      setPasswordDialogOpen(false);
      setSelectedUser(null);
      setNewPassword("");
    } catch (error: any) {
      toast.error("Error inesperado: " + error.message);
    }
  };

  const handleDeleteUser = async (usuario: EmpresaUsuario) => {
    if (!confirm(`¿Estás seguro de eliminar el usuario "${usuario.nombre}"?`)) return;

    try {
      // Primero eliminar roles
      await supabase
        .from("empresa_user_roles")
        .delete()
        .eq("empresa_usuario_id", usuario.id);

      // Luego eliminar usuario de empresa
      const { error } = await supabase
        .from("empresa_usuarios")
        .delete()
        .eq("id", usuario.id);

      if (error) throw error;

      // Si tiene auth_user_id, eliminar también de auth
      if (usuario.auth_user_id) {
        await supabase.functions.invoke('delete-user', {
          body: { userId: usuario.auth_user_id }
        });
      }

      toast.success("Usuario eliminado exitosamente");
      loadData();
    } catch (error: any) {
      toast.error("Error al eliminar: " + error.message);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Cargando usuarios de empresa...</p>;
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nombre, email, cargo..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select
                value={empresaFilter}
                onValueChange={(v) => setEmpresaFilter(v === "__all__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las empresas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas las empresas</SelectItem>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Usuario Empresa
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Usuario de Empresa</DialogTitle>
                    <DialogDescription>
                      Usuario con acceso al portal de empresa
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Empresa *</Label>
                      <Select value={formEmpresaId} onValueChange={setFormEmpresaId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar empresa" />
                        </SelectTrigger>
                        <SelectContent>
                          {empresas.map((empresa) => (
                            <SelectItem key={empresa.id} value={empresa.id}>
                              {empresa.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Nombre *</Label>
                      <Input
                        value={formNombre}
                        onChange={(e) => setFormNombre(e.target.value)}
                        placeholder="Nombre completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="usuario@empresa.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Contraseña *</Label>
                      <Input
                        type="password"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cargo (opcional)</Label>
                      <Input
                        value={formCargo}
                        onChange={(e) => setFormCargo(e.target.value)}
                        placeholder="Ej: RRHH, Prevención..."
                      />
                    </div>
                    <Button onClick={handleCreateUser} className="w-full" disabled={isCreating}>
                      {isCreating ? "Creando..." : "Crear Usuario"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Usuarios de Empresa ({filteredUsuarios.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsuarios.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No se encontraron usuarios
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsuarios.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell className="font-medium">{usuario.nombre}</TableCell>
                      <TableCell>{usuario.email}</TableCell>
                      <TableCell>{usuario.empresas?.nombre || "-"}</TableCell>
                      <TableCell>{usuario.cargo || "-"}</TableCell>
                      <TableCell>
                        {usuario.roles?.map((r, i) => (
                          <Badge key={i} variant="outline" className="mr-1">
                            {r.role}
                          </Badge>
                        ))}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={usuario.activo ? "default" : "secondary"}
                          className={usuario.activo ? "bg-green-600" : ""}
                        >
                          {usuario.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(usuario)}
                          >
                            {usuario.activo ? "Desactivar" : "Activar"}
                          </Button>
                          {usuario.auth_user_id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenPasswordDialog(usuario)}
                              title="Cambiar contraseña"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(usuario)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Contraseña</DialogTitle>
            <DialogDescription>
              Cambiar contraseña para: {selectedUser?.nombre}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva Contraseña</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <Button onClick={handleUpdatePassword} className="w-full">
              Actualizar Contraseña
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmpresaUsersList;
