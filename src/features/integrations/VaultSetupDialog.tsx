import { useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVaultStore } from "@/integrations/vault";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function VaultSetupDialog({ open, onOpenChange }: Props) {
  const hasMasterPassword = useVaultStore((s) => s.hasMasterPassword);
  const setupMasterPassword = useVaultStore((s) => s.setupMasterPassword);
  const unlock = useVaultStore((s) => s.unlock);

  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    setError("");

    if (!passphrase) {
      setError("Ingresa una contraseña");
      return;
    }

    if (!hasMasterPassword && passphrase !== confirmPassphrase) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (passphrase.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setIsLoading(true);

    try {
      if (hasMasterPassword) {
        const success = await unlock(passphrase);
        if (!success) {
          setError("Contraseña incorrecta");
          return;
        }
      } else {
        await setupMasterPassword(passphrase);
      }
      onOpenChange(false);
    } catch {
      setError("Error al procesar la contraseña");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {hasMasterPassword ? "Desbloquear Vault" : "Crear Contraseña Maestra"}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            {!hasMasterPassword && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                <p className="text-sm text-warning">
                  <strong>Importante:</strong> Esta contraseña se usa para encriptar tus API keys
                  localmente. Si la olvidas, deberás volver a ingresar tus credenciales.
                </p>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="vault-passphrase">
                {hasMasterPassword ? "Contraseña" : "Contraseña maestra"}
              </Label>
              <Input
                id="vault-passphrase"
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoFocus
              />
            </div>

            {!hasMasterPassword && (
              <div className="grid gap-2">
                <Label htmlFor="vault-confirm">Confirmar contraseña</Label>
                <Input
                  id="vault-confirm"
                  type="password"
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  placeholder="Repite la contraseña"
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Procesando..." : hasMasterPassword ? "Desbloquear" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
