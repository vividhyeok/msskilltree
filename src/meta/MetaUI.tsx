import { useMemo, useState } from "react";
import { Dialog } from "../components/Dialog";
import { TargetBadge } from "../components/GameState";
import { targetBadge } from "../features/game-mode/selectors";
import type { Run } from "../engine";
import { metaData, normalizeMetaContext, type MetaContext } from "./data";
import {
  activeRequirement,
  confidenceLabels,
  contextFor,
  evaluateMeta,
  getContextAdvice,
  getLiveMeta,
  metaFreshness,
  priorityLabels,
  rankArtifacts,
  type Proximity,
  type Recommendation,
} from "./engine";

export function TraitMetaHint({
  run,
  magicId,
  traitId,
}: {
  run: Run;
  magicId: string;
  traitId: string;
}) {
  const entity = metaData.entities.activeSupport.find((e) => {
    const r = activeRequirement(e.id);
    return r?.magicId === magicId && r.traitId === traitId;
  });
  if (!entity) return null;
  const context = contextFor(run);
  if (!context.goal && !context.archetype && !context.phase) return null;
  const r = evaluateMeta(`active:${entity.id}`, run);
  if (r.blocked.length || !r.evidence.length) return null;
  return (
    <span className={`trait-meta-hint ${r.priority}`}>
      커뮤니티 · {r.disputed ? "의견 갈림" : priorityLabels[r.priority]}
      <small>{r.evidence[0].rule.rationaleKo}</small>
    </span>
  );
}

export function MetaEvidence({
  recommendation: r,
  summary = "이유·근거 보기",
}: {
  recommendation: Recommendation;
  summary?: string;
}) {
  return (
    <details className="meta-evidence">
      <summary>{summary}</summary>
      <p>
        커뮤니티 의견 · 신뢰도 {confidenceLabels[r.confidence]} ·{" "}
        {r.disputed ? "의견 갈림" : "상황별 참고"}
      </p>
      {r.notes.map((note) => (
        <p className="meta-caveat" key={note}>
          {note}
        </p>
      ))}
      {r.evidence.map(({ rule, missing }) => (
        <div className="meta-source-rule" key={rule.id}>
          <p>{rule.rationaleKo}</p>
          {!!missing.length && (
            <p className="meta-caveat">확인할 조건: {missing.join(" · ")}</p>
          )}
          {rule.caveatKo && <p className="meta-caveat">{rule.caveatKo}</p>}
          <small>
            v{rule.patch} · 자료 신뢰도 {confidenceLabels[rule.confidence]}
          </small>
          {rule.sourceIds.map((id) => {
            const source = metaData.sources.find((s) => s.id === id);
            return (
              source && (
                <a key={id} href={source.url} target="_blank" rel="noreferrer">
                  {source.title} <small>· {source.published}</small>
                </a>
              )
            );
          })}
        </div>
      ))}
      {r.phaseNotes.map((rule) => (
        <div className="meta-source-rule" key={rule.id}>
          <p>다른 시간대 참고: {rule.rationaleKo}</p>
          {rule.sourceIds.map((id) => {
            const source = metaData.sources.find((s) => s.id === id);
            return (
              source && (
                <a key={id} href={source.url} target="_blank" rel="noreferrer">
                  {source.title} <small>· {source.published}</small>
                </a>
              )
            );
          })}
        </div>
      ))}
      {!r.evidence.length && (
        <p>이 상황에 맞는 근거가 부족합니다. 낮은 성능이라는 뜻은 아닙니다.</p>
      )}
    </details>
  );
}

export function CombinationMetaNote({ run, id }: { run: Run; id: string }) {
  const context = contextFor(run);
  if (!context.goal && !context.archetype && !context.phase) return null;
  const r = evaluateMeta(`combination:${id}`, run);
  if (r.blocked.length || !r.evidence.length) return null;
  return (
    <MetaEvidence
      recommendation={r}
      summary={`커뮤니티 · ${r.disputed ? "의견 갈림" : priorityLabels[r.priority]}`}
    />
  );
}

