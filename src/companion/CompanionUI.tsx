import { useEffect, useState } from "react";
import type { Run } from "../engine";
import { comboById } from "../data";
import { Dialog } from "../components/Dialog";
import { metaData } from "../meta/data";
import { companion, passiveName, synergyProgress } from "./data";
import {
  elapsedSeconds,
  normalizeProgress,
  recordGrowth,
  ultimateRequirements,
} from "./engine";
import { formatTrackedValue, getTrackedStats } from "../stats/engine";
import "./style.css";

const effectLabels: Record<string, string> = {
  attackPercent: "공격력",
  attackAmplificationPercent: "공격력 증폭",
  attackAmpPercent: "공격력 증폭",
  allMagicDamagePercent: "모든 마법 피해량",
  combinationMagicDamagePercent: "조합 마법 피해량",
  cooldownPercent: "모든 마법 쿨타임",
  maxHpPercent: "최대 체력",
  lifeOrbHealPercent: "생명의 구슬 회복량",
  moveSpeedPercent: "이동속도",
  magicSizePercent: "모든 마법 크기",
  durationPercent: "모든 마법 지속시간",
  critChancePercent: "치명타율",
  critMultiplierPercent: "치명타 배율",
  pickupRangePercent: "아이템 획득반경",
  enemyMoveSpeedPercent: "모든 적 이동속도",
  enemyMaxHpPercent: "적의 최대 체력",
  eliteMaxHpPercent: "엘리트 최대 체력",
  hpRegenPerSecondPercent: "초당 체력회복률",
  manaBeadDropPercent: "마나 구슬 드랍률",
  manaOrbGainPercent: "마나 구슬 획득량",
  manaGainPercent: "마나 획득량",
  maxPlayerLevel: "최대 레벨",
  revives: "부활 횟수",
  runeDurationPercent: "룬 효과 지속시간",
  damageTakenPercent: "받는 피해량",
  merchantDiscountPercent: "상인 할인",
  magicDamagePercent: "해당 마법 피해량",
  spawnNormalChest: "일반 보물상자",
  allGrowthEnhancementLevels: "성장 패시브 레벨",
  artifactCooldownPercent: "아티팩트 쿨타임",
  chooseCombatMagicToEnhance: "공격 마법 1개 강화",
};

function effectText(effect: object) {
  const parts = Object.entries(effect)
    .filter(([, v]) => typeof v === "number" || typeof v === "boolean")
    .map(([k, v]) => {
      if (typeof v === "boolean") return v ? (effectLabels[k] ?? k) : "";
      const suffix = k.includes("Percent") ? "%" : "";
      return `${effectLabels[k] ?? k} ${v > 0 ? "+" : ""}${v}${suffix}`;
    })
    .filter(Boolean);
  return parts.join(" · ") || "선택형·조건부 효과 · 상세 설명 확인";
}

export function RunClock({ run, onChange }: { run: Run; onChange: (r: Run) => void }) {
  const p = normalizeProgress(run.progress);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (p.startedAt === null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [p.startedAt]);
  const seconds = Math.floor(elapsedSeconds(p, now));
  return (
    <button
      className="run-clock"
      aria-label={p.startedAt === null ? "Run 타이머 시작" : "Run 타이머 일시정지"}
      onClick={() =>
        onChange({
          ...run,
          progress: {
            ...p,
            elapsed: elapsedSeconds(p),
            startedAt: p.startedAt === null ? Date.now() : null,
          },
        })
      }
    >
      {p.startedAt === null ? "▶" : "Ⅱ"} {Math.floor(seconds / 60).toString().padStart(2, "0")}:
      {(seconds % 60).toString().padStart(2, "0")}
    </button>
  );
}

