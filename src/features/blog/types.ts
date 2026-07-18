import type { ReactNode } from "react";

export type BlogCategory =
  | "privacidad"
  | "procesos"
  | "automatizacion"
  | "inteligencia-artificial"
  | "productividad"
  | "pensamiento"
  | "comparativas"
  | "implementacion";

export type BlogArticle = {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  categoryLabel: string;
  publishedAt: string;
  readingTime: string;
  featured: boolean;
  seo: {
    title: string;
    description: string;
    ogImageAlt?: string;
  };
  content: {
    eyebrow: string;
    intro: ReactNode;
    sections: { heading: string; body: ReactNode }[];
  };
};
