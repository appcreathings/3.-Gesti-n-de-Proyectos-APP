import { useState } from "react";
import { Plus, Trash2, UserRound } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDataStore } from "@/store/useDataStore";
import { newPerson } from "@/domain/factories";

export function PeopleCard() {
  const people = useDataStore((s) => s.people);
  const createPerson = useDataStore((s) => s.createPerson);
  const updatePerson = useDataStore((s) => s.updatePerson);
  const deletePerson = useDataStore((s) => s.deletePerson);
  const [name, setName] = useState("");

  function add() {
    if (!name.trim()) return;
    void createPerson(newPerson(name.trim()));
    setName("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personas</CardTitle>
        <CardDescription>
          Responsables que podrás asignar a checklists y tareas (RACI).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {people.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {people.map((p) => (
              <li key={p.id} className="flex items-center gap-2 p-2">
                <UserRound className="size-4 text-muted-foreground" />
                <Input
                  value={p.name}
                  onChange={(e) => updatePerson({ ...p, name: e.target.value })}
                  className="h-8 border-0 shadow-none focus-visible:ring-0"
                />
                <Input
                  value={p.roleTitle}
                  placeholder="Rol (opcional)"
                  onChange={(e) => updatePerson({ ...p, roleTitle: e.target.value })}
                  className="h-8 w-full sm:w-40"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-11 min-w-11 size-8"
                  onClick={() => deletePerson(p.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex max-w-md gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Nombre de la persona…"
          />
          <Button variant="secondary" onClick={add}>
            <Plus className="size-4" />
            Añadir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
