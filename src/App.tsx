import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Products from "./pages/Products";
import Placeholder from "./pages/Placeholder";
import NotFound from "./pages/NotFound";
import Help from "./pages/Help";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
          <Route path="/pos" element={<AppLayout><POS /></AppLayout>} />
          <Route path="/products" element={<AppLayout><Products /></AppLayout>} />
          <Route path="/inventory" element={<AppLayout><Placeholder /></AppLayout>} />
          <Route path="/clients" element={<AppLayout><Placeholder /></AppLayout>} />
          <Route path="/suppliers" element={<AppLayout><Placeholder /></AppLayout>} />
          <Route path="/transporters" element={<AppLayout><Placeholder /></AppLayout>} />
          <Route path="/reports" element={<AppLayout><Placeholder /></AppLayout>} />
          <Route path="/invoices" element={<AppLayout><Placeholder /></AppLayout>} />
          <Route path="/audit" element={<AppLayout><Placeholder /></AppLayout>} />
          <Route path="/settings" element={<AppLayout><Placeholder /></AppLayout>} />
          <Route path="/help" element={<AppLayout><Help /></AppLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
