import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useVaultStore, type VaultPersistenceMode } from "@/integrations/vault";
import { loadAutoLockMinutes, saveAutoLockMinutes, applyAutoLockSettings } from "@/integrations/vault-auto-lock";

const PERSISTENCE_LABELS: Record<VaultPersistenceMode, string> = {
  off: "No persistir (predeterminado)",
  session: "Mientras dure la pestaña",
  always: "Siempre, hasta bloquear manualmente",
};

const PERSISTENCE_HINTS: Record<VaultPersistenceMode, string> = {
  off: "Reingresa la contraseña maestra cada vez que se recargue o cierre la pestaña, o al bloqueo automático.",
  session: "La clave se guarda cifrada en esta pestaña (sessionStorage). Sobrevive recargas, se borra al cerrar la pestaña.",
  always: "La clave se guarda en este navegador (localStorage) y sobrevive incluso cerrar y reabrir la app. Solo se borra al bloquear manualmente.",
};

/** Preferencias de persistencia/auto-bloqueo del vault (spec 023 §A). Solo
 * toma efecto en el próximo unlock/setup — WebCrypto no permite volver
 * extraíble una clave ya derivada como no-extraíble. */
export function VaultSecuritySettings() {
  const persistenceMode = useVaultStore((s) => s.persistenceMode);
  const setPersistenceMode = useVaultStore((s) => s.setPersistenceMode);
  const isUnlocked = useVaultStore((s) => s.isUnlocked);
  const [autoLockMinutes, setAutoLockMinutes] = useState(loadAutoLockMinutes);

  function handleModeChange(mode: VaultPersistenceMode) {
    setPersistenceMode(mode);
  }

  function handleAutoLockChange(value: string) {
    const minutes = Math.max(0, Number(value) || 0);
    setAutoLockMinutes(minutes);
    saveAutoLockMinutes(minutes);
    applyAutoLockSettings();
  }

  return (
    <Panel
      label="Seguridad"
      title="Seguridad del Vault"
      description="Controla cuánto tiempo se mantiene desbloqueado el vault sin volver a pedir la contraseña maestra."
    >
      <div className="space-y-6">
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" />
            <p className="text-sm text-muted-foreground">
              Persistir la clave del vault la guarda cifrada en el almacenamiento del navegador en
              vez de mantenerla solo en memoria. Es más cómodo, pero cualquiera con acceso a este
              navegador (o a una extensión maliciosa) podría usarla mientras esté persistida. Elige
              según tu contexto.
            </p>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="vault-persist-mode">Mantener desbloqueado</Label>
          <Select
            id="vault-persist-mode"
            value={persistenceMode}
            onChange={(e) => handleModeChange(e.target.value as VaultPersistenceMode)}
          >
            {(Object.keys(PERSISTENCE_LABELS) as VaultPersistenceMode[]).map((mode) => (
              <option key={mode} value={mode}>
                {PERSISTENCE_LABELS[mode]}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">{PERSISTENCE_HINTS[persistenceMode]}</p>
          {isUnlocked && (
            <p className="text-xs text-muted-foreground">
              El cambio surte efecto la próxima vez que desbloquees el vault — no aplica
              retroactivamente a la sesión ya abierta.
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="vault-autolock-minutes">Auto-bloqueo por inactividad (minutos)</Label>
          <Input
            id="vault-autolock-minutes"
            type="number"
            min={0}
            value={autoLockMinutes}
            onChange={(e) => handleAutoLockChange(e.target.value)}
            className="max-w-[10rem]"
          />
          <p className="text-xs text-muted-foreground">
            0 desactiva el auto-bloqueo por inactividad. Sigue pudiendo bloquear manualmente en
            cualquier momento.
          </p>
        </div>
      </div>
    </Panel>
  );
}
