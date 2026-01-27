import { ReactNode } from "react";
import EmpresaNavigation from "./EmpresaNavigation";

interface EmpresaLayoutProps {
  children: ReactNode;
}

const EmpresaLayout = ({ children }: EmpresaLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <EmpresaNavigation />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};

export default EmpresaLayout;
