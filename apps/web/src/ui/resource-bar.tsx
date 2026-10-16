import type { CSSProperties } from "react";
import { resources, type ClassId } from "@umbral/content";
export function ResourceBar({
  classId,
  value,
  compact = false,
}: {
  classId: ClassId;
  value: number;
  compact?: boolean;
}) {
  const resource = resources[classId],
    amount = Math.max(0, Math.min(300, value));
  return (
    <div
      className={"resource-bar " + (compact ? "compact" : "")}
      style={{ "--resource-color": resource.color } as CSSProperties}
    >
      <div className="resource-caption">
        <span>{resource.name}</span>
        <b>
          {Math.round(amount / 3)}%{" "}
          <small>· {Math.floor(amount / 100)}/3</small>
        </b>
      </div>
      <div
        className="resource-track"
        role="progressbar"
        aria-label={resource.name}
        aria-valuenow={amount}
        aria-valuemin={0}
        aria-valuemax={300}
      >
        {[0, 1, 2].map((third) => (
          <span key={third}>
            <i
              style={{
                width: Math.max(0, Math.min(100, amount - third * 100)) + "%",
              }}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
