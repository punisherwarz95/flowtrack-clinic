import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider } from "@/contexts/AuthContext";
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
import BoxView from "./pages/BoxView";
import Usuarios from "./pages/Usuarios";
import PortalPaciente from "./pages/PortalPaciente";
import NotFound from "./pages/NotFound";
import { InitAdmin } from "./components/InitAdmin";
import ProtectedRoute from "./components/ProtectedRoute";

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
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/portal-paciente" element={<PortalPaciente />} />
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
