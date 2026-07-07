/** Rutas de la app, centralizadas para que el prefijo /app viva en un solo lugar. */
export const ROUTES = {
  landing: "/",
  dashboard: "/app",
  products: "/app/products",
  projects: "/app/projects",
  projectsByProduct: (productId: string) => `/app/projects?product=${productId}`,
  projectsByQuarter: (quarterId: string) => `/app/projects?quarter=${quarterId}`,
  project: (id: string) => `/app/projects/${id}`,
  myTasks: "/app/my-tasks",
  quarters: "/app/quarters",
  library: (tab?: string) => (tab ? `/app/library?tab=${tab}` : "/app/library"),
  automations: "/app/automations",
  notifications: "/app/notifications",
  settings: (hash?: string) => (hash ? `/app/settings#${hash}` : "/app/settings"),
} as const;
