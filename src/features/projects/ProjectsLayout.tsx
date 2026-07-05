import { Outlet } from "react-router-dom";

/**
 * Single-column workspace for /app/projects and /app/projects/:id. The global
 * rail already provides a lightweight Producto → Proyecto tree, so we keep this
 * layout free of the redundant "Árbol" sidebar.
 */
export function ProjectsLayout() {
  return (
    <div className="min-w-0">
      <Outlet />
    </div>
  );
}