export function MetaOverview({
  run,
  onPin,
  onFocus,
  onSetup,
}: {
  run: Run;
  onPin: (id: string) => void;
  onFocus: (id: string) => void;
  onSetup: () => void;
}) {
  const items = useMemo(() => getLiveMeta(run), [run]);
  const context = contextFor(run);
  const advice = getContextAdvice(run);
  const configured = !!(context.goal || context.archetype || context.phase);
  const combinations = items.filter((r) => !r.magicId);
  const displayed = [
    ...combinations.slice(0, 1),
    ...items.filter((r) => r.magicId).slice(0, 2),
    ...combinations.slice(1, 2),
  ];
  return (
    <section className="meta-overview" aria-label="상황별 추천">
      <div className="meta-section-title">
        <h3>빌드에 맞는 추천</h3>
        <button onClick={onSetup}>상황 설정</button>
      </div>
      {configured && (
        <p className="meta-stamp">{metaFreshness(context).label}</p>
      )}
      {!configured ? (
        <p className="hud-empty">
          빌드 방향을 정하면 어울리는 조합과 지원 마법도 찾아드려요.
        </p>
      ) : (
        <>
          {!items.length && (
            <p className="hud-empty">
              현재 조건에서 권할 수 있는 추가 선택이 없습니다. 목표 재료와 성장
              효율 경로를 확인하세요.
            </p>
          )}
          {displayed.map((r) => (
            <article
              className="meta-card"
              key={r.ref}
              data-meta-ref={r.ref}
              data-target={targetBadge(run, r.ref.split(":")[1])}
            >
              <div className="meta-card-heading">
                <strong>
                  {targetBadge(run, r.ref.split(":")[1]) && (
                    <TargetBadge
                      badge={targetBadge(run, r.ref.split(":")[1])}
                    />
                  )}{" "}
                  {r.name}
                </strong>
                <span className={`meta-priority ${r.priority}`}>
                  {r.disputed ? "의견 갈림" : priorityLabels[r.priority]}
                </span>
              </div>
              <div className="meta-card-actions">
                <span>추가 {r.additionalLevels}레벨</span>
                {r.magicId ? (
                  <button onClick={() => onFocus(r.magicId!)}>
                    {r.name} 경로 보기
                  </button>
                ) : (
                  <button onClick={() => onPin(r.ref.split(":")[1])}>
                    {run.pinned.includes(r.ref.split(":")[1])
                      ? "목표 해제"
                      : "목표 지정"}
                  </button>
                )}
              </div>
              <MetaEvidence recommendation={r} />
            </article>
          ))}
          {advice.map((r) => (
            <article className="meta-advice" key={r.ref}>
              <p>{r.evidence[0].rule.rationaleKo}</p>
              <MetaEvidence recommendation={r} />
            </article>
          ))}
        </>
      )}
    </section>
  );
}

export function LiveMetaNeeds({
  run,
  onFocus,
  onOverview,
}: {
  run: Run;
  onFocus: (id: string) => void;
  onOverview: () => void;
}) {
  const choices = useMemo(() => getLiveMeta(run).slice(0, 2), [run]);
  return choices.length ? (
    <div className="meta-quick-needs">
      <p>
        커뮤니티 보조 후보 ·{" "}
        {metaFreshness(contextFor(run)).limited
          ? "버전 확인 필요"
          : "상황별 참고"}
      </p>
      {choices.map((r) => (
        <button
          key={r.ref}
          onClick={() => (r.magicId ? onFocus(r.magicId) : onOverview())}
        >
          <strong>{r.name}</strong>
          <span>{r.disputed ? "의견 갈림" : priorityLabels[r.priority]}</span>
        </button>
      ))}
    </div>
  ) : null;
}

