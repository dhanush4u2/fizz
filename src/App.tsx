import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { MainLayout } from "@/components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Board from "./pages/Board";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />
            <Route path="/board" element={<MainLayout><Board /></MainLayout>} />
            <Route path="/backlog" element={<MainLayout><div className="p-6">Backlog (Coming Soon)</div></MainLayout>} />
            <Route path="/calendar" element={<MainLayout><div className="p-6">Calendar (Coming Soon)</div></MainLayout>} />
            <Route path="/reports" element={<MainLayout><div className="p-6">Reports (Coming Soon)</div></MainLayout>} />
            <Route path="/settings" element={<MainLayout><div className="p-6">Settings (Coming Soon)</div></MainLayout>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
