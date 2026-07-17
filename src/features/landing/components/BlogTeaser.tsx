/**
 * BlogTeaser — CTA hacia /blogs dentro del cuerpo de la landing.
 *
 * Antes del refresh, el blog solo se enlazaba desde el nav y el footer:
 * ningún bloque dentro del body invitaba a leer contenido editorial.
 * Muestra hasta 3 artículos (destacado primero, luego los más recientes)
 * + botón hacia el índice completo.
 */
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BLOG_ARTICLES } from "@/features/blog/data/articles";
import { BlogCard } from "@/features/blog/components/BlogCard";

const TEASER_ARTICLES = [...BLOG_ARTICLES]
  .sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return b.publishedAt.localeCompare(a.publishedAt);
  })
  .slice(0, 3);

export function BlogTeaser() {
  if (TEASER_ARTICLES.length === 0) return null;

  return (
    <section className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="mb-16 flex flex-col items-start justify-between gap-6 sm:mb-20 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Blog
            </p>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Ideas sobre privacidad, procesos y trabajo local-first.
            </h2>
          </div>
          <Link to="/blogs" className="shrink-0">
            <Button variant="outline" className="gap-2">
              Ver todos los artículos
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TEASER_ARTICLES.map((article) => (
            <BlogCard key={article.slug} article={article} />
          ))}
        </div>
      </div>
    </section>
  );
}
