import type { ParticipantRole } from "../data";
import { participantLabels } from "../data";

export function TargetBadge({ badge }: { badge: string }) {
  return badge ? (
    <b className="badge" data-target={badge} aria-label={`목표 ${badge}`}>
      {badge}
    </b>
  ) : null;
}
export function RoleMark({ role }: { role: ParticipantRole }) {
  return (
    <span
      className={`role-mark ${role}`}
      data-role={role}
      title={
        role === "carrier"
          ? "조합 마법으로 승계되는 주체"
          : role === "material"
            ? "조합에 병합되어 소멸하는 재료"
            : "소비되지 않는 패시브 또는 선행 조합 조건"
      }
    >
      {participantLabels[role]}
    </span>
  );
}