type SelectProps = {
  label: string;
  value: string;
  options: { id: string; nameKo: string; aliases?: string[] }[];
  onChange: (value: string) => void;
  empty?: string;
};
function ContextSelect({
  label,
  value,
  options,
  onChange,
  empty = "미설정",
}: SelectProps) {
  return (
    <label className="meta-field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{empty}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nameKo}
            {o.aliases?.length ? ` (${o.aliases[0]})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

export function RunSetup({
  run,
  onSave,
  onClose,
}: {
  run: Run;
  onSave: (context: MetaContext) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => contextFor(run));
  const update = <K extends keyof MetaContext>(key: K, value: MetaContext[K]) =>
    setDraft((s) => ({ ...s, [key]: value }));
  const build = metaData.archetypes.find((a) => a.id === draft.archetype);
  return (
    <Dialog title="Run 설정" onClose={onClose}>
      <form
        className="meta-setup"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(normalizeMetaContext(draft));
          onClose();
        }}
      >
        <p className="muted">
          아는 것만 설정하세요. 시간대가 바뀔 때 한 번 수정하면 됩니다.
        </p>
        <div className="meta-fields">
          <ContextSelect
            label="이번 Run 목표"
            value={draft.goal}
            options={metaData.integration.goalOptions}
            onChange={(v) => update("goal", v)}
          />
          <ContextSelect
            label="빌드 방향"
            value={draft.archetype}
            options={metaData.archetypes}
            onChange={(v) => update("archetype", v)}
          />
          <ContextSelect
            label="현재 시간대"
            value={draft.phase}
            options={metaData.phases.map((p) => ({
              ...p,
              nameKo: `${p.nameKo} · ${p.timeRangeMin[0]}${p.timeRangeMin[1] ? `–${p.timeRangeMin[1]}분` : "분 이후"}`,
            }))}
            onChange={(v) => update("phase", v)}
          />
          <label className="meta-field">
            <span>게임 버전 (직접 확인)</span>
            <input
              aria-label="게임 버전"
              placeholder="예: 0.992"
              value={draft.gameVersion}
              pattern="[0-9]+\.[0-9]+(\.[0-9]+)?"
              onChange={(e) => update("gameVersion", e.target.value)}
            />
          </label>
        </div>
        {build && <p className="meta-build-note">{build.notesKo}</p>}
        <p className="meta-stamp">{metaFreshness(draft).label}</p>
        <details className="meta-setup-extra">
          <summary>클래스·실험체·궁극기 / 성장 예산</summary>
          <div className="meta-fields">
            <ContextSelect
              label="클래스"
              value={draft.class}
              options={metaData.entities.classes}
              onChange={(v) => update("class", v)}
            />
            <ContextSelect
              label="실험체"
              value={draft.subject}
              options={metaData.entities.subjects}
              onChange={(v) => update("subject", v)}
            />
            <ContextSelect
              label="궁극기"
              value={draft.ultimate}
              options={metaData.entities.ultimates}
              onChange={(v) => update("ultimate", v)}
            />
            <ContextSelect
              label="맵"
              value={draft.map}
              options={[
                { id: "terra", nameKo: "테라" },
                { id: "terra_hard", nameKo: "테라 (하드)" },
              ]}
              onChange={(v) => update("map", v)}
            />
            <label className="meta-field">
              <span>남은 마법 선택 횟수</span>
              <input
                type="number"
                min="0"
                max="200"
                step="1"
                placeholder="모르면 비워두기"
                value={draft.remainingPicks ?? ""}
                onChange={(e) =>
                  update(
                    "remainingPicks",
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
              />
            </label>
          </div>
          <p className="muted">
            궁극기 등 예약분을 뺀 횟수를 입력하세요. +로 레벨을 기록할 때 1회씩
            줄고 Undo로 복구됩니다. MAX 이후 성장강화는 마법 선택 횟수에
            포함하지 않습니다.
          </p>
          <p className="muted">
            클래스·궁극기는 추천 조건으로만 사용합니다. seed에 없는 효과나
            실험체 시너지는 추정하지 않습니다.
          </p>
        </details>
        <details className="meta-setup-extra">
          <summary>
            보유 유물 {draft.artifacts.length}개 · 완성 시너지{" "}
            {draft.synergies.length}개
          </summary>
          <div className="owned-options">
            {metaData.entities.artifacts.map((a) => (
              <label key={a.id}>
                <input
                  type="checkbox"
                  checked={draft.artifacts.includes(a.id)}
                  onChange={(e) =>
                    update(
                      "artifacts",
                      e.target.checked
                        ? [...draft.artifacts, a.id]
                        : draft.artifacts.filter((id) => id !== a.id),
                    )
                  }
                />
                {a.nameKo}
              </label>
            ))}
          </div>
          <h3>게임에서 완성한 시너지</h3>
          <div className="owned-options">
            {metaData.entities.synergies.map((s) => (
              <label key={s.id}>
                <input
                  type="checkbox"
                  checked={draft.synergies.includes(s.id)}
                  onChange={(e) =>
                    update(
                      "synergies",
                      e.target.checked
                        ? [...draft.synergies, s.id]
                        : draft.synergies.filter((id) => id !== s.id),
                    )
                  }
                />
                {s.nameKo}
              </label>
            ))}
          </div>
        </details>
        <ContextSelect
          label="마법 배치"
          value={draft.tileOrder}
          empty="선택"
          options={[
            { id: "fixed", nameKo: "고정 가나다순 · 위치 유지" },
            { id: "invested", nameKo: "찍은 마법 우선 · 가나다순" },
          ]}
          onChange={(v) =>
            update("tileOrder", v === "fixed" ? "fixed" : "invested")
          }
        />
        <div className="meta-form-actions">
          <button type="button" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="primary">
            설정 저장
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function ArtifactChoice({
  run,
  onRecord,
  onClose,
  onSetup,
}: {
  run: Run;
  onRecord: (id: string) => void;
  onClose: () => void;
  onSetup: () => void;
}) {
  const [candidates, setCandidates] = useState(["", "", ""]);
  const [proximity, setProximity] = useState<Record<string, Proximity>>({});
  const context = contextFor(run);
  const ranked = useMemo(
    () => rankArtifacts(candidates, run, proximity),
    [candidates, run, proximity],
  );
  const options = metaData.entities.artifacts
    .filter((a) => !context.artifacts.includes(a.id))
    .sort((a, b) => a.nameKo.localeCompare(b.nameKo, "ko"));
  const updateProgress = (id: string, change: Partial<Proximity>) =>
    setProximity((p) => ({
      ...p,
      [id]: {
        ...(p[id] ?? { synergyId: "", missing: 0, coreOwned: false }),
        ...change,
      },
    }));
  return (
    <Dialog
      title="유물 선택 비교"
      className="artifact-choice-dialog"
      onClose={onClose}
    >
      <div className="artifact-choice">
        <div className="meta-section-title">
          <p>게임에 뜬 후보만 고르세요.</p>
          <button onClick={onSetup}>상황 수정</button>
        </div>
        <p className="meta-stamp">{metaFreshness(context).label}</p>
        <div className="artifact-candidates">
          {candidates.map((id, index) => (
            <ContextSelect
              key={index}
              label={`유물 후보 ${index + 1}`}
              empty="후보 선택"
              value={id}
              options={options.filter(
                (a) => a.id === id || !candidates.includes(a.id),
              )}
              onChange={(value) =>
                setCandidates((s) => s.map((v, i) => (i === index ? value : v)))
              }
            />
          ))}
        </div>
        {candidates.length < 4 && (
          <button
            className="artifact-fourth"
            onClick={() => setCandidates((s) => [...s, ""])}
          >
            네 번째 후보 추가
          </button>
        )}
        {!!ranked.length && (
          <details className="meta-setup-extra">
            <summary>시너지 완성이 가까운 후보가 있나요?</summary>
            <p className="muted">
              게임에 표시된 재료와 남은 개수를 직접 확인한 경우만 입력하세요.
            </p>
            {ranked.map((r) => {
              const id = r.ref.split(":")[1];
              const p = proximity[id];
              return (
                <div className="proximity-row" key={id}>
                  <strong>{r.name}</strong>
                  <ContextSelect
                    label={`${r.name}의 시너지`}
                    value={p?.synergyId ?? ""}
                    options={metaData.entities.synergies.filter(
                      (s) => !context.synergies.includes(s.id),
                    )}
                    onChange={(v) => updateProgress(id, { synergyId: v })}
                  />
                  {p?.synergyId && (
                    <>
                      <label className="meta-field">
                        <span>완성까지 남은 재료 수</span>
                        <input
                          aria-label={`${r.name} 남은 재료 수`}
                          type="number"
                          min="1"
                          max="10"
                          value={p.missing || ""}
                          onChange={(e) =>
                            updateProgress(id, {
                              missing: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="check-line">
                        <input
                          type="checkbox"
                          checked={p.coreOwned}
                          onChange={(e) =>
                            updateProgress(id, { coreOwned: e.target.checked })
                          }
                        />
                        고희귀 핵심 재료 보유
                      </label>
                    </>
                  )}
                </div>
              );
            })}
          </details>
        )}
        <div className="artifact-results" aria-live="polite">
          {ranked.map((r) => (
            <article
              className="meta-card"
              key={r.ref}
              data-artifact-result={r.ref.split(":")[1]}
            >
              <div className="meta-card-heading">
                <strong>{r.name}</strong>
                <span className={`meta-priority ${r.priority}`}>
                  {priorityLabels[r.priority]}
                </span>
              </div>
              <p>
                {r.evidence[0]?.rule.rationaleKo ??
                  (r.phaseNotes.length
                    ? "이 유물은 다른 시간대에 대한 평가가 있습니다."
                    : "현재 상황에서 우선순위를 정할 근거가 부족합니다.")}
              </p>
              {r.notes.map((note) => (
                <p className="meta-caveat" key={note}>
                  {note}
                </p>
              ))}
              <div className="meta-card-actions">
                <span>신뢰도 {confidenceLabels[r.confidence]}</span>
                <button
                  className="primary"
                  onClick={() => {
                    onRecord(r.ref.split(":")[1]);
                    onClose();
                  }}
                >
                  {r.name} 선택 기록
                </button>
              </div>
              <MetaEvidence recommendation={r} />
            </article>
          ))}
        </div>
        <p className="muted">
          실제로 선택한 유물만 기록합니다. 목록에 없는 유물은 비교 대상에
          포함되지 않습니다.
        </p>
      </div>
    </Dialog>
  );
}

export function RunContextBar({
  run,
  onSetup,
  onArtifacts,
}: {
  run: Run;
  onSetup: () => void;
  onArtifacts: () => void;
}) {
  const c = contextFor(run);
  const goal = metaData.integration.goalOptions.find(
    (g) => g.id === c.goal,
  )?.nameKo;
  const phase = metaData.phases.find((p) => p.id === c.phase)?.nameKo;
  return (
    <div className="run-context-bar">
      <button onClick={onSetup} aria-label="Run 상황 설정">
        {goal || "플레이 상황 설정"}
        {phase ? ` · ${phase}` : ""}
      </button>
      <span className="context-budget">
        {c.remainingPicks !== null ? `남은 선택 ${c.remainingPicks}회` : ""}
      </span>
      <button onClick={onArtifacts}>
        유물 선택{c.artifacts.length ? ` · 보유 ${c.artifacts.length}` : ""}
      </button>
    </div>
  );
}
