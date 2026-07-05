import ReactMarkdown from "react-markdown";

/** Renders markdown with prose-like styling using design tokens. */
export function Markdown({ children }: { children: string }) {
  if (!children.trim()) {
    return <p className="text-sm italic text-muted-foreground">Sin contenido.</p>;
  }
  return (
    <div className="space-y-2 text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_h1]:mt-3 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_li]:ml-4 [&_li]:list-disc [&_ol_li]:list-decimal [&_strong]:font-semibold">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}
