import { useParams, Navigate } from "react-router-dom";
import { SeoPage } from "@/features/seo/SeoPage";
import { SeoArticle } from "@/features/seo/SeoArticle";
import { getArticleBySlug } from "../data/articles";
import { RelatedPosts } from "../components/RelatedPosts";

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? getArticleBySlug(slug) : undefined;

  if (!article) {
    return <Navigate to="/blogs" replace />;
  }

  const publishedDate = new Date(article.publishedAt).toLocaleDateString(
    "es-CO",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

  return (
    <SeoPage
      title={article.seo.title}
      description={article.seo.description}
      path={`/blogs/${article.slug}`}
      ogImageAlt={article.seo.ogImageAlt}
      schemaJson={{
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: article.title,
        description: article.excerpt,
        author: { "@type": "Organization", name: "Hito" },
        publisher: { "@type": "Organization", name: "Hito" },
        datePublished: article.publishedAt,
        mainEntityOfPage: `https://hito.autos/blogs/${article.slug}`,
      }}
    >
      <article className="border-b border-border/60">
        <div className="mx-auto max-w-3xl px-6 pt-24 sm:pt-32">
          <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-mono uppercase tracking-widest">
              {article.categoryLabel}
            </span>
            <span aria-hidden>·</span>
            <span>{publishedDate}</span>
            <span aria-hidden>·</span>
            <span>{article.readingTime} de lectura</span>
          </div>
        </div>

        <SeoArticle
          eyebrow={article.content.eyebrow}
          title={article.title}
          intro={article.content.intro}
          sections={article.content.sections}
          cta={{ label: "Probar Hito — sin registro" }}
        />
      </article>

      <RelatedPosts
        currentSlug={article.slug}
        category={article.category}
      />
    </SeoPage>
  );
}
