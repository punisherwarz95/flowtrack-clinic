import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building2 } from "lucide-react";
import StaffUsersList from "@/components/usuarios/StaffUsersList";
import EmpresaUsersList from "@/components/usuarios/EmpresaUsersList";

const Usuarios = () => {
  const [activeTab, setActiveTab] = useState("staff");

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-6">Gestión de Usuarios</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="staff" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Staff
            </TabsTrigger>
            <TabsTrigger value="empresa" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Empresas
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="staff">
            <StaffUsersList />
          </TabsContent>
          
          <TabsContent value="empresa">
            <EmpresaUsersList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Usuarios;
