import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Flujo from "./pages/Flujo";
import MiBox from "./pages/MiBox";
import Pacientes from "./pages/Pacientes";
import Completados from "./pages/Completados";
import Empresas from "./pages/Empresas";
import Boxes from "./pages/Boxes";
import Examenes from "./pages/Examenes";
import BoxView from "./pages/BoxView";
import Usuarios from "./pages/Usuarios";
import NotFound from "./pages/NotFound";
import { InitAdmin } from "./components/InitAdmin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <InitAdmin />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/flujo" element={<Flujo />} />
          <Route path="/mi-box" element={<MiBox />} />
          <Route path="/pacientes" element={<Pacientes />} />
          <Route path="/completados" element={<Completados />} />
          <Route path="/empresas" element={<Empresas />} />
          <Route path="/boxes" element={<Boxes />} />
          <Route path="/boxes/:boxId" element={<BoxView />} />
          <Route path="/examenes" element={<Examenes />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
