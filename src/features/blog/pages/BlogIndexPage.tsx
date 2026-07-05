import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { SeoPage } from "@/features/seo/SeoPage";
import { BLOG_ARTICLES } from "../data/articles";
import { BLOG_CATEGORIES } from "../data/categories";
import { BlogCard } from "../components/BlogCard";
import { CategoryBadge } from "../components/CategoryBadge";
import type { BlogCategory } from "../types";

export function BlogIndexPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("categoria") as BlogCategory | null;

  const filteredArticles = useMemo(() => {
    if (!activeCategory) return BLOG_ARTICLES;
    return BLOG_ARTICLES.filter((a) => a.category === activeCategory);
  }, [activeCategory]);

  const featuredArticle = useMemo(
    () => BLOG_ARTICLES.find((a) => a.featured),
    [],
  );

  return (
    <SeoPage
      title="Blog — Hito"
      description="Reflexiones, guías e ideas sobre gestión de proyectos, privacidad, procesos y el futuro del trabajo local-first."
      path="/blogs"
    >
      <div className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <p className="mb-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Blog
          </p>
          <h1 className="max-w-2xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Ideas para trabajar con más claridad y menos ruido.
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Reflexiones sobre gestión de proyectos, soberanía de datos,
            automatización y cómo organizar el trabajo sin perder el control.
          </p>
        </div>
      </div>

      {/* Featured post */}
      {featuredArticle && !activeCategory && (
        <div className="border-b border-border/60 bg-muted/20">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <p className="mb-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Destacado
            </p>
            <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
              <div>
                <CategoryBadge category={featuredArticle.category} />
                <h2 className="mt-4 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                  {featuredArticle.title}
                </h2>
                <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground">
                  {featuredArticle.excerpt}
                </p>
                <a
                  href={`/blogs/${featuredArticle.slug}`}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
                >
                  Leer artículo destacado
                  <span aria-hidden>→</span>
                </a>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background p-6 lg:p-8">
                <blockquote className="text-balance text-lg font-medium leading-relaxed text-foreground/90">
                  “La soberanía de los datos no significa rechazar toda la nube.
                  Significa decidir conscientemente qué información vive dónde,
                  bajo qué condiciones y quién puede acceder a ella.”
                </blockquote>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSearchParams({})}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                !activeCategory
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              Todos
            </button>
            {(
              Object.keys(BLOG_CATEGORIES) as BlogCategory[]
            ).map((category) => (
              <button
                key={category}
                onClick={() => setSearchParams({ categoria: category })}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeCategory === category
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {BLOG_CATEGORIES[category].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Articles grid */}
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        {filteredArticles.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            No hay artículos en esta categoría todavía.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.map((article) => (
              <BlogCard key={article.slug} article={article} />
            ))}
          </div>
        )}
      </div>
    </SeoPage>
  );
}
