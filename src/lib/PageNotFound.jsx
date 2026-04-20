import { Link } from "react-router-dom";
import { Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/shared/SEO";

export default function PageNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <SEO title="404" description="Pagina non trovata" />
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-7xl font-heading font-bold text-muted-foreground/20">404</h1>
          <div className="h-0.5 w-16 bg-border/50 mx-auto rounded-full" />
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-heading font-bold">Pagina non trovata</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            La pagina che stai cercando non esiste o è stata spostata.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Link to="/">
            <Button className="bg-primary hover:bg-primary/90 font-semibold px-6">
              <Home className="w-4 h-4 mr-2" />
              Torna alla Home
            </Button>
          </Link>
          <Link to="/explore">
            <Button variant="outline" className="border-border/50 font-medium px-6">
              <Search className="w-4 h-4 mr-2" />
              Esplora creator
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
