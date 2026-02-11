import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider } from "@/contexts/AuthContext";
import { EmpresaAuthProvider } from "@/contexts/EmpresaAuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Flujo from "./pages/Flujo";
import MiBox from "./pages/MiBox";
import Pacientes from "./pages/Pacientes";
import Completados from "./pages/Completados";
import Incompletos from "./pages/Incompletos";
import Empresas from "./pages/Empresas";
import Boxes from "./pages/Boxes";
import Examenes from "./pages/Examenes";
import Cotizaciones from "./pages/Cotizaciones";
import Prestadores from "./pages/Prestadores";
import Documentos from "./pages/Documentos";
import Configuracion from "./pages/Configuracion";
import BoxView from "./pages/BoxView";
import Usuarios from "./pages/Usuarios";
import PortalPaciente from "./pages/PortalPaciente";
import NotFound from "./pages/NotFound";
import PantallaTv from "./pages/PantallaTv";
import { InitAdmin } from "./components/InitAdmin";
import ProtectedRoute from "./components/ProtectedRoute";
import EmpresaProtectedRoute from "./components/empresa/EmpresaProtectedRoute";
import EmpresaLogin from "./pages/empresa/EmpresaLogin";
import EmpresaDashboard from "./pages/empresa/EmpresaDashboard";
import EmpresaAgendamiento from "./pages/empresa/EmpresaAgendamiento";
import EmpresaPacientes from "./pages/empresa/EmpresaPacientes";
import EmpresaCotizaciones from "./pages/empresa/EmpresaCotizaciones";
import EmpresaEstadosPago from "./pages/empresa/EmpresaEstadosPago";
import EmpresaBaterias from "./pages/empresa/EmpresaBaterias";
import EmpresaResultados from "./pages/empresa/EmpresaResultados";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <InitAdmin />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <EmpresaAuthProvider>
              <Routes>
                {/* Staff routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/portal-paciente" element={<PortalPaciente />} />
                <Route path="/pantalla" element={<PantallaTv />} />
                <Route path="/" element={<ProtectedRoute path="/"><Dashboard /></ProtectedRoute>} />
                <Route path="/flujo" element={<ProtectedRoute path="/flujo"><Flujo /></ProtectedRoute>} />
                <Route path="/mi-box" element={<ProtectedRoute path="/mi-box"><MiBox /></ProtectedRoute>} />
                <Route path="/pacientes" element={<ProtectedRoute path="/pacientes"><Pacientes /></ProtectedRoute>} />
                <Route path="/completados" element={<ProtectedRoute path="/completados"><Completados /></ProtectedRoute>} />
                <Route path="/incompletos" element={<ProtectedRoute path="/incompletos"><Incompletos /></ProtectedRoute>} />
                <Route path="/empresas" element={<ProtectedRoute path="/empresas"><Empresas /></ProtectedRoute>} />
                <Route path="/boxes" element={<ProtectedRoute path="/boxes"><Boxes /></ProtectedRoute>} />
                <Route path="/boxes/:boxId" element={<ProtectedRoute path="/boxes"><BoxView /></ProtectedRoute>} />
                <Route path="/examenes" element={<ProtectedRoute path="/examenes"><Examenes /></ProtectedRoute>} />
                <Route path="/cotizaciones" element={<ProtectedRoute path="/cotizaciones"><Cotizaciones /></ProtectedRoute>} />
                <Route path="/prestadores" element={<ProtectedRoute path="/prestadores"><Prestadores /></ProtectedRoute>} />
                <Route path="/documentos" element={<ProtectedRoute path="/documentos"><Documentos /></ProtectedRoute>} />
                <Route path="/usuarios" element={<ProtectedRoute path="/usuarios"><Usuarios /></ProtectedRoute>} />
                <Route path="/configuracion" element={<ProtectedRoute path="/configuracion"><Configuracion /></ProtectedRoute>} />
                
                {/* Portal Empresa routes */}
                <Route path="/empresa/login" element={<EmpresaLogin />} />
                <Route path="/empresa" element={<EmpresaProtectedRoute><EmpresaDashboard /></EmpresaProtectedRoute>} />
                <Route path="/empresa/agendamiento" element={<EmpresaProtectedRoute><EmpresaAgendamiento /></EmpresaProtectedRoute>} />
                <Route path="/empresa/pacientes" element={<EmpresaProtectedRoute><EmpresaPacientes /></EmpresaProtectedRoute>} />
                <Route path="/empresa/cotizaciones" element={<EmpresaProtectedRoute><EmpresaCotizaciones /></EmpresaProtectedRoute>} />
                <Route path="/empresa/estados-pago" element={<EmpresaProtectedRoute><EmpresaEstadosPago /></EmpresaProtectedRoute>} />
                <Route path="/empresa/baterias" element={<EmpresaProtectedRoute><EmpresaBaterias /></EmpresaProtectedRoute>} />
                <Route path="/empresa/resultados" element={<EmpresaProtectedRoute><EmpresaResultados /></EmpresaProtectedRoute>} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </EmpresaAuthProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
