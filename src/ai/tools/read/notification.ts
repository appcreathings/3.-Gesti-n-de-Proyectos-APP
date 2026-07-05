import { z } from "zod";
import { notificationView } from "../serializers";
import { defineTool, type AiTool, type ToolContext } from "../types";

export function createNotificationReadTools(ctx: ToolContext): AiTool[] {
  const { getData } = ctx;
  return [
    defineTool({
      name: "list_notifications",
      description: "Lista las notificaciones del workspace, opcionalmente solo no leídas.",
      mode: "read",
      input: z.object({ unreadOnly: z.boolean().optional() }),
      execute: ({ unreadOnly }) =>
        getData()
          .notifications.filter((n) => !unreadOnly || !n.read)
          .map(notificationView),
    }),
  ];
}
