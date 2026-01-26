import { Construction } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function Placeholder() {
  const location = useLocation();
  const pageName = location.pathname.slice(1).charAt(0).toUpperCase() + location.pathname.slice(2);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-6">
        <Construction className="h-10 w-10 text-primary" />
      </div>
      <h1 className="text-2xl font-bold mb-2">{pageName}</h1>
      <p className="text-muted-foreground text-center max-w-md">
        This module is coming soon. We're building a powerful {pageName.toLowerCase()} management system.
      </p>
    </div>
  );
}
