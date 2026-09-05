import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Undo2, Search, Pin, Check, X } from "lucide-react";
import {
  data,
  magicById,
  comboById,
  requirementLabel,
  stageFor,
  type Combination,
} from "./data";
import {
  emptyRun,
  applyEffects,
  locks,
  evaluateCombination,
  completeCombination,
  requirementMet,
  validateGameData,
  type Run,
} from "./engine";
import {
  fresh,
  serialize,
  deserialize,
  STORAGE_KEY,
  type Saved,
} from "./storage";
import "./style.css";
import { MagicGrid } from "./features/game-mode/MagicGrid";
import { TargetPanel } from "./features/game-mode/TargetPanel";
import { getFocusedMagicPaths } from "./features/game-mode/selectors";
validateGameData();
const statusNames = {
  READY: "지금 가능",
  IN_PROGRESS: "성장 중",
  AVAILABLE: "미보유",
  BLOCKED: "사용 불가",
  COMPLETED: "완료",
};
function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current!;
    el.showModal();
    return () => el.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-head">
        <h2>{title}</h2>
        <button aria-label="닫기" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function App() {
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<Saved>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? deserialize(raw) : fresh();
    } catch {
      return fresh();
    }
  });
  const [storageBlocked, setStorageBlocked] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) deserialize(raw);
      return false;
    } catch {
      return true;
    }
  });
  const [selected, setSelected] = useState("");
  const [menu, setMenu] = useState(false);
  const [catalog, setCatalog] = useState(false);

  const [mobile, setMobile] = useState(false);
  const [buildOpen, setBuildOpen] = useState(false);
  const [buildName, setBuildName] = useState("");
  const [newRun, setNewRun] = useState(false);
  const [trait, setTrait] = useState<{ id: string; level: number } | null>(
    null,
  );
  const [warning, setWarning] = useState<{
    id: string;
    level: number;
    value: string;
    names: string[];
  } | null>(null);
  const [audit, setAudit] = useState(location.pathname === "/audit");
  const run = saved.run;
  const effects = applyEffects(run);
  const used = locks(run);
  useEffect(() => {
    if (storageBlocked) return;
    try {
      localStorage.setItem(STORAGE_KEY, serialize(saved));
      setError("");
    } catch {
      setError("자동 저장에 실패했습니다. 브라우저 저장 공간을 확인해주세요.");
    }
  }, [saved, storageBlocked]);
  useEffect(() => {
    const handler = () => setAudit(location.pathname === "/audit");
    addEventListener("popstate", handler);
    return () => removeEventListener("popstate", handler);
  }, []);
  function change(next: Run) {
    setSaved((s) => ({
      ...s,
      run: next,
      history: [...s.history, s.run].slice(-30),
    }));
  }
  function tap(id: string) {
    setSelected(id);
    const m = magicById[id] ?? data.passives.find((p) => p.id === id)!;
    if (used[id]) return;
    const pending = magicById[id]?.traitStages.find(
      (s) =>
        s.level <= (run.levels[id] ?? 0) && !run.selectedTraits[id]?.[s.level],
    );
    if (pending) {
      setTrait({ id, level: pending.level });
      return;
    }
    const level = Math.min(m.maxLevel, (run.levels[id] ?? 0) + 1);
    if (level !== (run.levels[id] ?? 0))
      change({ ...run, levels: { ...run.levels, [id]: level } });
    const stage = magicById[id]?.traitStages.find((s) => s.level === level);
    if (stage && !run.selectedTraits[id]?.[level]) setTrait({ id, level });
  }
  function choose(id: string, level: number, value: string, confirmed = false) {
    const names = run.pinned
      .filter((cid) =>
        comboById[cid].requirements.some(
          (r) =>
            r.type === "activeMagic" &&
            r.magicId === id &&
            stageFor(r)?.level === level &&
            r.traitId !== value,
        ),
      )
      .map((cid) => `${badge(cid)} ${comboById[cid].nameKo}`);
    if (names.length && !confirmed) {
      setWarning({ id, level, value, names });
      return;
    }
    change({
      ...run,
      selectedTraits: {
        ...run.selectedTraits,
        [id]: { ...run.selectedTraits[id], [level]: value },
      },
    });
    setWarning(null);
    setTrait(null);
  }
  function badge(id: string) {
    return String.fromCharCode(65 + run.pinned.indexOf(id));
  }
  function pin(id: string) {
    change({
      ...run,
      pinned: run.pinned.includes(id)
        ? run.pinned.filter((x) => x !== id)
        : [...run.pinned, id],
    });
  }
  function reset(pinned: string[] = []) {
    setSaved((s) => ({ ...s, run: { ...emptyRun(), pinned }, history: [] }));
    setSelected("");
    setNewRun(false);
    setBuildOpen(false);
  }
  function comboCard(c: Combination) {
    const e = evaluateCombination(c, run);
    return (
      <article className={"combo " + e.status.toLowerCase()} key={c.id}>
        <div className="combo-title">
          <h3>
            {run.pinned.includes(c.id) && (
              <b className="badge">{badge(c.id)}</b>
            )}
            {c.nameKo}
          </h3>
          <span className={"status " + e.status.toLowerCase()}>
            {statusNames[e.status]}
          </span>
        </div>
        {c.requirements.map((r, i) => (
          <div
            className={"requirement " + (requirementMet(r, run) ? "met" : "")}
            key={i}
          >
            <span>
              {requirementMet(r, run) ? "✓" : "○"} {requirementLabel(r)}
            </span>
            <small>
              {r.magicId && !requirementMet(r, run)
                ? `현재 Lv.${run.levels[r.magicId] ?? 0}`
                : ""}
            </small>
          </div>
        ))}
        {e.reasons.map((reason) => (
          <p className="reason" key={reason}>
            {reason}
          </p>
        ))}
        {c.note && (
          <details>
            <summary>특수 규칙</summary>
            <p>{c.note}</p>
          </details>
        )}
        <div className="combo-actions">
          <button
            className={run.pinned.includes(c.id) ? "pinned" : "quiet"}
            onClick={() => pin(c.id)}
          >
            <Pin size={14} />
            {run.pinned.includes(c.id) ? "목표 해제" : "목표 지정"}
          </button>
          {e.status === "READY" && (
            <button
              className="primary"
              onClick={() => change(completeCombination(run, c.id))}
            >
              <Check size={16} />
              조합 완료
            </button>
          )}
        </div>
      </article>
    );
  }
  const panel = (
      <TargetPanel
        onClearFocus={() => setSelected("")}
      run={run}
      selected={selected}
      onPin={pin}
      onComplete={(id) => change(completeCombination(run, id))}
      onEdit={(id, level) => setTrait({ id, level })}
    />
  );
  function focus(id: string) {
    setSelected(current => current === id ? "" : id);
    if (matchMedia("(max-width: 650px)").matches) setMobile(true);
  }
  return (
    <>
      <header className="game-header">
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            history.pushState({}, "", "/");
            setAudit(false);
          }}
        >
          MS <span>Companion</span>
        </a>
        <div className="header-actions">
          <span className="slots">
            완료 <b>{effects.used}</b> / {effects.slots}
          </span>
          <button
            aria-label="되돌리기"
            disabled={!saved.history.length}
            onClick={() => {
              setSaved((s) => ({
                ...s,
                run: s.history.at(-1)!,
                history: s.history.slice(0, -1),
              }));
              setTrait(null);
            }}
          >
            <Undo2 size={17} />
            <span>Undo</span>
          </button>
          <button aria-label="새 Run" onClick={() => setNewRun(true)}>
            새 Run
          </button>
          <button aria-label="더보기" onClick={() => setMenu(true)}>
            •••
          </button>
        </div>
      </header>
      {(error || storageBlocked) && (
        <div role="alert" className="notice">
          {storageBlocked
            ? "저장 데이터를 읽지 못했습니다. 기존 데이터는 보존되어 있습니다."
            : error}
          {storageBlocked && (
            <button
              onClick={() => {
                localStorage.setItem(
                  STORAGE_KEY + "-backup",
                  localStorage.getItem(STORAGE_KEY) ?? "",
                );
                setStorageBlocked(false);
              }}
            >
              기존 데이터 백업 후 새로 시작
            </button>
          )}
        </div>
      )}
      {audit ? (
        <main className="audit">
          <div className="section-title">
            <div>
              <span className="eyebrow">
                DATA AUDIT · v{data.metadata.targetGameVersion}
              </span>
              <h1>게임 도감 대조</h1>
              <p className="muted">
                {
                  Object.values(saved.audit).filter((a) => a.status === "match")
                    .length
                }{" "}
                / {data.combinations.length} 확인 · 검수 내용은 이 기기에 자동
                저장됩니다.
              </p>
            </div>
            <button
              onClick={() => {
                const blob = new Blob(
                  [
                    JSON.stringify(
                      {
                        gameVersion: data.metadata.targetGameVersion,
                        corrections: Object.entries(saved.audit).map(
                          ([combinationId, a]) => ({
                            combinationId,
                            field: "requirements",
                            ...a,
                          }),
                        ),
                      },
                      null,
                      2,
                    ),
                  ],
                  { type: "application/json" },
                );
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "corrections.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              corrections.json 내보내기
            </button>
          </div>
          <div className="audit-grid">
            {data.combinations.map((c) => (
              <article className="combo" key={c.id}>
                <h3>{c.nameKo}</h3>
                {c.requirements.map((r, i) => (
                  <p key={i}>{requirementLabel(r)}</p>
                ))}
                <small className="muted">{c.verification.status}</small>
                <div className="combo-actions">
                  {[
                    ["match", "일치"],
                    ["correction", "수정 필요"],
                  ].map(([status, label]) => (
                    <button
                      className={
                        saved.audit[c.id]?.status === status ? "pinned" : ""
                      }
                      key={status}
                      onClick={() =>
                        setSaved((s) => ({
                          ...s,
                          audit: {
                            ...s.audit,
                            [c.id]: { note: s.audit[c.id]?.note ?? "", status },
                          },
                        }))
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <textarea
                  aria-label={`${c.nameKo} 수정 메모`}
                  placeholder="게임 도감과 다른 내용 메모"
                  value={saved.audit[c.id]?.note ?? ""}
                  onChange={(e) =>
                    setSaved((s) => ({
                      ...s,
                      audit: {
                        ...s.audit,
                        [c.id]: {
                          status: s.audit[c.id]?.status ?? "correction",
                          note: e.target.value,
                        },
                      },
                    }))
                  }
                />
              </article>
            ))}
          </div>
        </main>
      ) : (
        <main className="game-layout">
          <MagicGrid
            run={run}
            selected={selected}
            onFocus={focus}
            onRecord={tap}
          />
          <aside className="side-panel">{panel}</aside>
        </main>
      )}
      {!audit && (
        <button
          className="mobile-toggle primary"
          onClick={() => setMobile(true)}
        >
          목표 / 조합 보기
        </button>
      )}
      {mobile && (
        <Dialog title="목표와 조합 경로" onClose={() => setMobile(false)}>
          {panel}
        </Dialog>
      )}
      {menu && (
        <Dialog title="더보기" onClose={() => setMenu(false)}>
          <nav className="secondary-menu">
            <button
              onClick={() => {
                setMenu(false);
                setBuildOpen(true);
              }}
            >
              저장한 빌드
            </button>
            <button
              onClick={() => {
                setMenu(false);
                setCatalog(true);
              }}
            >
              전체 조합 도감
            </button>
            <button
              onClick={() => {
                setMenu(false);
                history.pushState({}, "", "/audit");
                setAudit(true);
              }}
            >
              데이터 검수
            </button>
          </nav>
          <label className="check-line">
            <input
              type="checkbox"
              checked={run.bonus}
              disabled={!data.rules.combinationSlots.manualBonusSupported}
              onChange={(e) => change({ ...run, bonus: e.target.checked })}
            />
            {data.rules.combinationSlots.knownBonusArtifact.nameKo} · 슬롯 +
            {data.rules.combinationSlots.knownBonusArtifact.addSlots}
          </label>
          <p className="muted">
            {error || storageBlocked ? "저장 확인 필요" : "이 기기에 자동 저장"}{" "}
            · v{data.metadata.targetGameVersion}
          </p>
          {effects.disabled && (
            <p className="muted">일반 액티브 마법 시전 중단</p>
          )}
          {effects.extraLevels > 0 && (
            <p className="muted">최대 플레이어 레벨 +{effects.extraLevels}</p>
          )}
        </Dialog>
      )}
      {newRun && (
        <Dialog title="새 Run을 시작할까요?" onClose={() => setNewRun(false)}>
          <p>
            마법 레벨, 특성, 목표, 완료 조합과 Undo 기록이 초기화됩니다. 저장한
            빌드는 유지됩니다.
          </p>
          <div className="combo-actions">
            <button onClick={() => setNewRun(false)}>취소</button>
            <button className="primary" onClick={() => reset()}>
              새 Run 시작
            </button>
          </div>
        </Dialog>
      )}
      {trait && (
        <Dialog
          title={`${magicById[trait.id].nameKo} · Lv.${trait.level} 특성`}
          onClose={() => {
            setTrait(null);
            setWarning(null);
          }}
        >
          <div className="filters">
            {magicById[trait.id].traitStages
              .filter((s) => s.level <= (run.levels[trait.id] ?? 0))
              .map((s) => (
                <button
                  className={s.level === trait.level ? "active" : ""}
                  key={s.level}
                  onClick={() => setTrait({ ...trait, level: s.level })}
                >
                  Lv.{s.level}
                </button>
              ))}
          </div>
          {warning ? (
            <div className="conflict">
              <h3>{warning.names.join(", ")}이 막힙니다.</h3>
              <p>
                필요:{" "}
                {run.pinned
                  .flatMap((id) =>
                    comboById[id].requirements
                      .filter(
                        (r) =>
                          r.magicId === warning.id &&
                          stageFor(r)?.level === warning.level &&
                          r.traitId !== warning.value,
                      )
                      .map(
                        (r) =>
                          stageFor(r)?.traits.find((t) => t.id === r.traitId)
                            ?.nameKo,
                      ),
                  )
                  .join(" / ")}
              </p>
              <p>
                선택:{" "}
                {
                  magicById[warning.id].traitStages
                    .find((s) => s.level === warning.level)
                    ?.traits.find((t) => t.id === warning.value)?.nameKo
                }
              </p>
              <div className="combo-actions">
                <button onClick={() => setWarning(null)}>취소</button>
                <button
                  onClick={() =>
                    choose(warning.id, warning.level, warning.value, true)
                  }
                >
                  그래도 선택
                </button>
              </div>
            </div>
          ) : (
            magicById[trait.id].traitStages
              .find((s) => s.level === trait.level)!
              .traits.map((t) => (
                <div className="trait-choice" key={t.id}>
                  <button
                    className="trait-option"
                    aria-label={`${t.nameKo} 선택`}
                    onClick={() => choose(trait.id, trait.level, t.id)}
                  >
                    <strong>
                      {t.nameKo}
                      {run.selectedTraits[trait.id]?.[trait.level] === t.id
                        ? " ✓"
                        : ""}
                    </strong>
                    {getFocusedMagicPaths(run, trait.id)
                      .find(
                        (p) => p.stage === trait.level && p.trait.id === t.id,
                      )
                      ?.combinations.map((c) => (
                        <span
                          className={`picker-path ${c.partners.some(r => r.consumedBy) ? "consumed-path" : ""}`}
                          key={c.id}
                        >
                          <b>
                            {c.badge && `${c.badge} `}
                            {c.name}
                            {c.partners.some(r => r.consumedBy) && " · 조합 불가"}
                          </b>
                          <small>
                            + {c.partners.map((r) => r.consumedLabel ?? r.label).join(" + ")}
                          </small>
                        </span>
                      ))}
                  </button>
                  <details>
                    <summary>ⓘ 상세 효과</summary>
                    <p>{t.effectSummary.join(" · ")}</p>
                  </details>
                </div>
              ))
          )}
        </Dialog>
      )}
      {catalog && (
        <Catalog onClose={() => setCatalog(false)} render={comboCard} />
      )}
      {buildOpen && (
        <Dialog title="즐겨찾는 빌드" onClose={() => setBuildOpen(false)}>
          <p className="muted">
            목표 조합 계획을 저장합니다. 불러오면 새 Run으로 시작합니다.
          </p>
          <label className="build-input">
            빌드 이름
            <input
              value={buildName}
              onChange={(e) => setBuildName(e.target.value)}
              placeholder="예: 번개 빌드"
              maxLength={50}
            />
          </label>
          <button
            className="primary"
            disabled={!buildName.trim() || !run.pinned.length}
            onClick={() => {
              setSaved((s) => ({
                ...s,
                builds: [
                  ...s.builds,
                  {
                    id: crypto.randomUUID(),
                    name: buildName.trim(),
                    pinned: [...run.pinned],
                  },
                ],
              }));
              setBuildName("");
            }}
          >
            현재 목표를 빌드로 저장
          </button>
          {saved.builds.map((b) => (
            <div className="saved-build" key={b.id}>
              <strong>{b.name}</strong>
              <p>{b.pinned.map((id) => comboById[id].nameKo).join(" · ")}</p>
              <button
                onClick={() => {
                  if (confirm("현재 Run을 초기화하고 이 빌드로 시작할까요?"))
                    reset(b.pinned);
                }}
              >
                새 Run으로 불러오기
              </button>
              <button
                aria-label={`${b.name} 삭제`}
                onClick={() =>
                  setSaved((s) => ({
                    ...s,
                    builds: s.builds.filter((x) => x.id !== b.id),
                  }))
                }
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </Dialog>
      )}
    </>
  );
}
function Catalog({
  onClose,
  render,
}: {
  onClose: () => void;
  render: (c: Combination) => React.ReactNode;
}) {
  const [q, setQ] = useState("");
  return (
    <Dialog title="조합 도감 · 목표 지정" onClose={onClose}>
      <label className="search catalog-search">
        <Search size={18} />
        <input
          aria-label="조합 검색"
          placeholder="조합, 마법, 특성 이름 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      {data.combinations
        .filter((c) =>
          [c.nameKo, ...c.requirements.map(requirementLabel)]
            .join(" ")
            .includes(q),
        )
        .map(render)}
    </Dialog>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
