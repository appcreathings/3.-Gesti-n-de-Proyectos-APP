import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Helmet>
        <title>Página no encontrada | Hito</title>
        <meta name="description" content="La página que buscas no existe en Hito." />
      </Helmet>
      <div className="rounded-full bg-muted p-4 text-muted-foreground">
        <SearchX className="size-8" />
      </div>
      <h1 className="text-2xl font-bold">Página no encontrada</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        La página que buscas no existe o ha sido movida.
      </p>
      <Link to="/" className={cn(buttonVariants(), "mt-2")}>
        Volver al inicio
      </Link>
    </div>
  );
}