export function CompanionDialog({
  run,
  onChange,
  onRecord,
  onClose,
}: {
  run: Run;
  onChange: (r: Run) => void;
  onRecord: (id: string) => void;
  onClose: () => void;
}) {
  const p = normalizeProgress(run.progress);
  const [tab, setTab] = useState(p.growthPhase ? "growth" : "normal");
  const [query, setQuery] = useState("");
  const update = (patch: Partial<typeof p>) => onChange({ ...run, progress: { ...p, ...patch } });
  const rows =
    tab === "normal"
      ? companion.normal.map((s) => ({ id: s.id, name: s.nameKo, max: s.maxLevel, level: run.levels[s.id] ?? 0, effect: s.perLevel }))
      : tab === "special"
        ? companion.special.map((s) => ({ id: s.id, name: s.nameKo, max: 1, level: p.special.includes(s.id) ? 1 : 0, effect: s.effects }))
        : companion.growth.map((s) => ({ id: s.id, name: passiveName(s.id), max: s.maxLevel, level: p.growth[s.id] ?? 0, effect: s.perLevel }));
  const total = Object.values(p.growth).reduce((a, b) => a + b, 0);
  return (
    <Dialog title="패시브 · Run 기록" className="companion-dialog" onClose={onClose}>
      <div className="companion-tabs" role="group" aria-label="패시브 종류">
        {[["normal", "일반 패시브"], ["special", "특수 패시브"], ["growth", "MAX 성장 패시브"]].map(([id, label]) => (
          <button key={id} aria-pressed={tab === id} onClick={() => { setTab(id); setQuery(""); }}>
            {label}
          </button>
        ))}
      </div>
      <p className="muted">게임에서 실제로 선택한 것만 기록하세요. 아래 수치는 해당 선택 1회의 인게임 효과입니다.</p>
      {tab === "growth" && (
        <div className="growth-stage">
          <label>
            <input type="checkbox" checked={p.growthPhase} onChange={(e) => update({ growthPhase: e.target.checked })} /> 현재 MAX 이후 성장 패시브 선택 중
          </label>
          <strong>{total} / 50회</strong>
          <p>일반 패시브와 별도 기록 · 종류별 최대 8회</p>
        </div>
      )}
      <input className="companion-search" aria-label="패시브 검색" placeholder="인게임 이름 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="companion-grid">
        {rows
          .filter((s) => s.name.replaceAll(" ", "").includes(query.replaceAll(" ", "")))
          .map((s) => (
            <button
              key={s.id}
              className="companion-pick"
              disabled={s.level >= s.max || (tab === "growth" ? !p.growthPhase || total >= 50 : p.growthPhase)}
              onClick={() => {
                if (tab === "normal") onRecord(s.id);
                else if (tab === "growth") onChange(recordGrowth(run, s.id));
                else update({ special: [...p.special, s.id] });
              }}
            >
              <span><strong>{s.name}</strong><b>{s.level}/{s.max}</b></span>
              <small>{effectText(s.effect)}</small>
            </button>
          ))}
      </div>

      <TrackedStats run={run} />

      <details className="companion-details">
        <summary>궁극기 조건 · 타이머 · 상세 Run 기록</summary>
        <p className="muted">클래스·실험체·궁극기 목표는 필요한 경우에만 플레이 상황 설정에서 선택하면 됩니다.</p>
        <label className="meta-field">현재 캐릭터 레벨 (선택)
          <input aria-label="현재 캐릭터 레벨" type="number" min="1" max="200" value={p.playerLevel ?? ""} onChange={(e) => update({ playerLevel: e.target.value ? Number(e.target.value) : null })} />
        </label>
        <label className="check-line"><input type="checkbox" checked={p.cityCleared} onChange={(e) => update({ cityCleared: e.target.checked })} /> 도시 클리어로 궁극기 해금</label>
        {run.meta?.ultimate ? (
          <ul className="ultimate-checks">
            {ultimateRequirements(run, run.meta.ultimate).map((r) => (
              <li key={r.label}>{r.met ? "✓" : "○"} {r.label}{r.id ? ` · ${comboById[r.id]?.nameKo ?? [...companion.classes, ...companion.subjects].find((e) => e.id === r.id)?.nameKo ?? r.id}` : ""}</li>
            ))}
          </ul>
        ) : <p>궁극기 목표를 설정하면 필요한 조합과 조건이 표시됩니다.</p>}
        <label className="meta-field">타이머 시간 수정 (분)
          <input aria-label="타이머 분" type="number" min="0" max="300" value={Math.floor(p.elapsed / 60)} onChange={(e) => update({ elapsed: Math.max(0, Math.min(300, Number(e.target.value))) * 60, startedAt: null })} />
        </label>
        <p className="muted">타이머는 추천의 시간대만 자동 추론합니다. 게임을 멈추면 타이머도 멈춰주세요.</p>
        <p className="muted">공식 배포는 v0.993입니다. 현재 상세 수치·레시피 계산은 한국어 자료에서 검증 가능한 v0.992 기준선이며, 0.993 변경분은 확인 전까지 추정해 계산하지 않습니다.</p>
      </details>
    </Dialog>
  );
}

