import type { BlogCategory } from "../types";

export const BLOG_CATEGORIES: Record<
  BlogCategory,
  { label: string; description: string }
> = {
  privacidad: {
    label: "Privacidad",
    description: "Control de datos, local-first y soberanía digital.",
  },
  procesos: {
    label: "Procesos",
    description: "Documentación, SOPs y checklists que se usan.",
  },
  automatizacion: {
    label: "Automatización",
    description: "Reglas, flujos y productividad sin fricción.",
  },
  "inteligencia-artificial": {
    label: "Inteligencia artificial",
    description: "IA útil sin sacrificar la privacidad.",
  },
  productividad: {
    label: "Productividad",
    description: "Formas de trabajar mejor con menos herramientas.",
  },
  pensamiento: {
    label: "Pensamiento",
    description: "Ideas, principios y reflexiones sobre cómo trabajamos.",
  },
  comparativas: {
    label: "Comparativas",
    description: "Hito frente a otras herramientas, con honestidad.",
  },
};
