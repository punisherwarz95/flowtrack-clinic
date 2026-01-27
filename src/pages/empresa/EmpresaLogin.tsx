import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEmpresaAuth } from "@/contexts/EmpresaAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, LogIn, UserPlus, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const EmpresaLogin = () => {
  const navigate = useNavigate();
  const { signIn, signUp, checkEmpresa, loading: authLoading } = useEmpresaAuth();
  const { toast } = useToast();

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupNombre, setSignupNombre] = useState("");
  const [signupCargo, setSignupCargo] = useState("");
  const [signupEmpresaRut, setSignupEmpresaRut] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [empresaVerificada, setEmpresaVerificada] = useState<{ nombre: string; rut: string } | null>(null);
  const [verificandoEmpresa, setVerificandoEmpresa] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    const { error } = await signIn(loginEmail, loginPassword);

    if (error) {
      setLoginError(error);
    } else {
      navigate("/empresa");
    }

    setLoginLoading(false);
  };

  const handleVerificarEmpresa = async () => {
    if (!signupEmpresaRut.trim()) {
      setSignupError("Ingrese el RUT de su empresa");
      return;
    }

    setVerificandoEmpresa(true);
    setSignupError("");
    setEmpresaVerificada(null);

    const result = await checkEmpresa(signupEmpresaRut);

    if (result.exists && result.empresa) {
      setEmpresaVerificada({ nombre: result.empresa.nombre, rut: result.empresa.rut });
    } else {
      setSignupError("Empresa no encontrada. Contacte al centro para registrar su empresa primero.");
    }

    setVerificandoEmpresa(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!empresaVerificada) {
      setSignupError("Debe verificar su empresa primero");
      return;
    }

    if (!signupEmail || !signupPassword || !signupNombre) {
      setSignupError("Complete todos los campos obligatorios");
      return;
    }

    if (signupPassword.length < 6) {
      setSignupError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setSignupLoading(true);
    setSignupError("");

    const { error, success } = await signUp({
      email: signupEmail,
      password: signupPassword,
      nombre: signupNombre,
      cargo: signupCargo || undefined,
      empresa_rut: signupEmpresaRut,
    });

    if (error) {
      setSignupError(error);
    } else if (success) {
      toast({
        title: "Registro exitoso",
        description: "Ya puede iniciar sesión con sus credenciales.",
      });
      // Limpiar formulario y cambiar a login
      setSignupEmail("");
      setSignupPassword("");
      setSignupNombre("");
      setSignupCargo("");
      setSignupEmpresaRut("");
      setEmpresaVerificada(null);
    }

    setSignupLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Portal de Empresas</CardTitle>
          <CardDescription>
            Acceda al sistema de agendamiento y gestión de pacientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="signup">Registrarse</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                {loginError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{loginError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="usuario@empresa.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginLoading || authLoading}
                >
                  {loginLoading ? (
                    "Ingresando..."
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 mr-2" />
                      Ingresar
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
                {signupError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{signupError}</AlertDescription>
                  </Alert>
                )}

                {/* Paso 1: Verificar empresa */}
                <div className="space-y-2">
                  <Label htmlFor="signup-empresa-rut">RUT de su Empresa *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="signup-empresa-rut"
                      placeholder="12.345.678-9"
                      value={signupEmpresaRut}
                      onChange={(e) => {
                        setSignupEmpresaRut(e.target.value);
                        setEmpresaVerificada(null);
                      }}
                      disabled={!!empresaVerificada}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleVerificarEmpresa}
                      disabled={verificandoEmpresa || !!empresaVerificada}
                    >
                      {verificandoEmpresa ? "..." : "Verificar"}
                    </Button>
                  </div>
                </div>

                {empresaVerificada && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">
                      Empresa verificada: <strong>{empresaVerificada.nombre}</strong>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Paso 2: Datos del usuario (solo si empresa verificada) */}
                {empresaVerificada && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="signup-nombre">Nombre Completo *</Label>
                      <Input
                        id="signup-nombre"
                        placeholder="Juan Pérez"
                        value={signupNombre}
                        onChange={(e) => setSignupNombre(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-cargo">Cargo</Label>
                      <Input
                        id="signup-cargo"
                        placeholder="Jefe de Prevención"
                        value={signupCargo}
                        onChange={(e) => setSignupCargo(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email *</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="usuario@empresa.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Contraseña *</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={signupLoading}
                    >
                      {signupLoading ? (
                        "Registrando..."
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Crear Cuenta
                        </>
                      )}
                    </Button>
                  </>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  Solo empresas registradas en el sistema pueden crear usuarios.
                  Si su empresa no está registrada, contacte al centro médico.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmpresaLogin;
