import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Trash2, Plus, Save } from "lucide-react";
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
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

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

    try {
      // Convert username to email format if it doesn't contain @
      const emailToUse = newUsername.includes('@') ? newUsername : `${newUsername}@mediflow.local`;
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailToUse,
        password: newPassword,
        options: {
          data: {
            username: newUsername
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Add role
        const { error: roleError } = await supabase.from("user_roles").insert({
          user_id: authData.user.id,
          role: newIsAdmin ? "admin" : "user",
        });

        if (roleError) throw roleError;

        // If admin, add all permissions
        if (newIsAdmin) {
          const allPermissions = menuOptions.map((menu) => ({
            user_id: authData.user!.id,
            menu_path: menu.path,
          }));

          const { error: permError } = await supabase
            .from("menu_permissions")
            .insert(allPermissions);

          if (permError) throw permError;
        }

        toast.success("Usuario creado exitosamente");
        setDialogOpen(false);
        setNewUsername("");
        setNewPassword("");
        setNewIsAdmin(false);
        loadUsers();
      }
    } catch (error: any) {
      toast.error("Error al crear usuario: " + error.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("¿Estás seguro de eliminar este usuario?")) return;

    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;

      toast.success("Usuario eliminado exitosamente");
      loadUsers();
    } catch (error: any) {
      toast.error("Error al eliminar usuario: " + error.message);
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
                    onCheckedChange={(checked) => setNewIsAdmin(checked as boolean)}
                  />
                  <Label htmlFor="isAdmin">Administrador (acceso a todo)</Label>
                </div>
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
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDeleteUser(user.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              {!user.isAdmin && (
                <CardContent>
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
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Usuarios;
