import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { CategoryBadge } from "./CategoryBadge";
import type { BlogArticle } from "../types";

type BlogCardProps = {
  article: BlogArticle;
};

export function BlogCard({ article }: BlogCardProps) {
  return (
    <article className="group relative flex flex-col rounded-2xl border border-border/60 bg-background p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/[0.02]">
      <div className="mb-4 flex items-center justify-between">
        <CategoryBadge category={article.category} />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {article.readingTime}
        </span>
      </div>

      <h3 className="text-lg font-semibold tracking-tight transition-colors group-hover:text-primary">
        <Link to={`/blogs/${article.slug}`} className="focus:outline-none">
          <span aria-hidden className="absolute inset-0" />
          {article.title}
        </Link>
      </h3>

      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
        {article.excerpt}
      </p>

      <div className="mt-6 flex items-center gap-2 text-sm font-medium text-foreground/80 transition-colors group-hover:text-primary">
        <span>Leer artículo</span>
        <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
      </div>
    </article>
  );
}
