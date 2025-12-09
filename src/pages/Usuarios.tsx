import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Trash2, Plus, Save, Key } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface User {
  id: string;
  username: string;
  isAdmin: boolean;
  permissions: string[];
}

const menuOptions = [
  { path: "/", label: "Dashboard" },
  { path: "/flujo", label: "Flujo" },
  { path: "/mi-box", label: "Mi Box" },
  { path: "/pacientes", label: "Pacientes" },
  { path: "/completados", label: "Completados" },
  { path: "/empresas", label: "Empresas" },
  { path: "/boxes", label: "Boxes" },
  { path: "/examenes", label: "Exámenes" },
  { path: "/usuarios", label: "Usuarios" },
];

const Usuarios = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [newPermissions, setNewPermissions] = useState<string[]>([]);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<User | null>(null);
  const [newUserPassword, setNewUserPassword] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });

      if (profilesError) throw profilesError;

      // Get roles for all users
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Get permissions for all users
      const { data: permissions, error: permissionsError } = await supabase
        .from("menu_permissions")
        .select("*");

      if (permissionsError) throw permissionsError;

      const usersData: User[] = profiles.map((profile) => {
        const userRoles = roles.filter((r) => r.user_id === profile.id);
        const userPermissions = permissions.filter((p) => p.user_id === profile.id);
        
        return {
          id: profile.id,
          username: profile.username,
          isAdmin: userRoles.some((r) => r.role === "admin"),
          permissions: userPermissions.map((p) => p.menu_path),
        };
      });

      setUsers(usersData);
    } catch (error: any) {
      toast.error("Error al cargar usuarios: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUsername || !newPassword) {
      toast.error("Usuario y contraseña son requeridos");
      return;
    }

    if (!newIsAdmin && newPermissions.length === 0) {
      toast.error("Debes seleccionar al menos un permiso o marcar como administrador");
      return;
    }

    try {
      // Convert username to email format if it doesn't contain @
      const emailToUse = newUsername.includes('@') ? newUsername : `${newUsername}@mediflow.local`;
      
      // Call edge function to create user with admin API
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: emailToUse,
          password: newPassword,
          username: newUsername,
          isAdmin: newIsAdmin,
          permissions: newIsAdmin ? [] : newPermissions,
        }
      });

      if (error) {
        console.error('Error from create-user function:', error);
        toast.error("Error al crear usuario: " + error.message);
        return;
      }

      if (data?.error) {
        toast.error("Error al crear usuario: " + data.error);
        return;
      }

      toast.success("Usuario creado exitosamente");
      setDialogOpen(false);
      setNewUsername("");
      setNewPassword("");
      setNewIsAdmin(false);
      setNewPermissions([]);
      loadUsers();
    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast.error("Error inesperado al crear usuario: " + error.message);
    }
  };

  const toggleNewPermission = (path: string) => {
    setNewPermissions((prev) =>
      prev.includes(path)
        ? prev.filter((p) => p !== path)
        : [...prev, path]
    );
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`¿Estás seguro de eliminar el usuario "${username}"?`)) return;

    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) {
        toast.error("Error al eliminar usuario: " + error.message);
        return;
      }

      if (data?.error) {
        toast.error("Error: " + data.error);
        return;
      }

      toast.success("Usuario eliminado exitosamente");
      loadUsers();
    } catch (error: any) {
      toast.error("Error inesperado: " + error.message);
    }
  };

  const handleEditPermissions = (userId: string, currentPermissions: string[]) => {
    setEditingUser(userId);
    setEditPermissions(currentPermissions);
  };

  const handleSavePermissions = async () => {
    if (!editingUser) return;

    try {
      // Delete existing permissions
      const { error: deleteError } = await supabase
        .from("menu_permissions")
        .delete()
        .eq("user_id", editingUser);

      if (deleteError) throw deleteError;

      // Insert new permissions
      if (editPermissions.length > 0) {
        const permissionsData = editPermissions.map((path) => ({
          user_id: editingUser,
          menu_path: path,
        }));

        const { error: insertError } = await supabase
          .from("menu_permissions")
          .insert(permissionsData);

        if (insertError) throw insertError;
      }

      toast.success("Permisos actualizados exitosamente");
      setEditingUser(null);
      setEditPermissions([]);
      loadUsers();
    } catch (error: any) {
      toast.error("Error al actualizar permisos: " + error.message);
    }
  };

  const togglePermission = (path: string) => {
    setEditPermissions((prev) =>
      prev.includes(path)
        ? prev.filter((p) => p !== path)
        : [...prev, path]
    );
  };

  const handleOpenPasswordDialog = (user: User) => {
    setSelectedUserForPassword(user);
    setNewUserPassword("");
    setPasswordDialogOpen(true);
  };

  const handleUpdatePassword = async () => {
    if (!selectedUserForPassword || !newUserPassword) {
      toast.error("La contraseña es requerida");
      return;
    }

    if (newUserPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('update-password', {
        body: {
          userId: selectedUserForPassword.id,
          newPassword: newUserPassword,
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
      setSelectedUserForPassword(null);
      setNewUserPassword("");
    } catch (error: any) {
      toast.error("Error inesperado: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">Gestión de Usuarios</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                <DialogDescription>
                  Ingresa los datos del nuevo usuario
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Usuario</Label>
                  <Input
                    id="username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="usuario@ejemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isAdmin"
                    checked={newIsAdmin}
                    onCheckedChange={(checked) => {
                      setNewIsAdmin(checked as boolean);
                      if (checked) {
                        setNewPermissions([]);
                      }
                    }}
                  />
                  <Label htmlFor="isAdmin">Administrador (acceso a todo)</Label>
                </div>
                
                {!newIsAdmin && (
                  <div className="space-y-2">
                    <Label>Permisos de Menú</Label>
                    <div className="grid grid-cols-2 gap-2 p-3 border rounded-md">
                      {menuOptions.map((menu) => (
                        <div key={menu.path} className="flex items-center space-x-2">
                          <Checkbox
                            id={`new-${menu.path}`}
                            checked={newPermissions.includes(menu.path)}
                            onCheckedChange={() => toggleNewPermission(menu.path)}
                          />
                          <Label htmlFor={`new-${menu.path}`} className="cursor-pointer">
                            {menu.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <Button onClick={handleCreateUser} className="w-full">
                  Crear Usuario
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{user.username}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {user.isAdmin ? "Administrador" : "Usuario"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleOpenPasswordDialog(user)}
                      title="Cambiar contraseña"
                    >
                      <Key className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeleteUser(user.id, user.username)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!user.isAdmin && (
                  <>
                    {editingUser === user.id ? (
                      <div className="space-y-4">
                        <Label>Permisos de Menú</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {menuOptions.map((menu) => (
                            <div key={menu.path} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${user.id}-${menu.path}`}
                                checked={editPermissions.includes(menu.path)}
                                onCheckedChange={() => togglePermission(menu.path)}
                              />
                              <Label htmlFor={`${user.id}-${menu.path}`}>{menu.label}</Label>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleSavePermissions}>
                            <Save className="h-4 w-4 mr-2" />
                            Guardar
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingUser(null);
                              setEditPermissions([]);
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="mb-2">
                          <Label>Permisos:</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {user.permissions.length > 0 ? (
                              user.permissions.map((path) => {
                                const menu = menuOptions.find((m) => m.path === path);
                                return (
                                  <span
                                    key={path}
                                    className="px-2 py-1 bg-accent text-accent-foreground rounded text-sm"
                                  >
                                    {menu?.label || path}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                Sin permisos asignados
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => handleEditPermissions(user.id, user.permissions)}
                          className="mt-2"
                        >
                          Editar Permisos
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Password Change Dialog */}
        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cambiar Contraseña</DialogTitle>
              <DialogDescription>
                Cambiar contraseña para: {selectedUserForPassword?.username}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  <strong>Nota:</strong> Por seguridad, las contraseñas se almacenan encriptadas y no es posible ver la contraseña actual.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva Contraseña</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
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
    </div>
  );
};

export default Usuarios;
