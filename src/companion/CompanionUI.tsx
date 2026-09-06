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
import "./style.css";
import sources from "../../src-data/v4-research/data/source-manifest.json";

const effectLabels: Record<string, string> = {
  attackPercent: "공격력",
  allMagicDamagePercent: "마법 피해",
  cooldownPercent: "재사용 대기시간",
  maxHpPercent: "최대 체력",
  lifeOrbHealPercent: "생명 구슬 회복",
  moveSpeedPercent: "이동 속도",
  magicSizePercent: "마법 크기",
  durationPercent: "지속 시간",
  critChancePercent: "치명타 확률",
  critMultiplierPercent: "치명타 배율",
  pickupRangePercent: "획득 범위",
  enemyMoveSpeedPercent: "적 이동 속도",
  enemyMaxHpPercent: "적 최대 체력",
  hpRegenPerSecondPercent: "초당 체력 회복",
  manaBeadDropPercent: "마나 구슬 드롭",
  maxPlayerLevel: "최대 레벨",
  revives: "부활 횟수",
  runeDurationPercent: "룬 지속 시간",
  attackAmpPercent: "공격력 증폭",
  attackAmplificationPercent: "공격력 증폭",
  damageTakenPercent: "받는 피해",
  manaGainPercent: "마나 획득",
  merchantDiscountPercent: "상인 할인",
  magicDamagePercent: "해당 마법 피해",
  eliteMaxHpPercent: "정예 최대 체력",
  spawnNormalChest: "일반 보물상자",
  allGrowthEnhancementLevels: "모든 성장강화 레벨",
};
function effectText(effect: object) {
  return (
    Object.entries(effect)
      .filter(([, v]) => typeof v === "number")
      .map(
        ([k, v]) =>
          `${effectLabels[k] ?? k} ${v > 0 ? "+" : ""}${v}${k.includes("Percent") ? "%" : ""}`,
      )
      .join(" · ") || "선택형 효과 · 상세 자료 확인"
  );
}
export function RunClock({
  run,
  onChange,
}: {
  run: Run;
  onChange: (r: Run) => void;
}) {
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
      aria-label={
        p.startedAt === null ? "Run 타이머 시작" : "Run 타이머 일시정지"
      }
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
      {p.startedAt === null ? "▶" : "Ⅱ"}{" "}
      {Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0")}
      :{(seconds % 60).toString().padStart(2, "0")}
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
  const update = (patch: Partial<typeof p>) =>
    onChange({ ...run, progress: { ...p, ...patch } });
  const rows =
    tab === "normal"
      ? companion.normal.map((s) => ({
          id: s.id,
          name: passiveName(s.id),
          max: s.maxLevel,
          level: run.levels[s.id] ?? 0,
          effect: s.perLevel,
          uncertain: s.nameStatus !== "high",
        }))
      : tab === "special"
        ? companion.special.map((s) => ({
            id: s.id,
            name: s.nameKoCandidate,
            max: 1,
            level: p.special.includes(s.id) ? 1 : 0,
            effect: s.effects,
            uncertain: s.nameStatus !== "known_current_repo",
          }))
        : companion.growth.map((s) => ({
            id: s.id,
            name: passiveName(s.id),
            max: s.maxLevel,
            level: p.growth[s.id] ?? 0,
            effect: s.perLevel,
            uncertain:
              companion.normal.find((n) => n.id === s.id)?.nameStatus !==
              "high",
          }));
  const total = Object.values(p.growth).reduce((a, b) => a + b, 0);
  return (
    <Dialog title="성장 · Run 기록" className="companion-dialog" onClose={onClose}>
      <div className="companion-tabs" role="group" aria-label="성장 종류">
        {[
          ["normal", "일반 패시브"],
          ["special", "특수 패시브"],
          ["growth", "MAX 성장강화"],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-pressed={tab === id}
            onClick={() => {
              setTab(id);
              setQuery("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="muted">
        실제로 선택한 것만 기록하세요. 수치는 1회 선택 효과이며 최종 능력치
        합산이 아닙니다.
      </p>
      {tab === "growth" && (
        <div className="growth-stage">
          <label>
            <input
              type="checkbox"
              checked={p.growthPhase}
              onChange={(e) => update({ growthPhase: e.target.checked })}
            />{" "}
            현재 MAX 이후 성장강화 중
          </label>
          <strong>{total} / 50회</strong>
          <p>
            일반 패시브와 별도 기록 · 종류별 최대 8회 · 추가 횟수 효과는 아직
            계산하지 않습니다.
          </p>
        </div>
      )}
      <input
        className="companion-search"
        aria-label="패시브 검색"
        placeholder="선택지 이름 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="companion-grid">
        {rows
          .filter((s) =>
            s.name.replaceAll(" ", "").includes(query.replaceAll(" ", "")),
          )
          .map((s) => (
            <button
              key={s.id}
              className="companion-pick"
              disabled={
                s.level >= s.max ||
                (tab === "growth"
                  ? !p.growthPhase || total >= 50
                  : p.growthPhase)
              }
              onClick={() => {
                if (tab === "normal") onRecord(s.id);
                else if (tab === "growth") onChange(recordGrowth(run, s.id));
                else update({ special: [...p.special, s.id] });
              }}
            >
              <span>
                <strong>{s.name}</strong>
                <b>
                  {s.level}/{s.max}
                </b>
              </span>
              <small>{effectText(s.effect)}</small>
              {s.uncertain && <em>번역명 확인 대기</em>}
            </button>
          ))}
      </div>
      <details className="companion-details">
        <summary>궁극기 조건 · 시간 · 빌드 기록</summary>
        <p className="muted">
          클래스·실험체·궁극기 목표는 플레이 상황 설정에서 한 번 선택합니다.
        </p>
        <label className="meta-field">
          현재 캐릭터 레벨 (선택)
          <input
            aria-label="현재 캐릭터 레벨"
            type="number"
            min="1"
            max="200"
            value={p.playerLevel ?? ""}
            onChange={(e) =>
              update({
                playerLevel: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </label>
        <label className="check-line">
          <input
            type="checkbox"
            checked={p.cityCleared}
            onChange={(e) => update({ cityCleared: e.target.checked })}
          />{" "}
          도시 클리어로 궁극기 해금
        </label>
        {run.meta?.ultimate ? (
          <ul className="ultimate-checks">
            {ultimateRequirements(run, run.meta.ultimate).map((r) => (
              <li key={r.label}>
                {r.met ? "✓" : "○"} {r.label}
                {r.id
                  ? ` · ${comboById[r.id]?.nameKo ?? [...companion.classes, ...companion.subjects].find((e) => e.id === r.id)?.nameKo ?? r.id}`
                  : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p>궁극기 목표를 설정하면 필요한 조합과 조건이 표시됩니다.</p>
        )}
        <label className="meta-field">
          타이머 시간 수정 (분)
          <input
            aria-label="타이머 분"
            type="number"
            min="0"
            max="300"
            value={Math.floor(p.elapsed / 60)}
            onChange={(e) =>
              update({
                elapsed:
                  Math.max(0, Math.min(300, Number(e.target.value))) * 60,
                startedAt: null,
              })
            }
          />
        </label>
        <p className="muted">
          게임을 멈출 때 타이머도 멈춰주세요. 실행 중에는 시간대로 메타 상황을
          자동 설정합니다.
        </p>
        <BuildCoverage run={run} />
        <p className="muted">
          자료팩 v0.992 · AtWiki 마법/유물, Namu 궁극기(2026-08). 클래스 성장
          수치는 출처 충돌로 자동 적용하지 않습니다. 실험체 해금 보너스·인챈트
          대상 효과·연구 수치는 계산 대기입니다.
        </p>
      </details>
    </Dialog>
  );
}
function BuildCoverage({ run }: { run: Run }) {
  const p = normalizeProgress(run.progress);
  const effects = [
    ...companion.normal
      .filter((n) => (run.levels[n.id] ?? 0) > 0)
      .map((n) => ({ name: passiveName(n.id), effects: n.perLevel })),
    ...companion.special
      .filter((n) => p.special.includes(n.id))
      .map((n) => ({ name: n.nameKoCandidate, effects: n.effects })),
    ...companion.artifacts
      .filter((n) => run.meta?.artifacts.includes(n.id))
      .map((n) => ({ name: n.nameKo, effects: n.effects })),
  ];
  return (
    <div>
      <h3>기록한 보완 수단</h3>
      <p className="muted">
        미기록은 부족 확정이 아닙니다. 아래 수단이 없는 축을 다음 선택 때
        살펴보세요.
      </p>
      {[
        ["쿨다운", "cooldown"],
        ["생존", "Hp|revive|damageTaken|Regen"],
        ["이동", "moveSpeed"],
        ["적 제어", "enemyMove"],
        ["성장·경제", "mana|pickup|merchant"],
      ].map(([label, pattern]) => (
        <p key={label}>
          <b>{label}</b> ·{" "}
          {effects
            .filter((e) =>
              Object.keys(e.effects).some((k) =>
                new RegExp(pattern, "i").test(k),
              ),
            )
            .map((e) => e.name)
            .join(", ") || "기록한 수단 없음"}
        </p>
      ))}
    </div>
  );
}
export function InventoryProgress({ run }: { run: Run }) {
  const list = synergyProgress(run.meta?.artifacts ?? [])
    .filter((s) => s.missing.length < s.requirements.length)
    .sort((a, b) => a.remaining - b.remaining);
  return (
    <details className="companion-details">
      <summary>
        보유 유물로 본 시너지 {list.filter((s) => s.remaining === 0).length}개
        완성
      </summary>
      <p className="muted">
        레시피가 있는 10종만 자동 계산 · 재료는 소모되지 않습니다.
      </p>
      {list.map((s) => (
        <p key={s.id}>
          <strong>
            {s.nameKo} · {s.remaining === 0 ? "완성" : `${s.remaining}개 남음`}
          </strong>
          {s.remaining > 0 && (
            <small>
              {" "}
              {s.missing
                .map(
                  (id) =>
                    metaData.entities.artifacts.find((a) => a.id === id)
                      ?.nameKo ?? id,
                )
                .join(", ")}
            </small>
          )}
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
        {ultimateRequirements(run, u.id)
          .slice(0, 3)
          .map((r) => (
            <li key={r.label}>
              {r.met ? "✓" : "○"} {r.label} ·{" "}
              {r.id
                ? (comboById[r.id]?.nameKo ??
                  [...companion.classes, ...companion.subjects].find(
                    (s) => s.id === r.id,
                  )?.nameKo ??
                  r.id)
                : "제한 없음"}
            </li>
          ))}
      </ul>
      <p>
        도시 클리어 + 레벨 100 선택 기회 필요. 현재 레벨과 해금 여부는 성장 ·
        Run 기록에서 확인합니다.
      </p>
      <small>v0.992 자료팩 · {u.requirementsVerified}</small>
    </div>
  );
}
export function SeedSources() {
  return (
    <details className="companion-details">
      <summary>V4 자료 출처와 적용 범위</summary>
      <p>
        제공 자료팩 기준 v0.992. 현재 패치와 게임 도감으로 재확인이 필요합니다.
        등급은 편집자 의견이며 조합 가능 여부를 바꾸지 않습니다.
      </p>
      <p>
        마도학자 선택지 감소: 최신 Namu -1 / 과거 AtWiki -2. 고고학자 상자: 최신
        15레벨 / 과거 20레벨. 전문 클래스 배율은 개별 검증 대기입니다.
      </p>
      <p>
        유물로 증가한 패시브 레벨·MAX 및 특수 패시브의 추가 보상은 자동 기록하지
        않습니다. 실제 레벨과 보상을 직접 기록하세요. 현재 패시브 한도는 기본
        한도입니다.
      </p>
      {sources
        .filter((s) =>
          [
            "atwiki_magic",
            "atwiki_artifact",
            "namu_ultimate",
            "namu_class",
          ].includes(s.id),
        )
        .map((s) => (
          <p key={s.id}>
            <a href={s.url} target="_blank" rel="noreferrer">
              {s.title}
            </a>
          </p>
        ))}
    </details>
  );
}