function TrackedStats({ run }: { run: Run }) {
  const stats = getTrackedStats(run);
  return (
    <details className="companion-details" open={stats.length > 0}>
      <summary>내 스탯 · 기록분 {stats.length ? `${stats.length}개 축` : "없음"}</summary>
      <p className="muted">연구·학파·실험체 등 앱에 입력하지 않은 시작 보너스는 추정하지 않습니다. 아래 값은 이 앱에 기록한 선택으로 확실히 계산 가능한 변화량입니다.</p>
      {stats.length ? stats.map((stat) => (
        <p key={stat.id}>
          <strong>{stat.nameKo} {formatTrackedValue(stat.value)}</strong>
          <small> · {stat.operation === "multiplicative" ? "곱연산 반영" : "합연산"}{stat.partial ? " · 일부 복합효과 미계산" : ""} · {stat.sources.map((s) => s.name).join(", ")}</small>
        </p>
      )) : <p>패시브나 아티팩트를 기록하면 여기서 변화량을 확인할 수 있습니다.</p>}
    </details>
  );
}

export function InventoryProgress({ run }: { run: Run }) {
  const list = synergyProgress(run.meta?.artifacts ?? [])
    .filter((s) => s.missing.length < s.requirements.length)
    .sort((a, b) => a.remaining - b.remaining || a.nameKo.localeCompare(b.nameKo, "ko"));
  return (
    <details className="companion-details">
      <summary>보유 아티팩트로 본 시너지 {list.filter((s) => s.remaining === 0).length}개 완성</summary>
      <p className="muted">한국어 자료에서 확인한 35개 레시피를 자동 계산합니다. 시너지 발동 시 재료 아티팩트는 소모되지 않습니다.</p>
      {list.map((s) => (
        <p key={s.id}>
          <strong>{s.nameKo} · {s.remaining === 0 ? "완성" : `${s.remaining}개 남음`}</strong>
          {s.remaining > 0 && <small> {s.missing.map((id) => metaData.entities.artifacts.find((a) => a.id === id)?.nameKo ?? id).join(", ")}</small>}
        </p>
      ))}
    </details>
  );
}

export function UltimatePlan({ run }: { run: Run }) {
  const u = companion.ultimates.find((u) => u.id === run.meta?.ultimate);
  if (!u) return null;
  return (
    <div className="growth-stage">
      <strong>{u.nameKo} 준비</strong>
      <ul className="ultimate-checks">
        {ultimateRequirements(run, u.id).slice(0, 3).map((r) => (
          <li key={r.label}>{r.met ? "✓" : "○"} {r.label} · {r.id ? (comboById[r.id]?.nameKo ?? [...companion.classes, ...companion.subjects].find((s) => s.id === r.id)?.nameKo ?? r.id) : "제한 없음"}</li>
        ))}
      </ul>
      <p>도시 클리어 + 레벨 100 선택 기회 필요. 현재 레벨과 해금 여부는 패시브 · Run 기록에서 확인합니다.</p>
      <small>상세 기준 v0.992 · 공식 v0.993 변경 재검증 중</small>
    </div>
  );
}

export function SeedSources() {
  return (
    <details className="companion-details">
      <summary>데이터 기준과 현재 패치 상태</summary>
      <p>한국어 인게임 용어는 한국어 매직서바이벌 자료를 우선해 정리했습니다. 공식 Google Play의 최신 공지는 v0.993이지만, 상세 수치가 확인되지 않은 변경은 추정해 적용하지 않습니다.</p>
      <p>일반 패시브는 11종(인챈트·상급 마법 포함), 특수 패시브는 24종으로 정리했습니다. 시너지는 한국어 레시피가 확인된 35종만 런타임에서 사용합니다.</p>
      <p><a href="https://play.google.com/store/apps/details?id=com.vkslrzm.Zombie" target="_blank" rel="noreferrer">Google Play 공식 페이지</a></p>
      <p><a href="https://m.namu.moe/w/%EB%A7%A4%EC%A7%81%EC%84%9C%EB%B0%94%EC%9D%B4%EB%B2%8C" target="_blank" rel="noreferrer">한국어 게임 시스템 자료</a></p>
      <p><a href="https://namu.moe/w/%EB%A7%A4%EC%A7%81%EC%84%9C%EB%B0%94%EC%9D%B4%EB%B2%8C/%EC%95%84%ED%8B%B0%ED%8C%A9%ED%8A%B8" target="_blank" rel="noreferrer">한국어 아티팩트·시너지 자료</a></p>
    </details>
  );
}
