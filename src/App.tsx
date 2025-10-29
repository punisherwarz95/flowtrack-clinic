import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Flujo from "./pages/Flujo";
import Pacientes from "./pages/Pacientes";
import Boxes from "./pages/Boxes";
import Examenes from "./pages/Examenes";
import BoxView from "./pages/BoxView";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/flujo" element={<Flujo />} />
          <Route path="/pacientes" element={<Pacientes />} />
          <Route path="/boxes" element={<Boxes />} />
          <Route path="/boxes/:boxId" element={<BoxView />} />
          <Route path="/examenes" element={<Examenes />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
