import type { CSSProperties, ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";

export interface SortableRenderProps {
  setNodeRef: (node: HTMLElement | null) => void;
  style: CSSProperties;
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  isDragging: boolean;
}

interface Props {
  id: string;
  children: (props: SortableRenderProps) => ReactNode;
}

/** Low-level wrapper around `useSortable`; each list keeps its own DndContext/state. */
export function SortableItem({ id, children }: Props) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id,
  });

  return (
    <>
      {children({
        setNodeRef,
        style: { transform: CSS.Transform.toString(transform), transition },
        attributes,
        listeners,
        isDragging,
      })}
    </>
  );
}
