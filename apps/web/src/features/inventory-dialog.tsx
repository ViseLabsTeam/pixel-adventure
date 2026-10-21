import { useEffect, useRef, useState } from "react";
import type { Command, GameView } from "@umbral/protocol";

type Slot = keyof GameView["players"][number]["equipment"];
export type InventorySelection = {
  itemId: string;
  revision: number;
} & ({ origin: "bag" | "potion" } | { origin: "equipment"; slot: Slot });
type InventoryAction = Extract<
  Command["action"],
  { type: "EQUIP" | "UNEQUIP" | "USE_ITEM" | "DISCARD_ITEM" }
>;
const labels = {
  EQUIP: "equipar",
  UNEQUIP: "desequipar",
  USE_ITEM: "usar",
  DISCARD_ITEM: "descartar",
};

export function InventoryDialog({
  selection,
  item,
  replacedItem,
  bagPosition,
  hasSpace,
  enabled,
  onConfirm,
  onCancel,
}: {
  selection: InventorySelection;
  item: GameView["items"][string];
  replacedItem?: GameView["items"][string];
  bagPosition: number;
  hasSpace: boolean;
  enabled: boolean;
  onConfirm: (action: InventoryAction) => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const sent = useRef(false);
  const [operation, setOperation] = useState<InventoryAction["type"]>(
    selection.origin === "equipment"
      ? "UNEQUIP"
      : item.heal > 0 || item.restoreResource > 0
        ? "USE_ITEM"
        : "EQUIP",
  );
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    cancel.current?.focus();
    return () => element?.close();
  }, []);
  const blocked = operation === "UNEQUIP" && !hasSpace;
  const description =
    operation === "DISCARD_ITEM"
      ? `El objeto se eliminará de ${selection.origin === "potion" ? "tus casillas de pociones" : "tu bolsa"} y no podrá recuperarse.`
      : operation === "USE_ITEM"
        ? "Se consumirá el objeto para recuperar vida o recurso."
        : operation === "UNEQUIP"
          ? blocked
            ? "La bolsa está llena. Liberá un espacio antes de desequipar."
            : "La pieza pasará al primer espacio libre de tu bolsa."
          : replacedItem
            ? `Se equipará ${item.name}. ${replacedItem.name} volverá al espacio ${bagPosition + 1} de tu bolsa, intercambiándose con la pieza nueva.`
            : `Se equipará ${item.name} y quedará libre el espacio ${bagPosition + 1} de tu bolsa.`;
  function confirm() {
    if (!enabled || blocked || sent.current) return;
    sent.current = true;
    if (operation === "UNEQUIP" && selection.origin === "equipment")
      onConfirm({ type: "UNEQUIP", slot: selection.slot });
    else if (operation !== "UNEQUIP")
      onConfirm({ type: operation, itemId: item.id });
  }
  return (
    <dialog
      className="inventory-dialog"
      ref={dialog}
      aria-labelledby="inventory-dialog-title"
      aria-describedby="inventory-dialog-description"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <span className="eyebrow">ACCIÓN DE INVENTARIO</span>
      <h2 id="inventory-dialog-title">{item.name}</h2>
      {selection.origin !== "equipment" && (
        <div
          className="inventory-dialog-options"
          aria-label="Acción del objeto"
        >
          <button
            type="button"
            className="button"
            aria-pressed={operation !== "DISCARD_ITEM"}
            onClick={() =>
              setOperation(
                item.heal > 0 || item.restoreResource > 0
                  ? "USE_ITEM"
                  : "EQUIP",
              )
            }
          >
            {item.heal > 0 || item.restoreResource > 0 ? "Usar" : "Equipar"}
          </button>
          <button
            type="button"
            className="button"
            aria-pressed={operation === "DISCARD_ITEM"}
            onClick={() => setOperation("DISCARD_ITEM")}
          >
            Descartar
          </button>
        </div>
      )}
      <p id="inventory-dialog-description">{description}</p>
      {!blocked && (
        <p className="inventory-dialog-cost">
          Esta acción consume la acción de tu turno y cierra el movimiento.
        </p>
      )}
      <div className="inventory-dialog-buttons">
        <button
          type="button"
          className="button"
          ref={cancel}
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          type="button"
          className={`button ${operation === "DISCARD_ITEM" ? "inventory-discard" : "gold"}`}
          disabled={!enabled || blocked}
          onClick={confirm}
        >
          Confirmar {labels[operation]}
        </button>
      </div>
    </dialog>
  );
}
