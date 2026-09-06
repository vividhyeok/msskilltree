import {
  data,
  comboById,
  magicById,
  stageFor,
  type Requirement,
} from "../data";
import {
  applyEffects,
  evaluateCombination,
  locks,
  requirementMet,
  completedMagicStates,
  type CompletedMagicState,
  type Run,
} from "../engine";
import {
  metaData,
  normalizeMetaContext,
  type MetaContext,
  type MetaDataset,
  type MetaRule,
} from "./data";

export type Priority =
  "core" | "high" | "consider" | "conditional" | "caution" | "unknown";
export const priorityLabels: Record<Priority, string> = {
  core: "현재 빌드 핵심",
  high: "현재 상황에서 높음",
  consider: "검토할 선택",
  conditional: "조건 확인 필요",
  caution: "기회비용 확인",
  unknown: "추천 근거 부족",
};
export const confidenceLabels = {
  high: "높음",
  medium_high: "중상",
  medium: "보통",
  medium_low: "낮음",
  low: "낮음",
};
const priorities: Priority[] = [
  "core",
  "high",
  "consider",
  "conditional",
  "caution",
  "unknown",
];
const confidenceOrder = [
  "high",
  "medium_high",
  "medium",
  "medium_low",
  "low",
] as const;
function rulePriority(rule: MetaRule, dataset: MetaDataset): Priority {
  let priority =
    (dataset.integration.relations as Record<string, Priority>)[
      rule.relation
    ] ?? "unknown";
  if (!priorities.includes(priority)) return "unknown";
  if (rule.strength.includes("weak") && priorities.indexOf(priority) < 2)
    priority = "consider";
  if (rule.strength === "moderate" && priority === "core") priority = "high";
  if (rule.strength === "strong" && rule.relation === "phase_dependent")
    priority = "high";
  return priority;
}
export type Evidence = { rule: MetaRule; missing: string[] };
export type Recommendation = {
  ref: string;
  name: string;
  priority: Priority;
  confidence: MetaRule["confidence"];
  evidence: Evidence[];
  notes: string[];
  phaseNotes: MetaRule[];
  blocked: string[];
  owned: boolean;
  additionalLevels: number;
  magicId?: string;
  completion?: CompletedMagicState;
  disputed: boolean;
};
import { synergyProgress } from "../companion/data";
import { phaseOpinion } from "../companion/editorial";
import {
  normalizeProgress,
  elapsedSeconds,
  timerPhase,
} from "../companion/engine";
export type Proximity = {
  synergyId: string;
  missing: number;
  coreOwned: boolean;
};
export function contextFor(run: Run) {
  const c = normalizeMetaContext(run.meta);
  const automatic = synergyProgress(c.artifacts)
    .filter((s) => s.remaining === 0)
    .map((s) => s.id);
  const p = normalizeProgress(run.progress);
  return {
    ...c,
    synergies: [...new Set([...c.synergies, ...automatic])],
    ...(p.startedAt !== null || p.elapsed > 0
      ? { phase: timerPhase(elapsedSeconds(p)) }
      : {}),
  };
}
export function metaFreshness(
  context: MetaContext,
  dataset = metaData,
  now = new Date(),
) {
  const baseline = dataset.patch.targetGameVersion;
  if (!context.gameVersion)
    return { limited: true, label: `메타 v${baseline} · 게임 버전 미확인` };
  if (context.gameVersion !== baseline)
    return {
      limited: true,
      label: `메타 v${baseline} / 게임 v${context.gameVersion} · 재검증 필요`,
    };
  const age = (now.getTime() - Date.parse(dataset.patch.createdAt)) / 86400000;
  const watch = dataset.patch.nextPatchWatch;
  if (watch && now.getTime() >= Date.parse(watch.reportedReleaseDate))
    return {
      limited: true,
      label: `메타 v${baseline} · 예정 패치 재확인 필요`,
    };
  if (age > dataset.integration.staleAfterDays)
    return { limited: true, label: `메타 v${baseline} · 자료 갱신 필요` };
  return {
    limited: false,
    label: `커뮤니티 메타 v${baseline} · ${dataset.patch.createdAt} 자료`,
  };
}

const entityGroups = {
  combination: "combinations",
  active: "activeSupport",
  artifact: "artifacts",
  synergy: "synergies",
  ultimate: "ultimates",
  class: "classes",
  subject: "subjects",
  special_passive: "specialPassives",
} as const;
export function entityName(ref: string, dataset = metaData) {
  const [type, id] = ref.split(":");
  if (type === "combination" && comboById[id]) return comboById[id].nameKo;
  const group = entityGroups[type as keyof typeof entityGroups];
  return group
    ? (dataset.entities[group].find((e) => e.id === id)?.nameKo ?? id)
    : id;
}
export function activeRequirement(
  id: string,
  dataset = metaData,
): Requirement | undefined {
  const mapping = (
    dataset.integration.activeMappings as Record<
      string,
      { magicId: string; traitId: string; traitStage: number }
    >
  )[id];
  return mapping
    ? { type: "activeMagic", ...mapping, role: "support" }
    : undefined;
}
function ownedRef(
  ref: string,
  run: Run,
  context: MetaContext,
  dataset: MetaDataset,
): boolean | undefined {
  const [type, id] = ref.split(":");
  if (["class", "subject", "ultimate", "archetype"].includes(type)) {
    const value =
      context[type as "class" | "subject" | "ultimate" | "archetype"];
    return value ? value === id : undefined;
  }
  if (type === "artifact") return context.artifacts.includes(id);
  if (type === "synergy") return context.synergies.includes(id);
  if (type === "combination") return run.completed.includes(id);
  if (type === "active") {
    const r = activeRequirement(id, dataset);
    return !!r && !locks(run)[r.magicId!] && requirementMet(r, run);
  }
  return undefined;
}
const contextLabels: Record<string, string> = {
  goal: "목표",
  archetype: "빌드",
  phase: "시간대",
  class: "클래스",
  subject: "실험체",
  ultimate: "궁극기",
  map: "맵",
  decision: "선택 상황",
};
function matchContext(
  rule: MetaRule,
  context: MetaContext,
  decision: string,
  dataset: MetaDataset,
) {
  const missing: string[] = [];
  for (const [key, values] of Object.entries(rule.context)) {
    // Comparison target is explanatory metadata, not a prerequisite to own it.
    if (key === "alternative") continue;
    const expected = Array.isArray(values) ? values : [values];
    let actual: string[];
    if (key === "goal")
      actual =
        dataset.integration.goalOptions.find((g) => g.id === context.goal)
          ?.tags ?? [];
    else if (key === "decision") actual = [decision];
    else if (
      key in context &&
      typeof context[key as keyof MetaContext] === "string"
    )
      actual = [String(context[key as keyof MetaContext])].filter(Boolean);
    else return null; // Unknown predicates must never silently become unconditional.
    if (!actual.length) missing.push(contextLabels[key] ?? key);
    else if (!actual.some((v) => expected.includes(v))) return null;
  }
  return missing;
}
function applicable(rule: MetaRule, dataset: MetaDataset) {
  return (
    rule.kind === "community_meta" &&
    rule.patch === dataset.patch.targetGameVersion &&
    !["unknown", "obsolete"].includes(rule.reviewStatus ?? "") &&
    rule.sourceIds.length > 0 &&
    rule.sourceIds.every((id) => dataset.sources.some((s) => s.id === id))
  );
}
function matchesSubject(
  rule: MetaRule,
  ref: string,
  run: Run,
  context: MetaContext,
  dataset: MetaDataset,
) {
  const s = rule.subject;
  if (s.type === "set") return s.members?.includes(ref) ? [] : null;
  if (s.type === "pair") {
    if (!s.members?.includes(ref)) return null;
    const missing: string[] = [];
    for (const member of s.members.filter((m) => m !== ref)) {
      const owned = ownedRef(member, run, context, dataset);
      if (owned === false) return null;
      if (owned === undefined) missing.push(entityName(member, dataset));
    }
    return missing;
  }
  return `${s.type}:${s.id}` === ref ? [] : null;
}

export function evaluateMeta(
  ref: string,
  run: Run,
  dataset = metaData,
  now = new Date(),
): Recommendation {
  const context = contextFor(run);
  const [type, id] = ref.split(":");
  const decision =
    type === "artifact"
      ? "artifact_choice"
      : type === "combination"
        ? "combination_goal"
        : "magic_choice";
  const result: Recommendation = {
    ref,
    name: entityName(ref, dataset),
    priority: "unknown",
    confidence: "low",
    evidence: [],
    notes: [],
    phaseNotes: [],
    blocked: [],
    owned: ownedRef(ref, run, context, dataset) === true,
    additionalLevels: 0,
    disputed: false,
  };
  let requirements: Requirement[] = [];
  if (type === "combination") {
    const c = comboById[id];
    if (!c) result.blocked.push("현재 게임 데이터에 없는 조합");
    else {
      result.blocked = evaluateCombination(c, run).reasons;
      requirements = c.requirements;
      const conflicts = run.pinned.filter(
        (cid) =>
          cid !== id &&
          !run.completed.includes(cid) &&
          comboById[cid].activeMagicLocks.some((m) =>
            c.activeMagicLocks.includes(m),
          ),
      );
      if (conflicts.length)
        result.notes.push(
          `목표 ${conflicts.map((cid) => comboById[cid].nameKo).join(", ")}와 재료가 겹칩니다.`,
        );
    }
  } else if (type === "active") {
    const r = activeRequirement(id, dataset);
    if (
      !r ||
      !magicById[r.magicId!] ||
      !stageFor(r)?.traits.some((t) => t.id === r.traitId)
    )
      result.blocked.push("게임 데이터의 마법/특성 연결 미확인");
    else {
      requirements = [r];
      result.magicId = r.magicId;
      const used = locks(run)[r.magicId!];
      result.completion = completedMagicStates(run)[r.magicId!];
      if (used)
        result.blocked.push(
          `${comboById[used].nameKo}${result.completion?.role === "carrier" ? "로 승계" : "에 병합·소멸"} · 원본 재사용 불가`,
        );
      const stage = stageFor(r)!;
      const selected = run.selectedTraits[r.magicId!]?.[stage.level];
      if (selected && selected !== r.traitId)
        result.blocked.push("이미 다른 특성 선택됨");
      if (applyEffects(run).disabled)
        result.blocked.push("특수 조합으로 일반 마법 시전 중단");
      const reserved = run.pinned.filter(
        (cid) =>
          !run.completed.includes(cid) &&
          comboById[cid].activeMagicLocks.includes(r.magicId!),
      );
      if (reserved.length)
        result.notes.push(
          `목표 ${reserved.map((cid) => comboById[cid].nameKo).join(", ")}의 조합 재료입니다. 지원마법으로 유지할 수 없습니다.`,
        );
    }
  }
  const needed = new Map<string, number>();
  for (const r of requirements)
    if (r.magicId) {
      const required = Math.max(
        r.minLevel ?? 1,
        r.traitId ? (stageFor(r)?.level ?? 1) : 1,
      );
      needed.set(r.magicId, Math.max(needed.get(r.magicId) ?? 0, required));
    }
  result.additionalLevels = [...needed].reduce(
    (sum, [magicId, level]) =>
      sum + Math.max(0, level - (run.levels[magicId] ?? 0)),
    0,
  );
  if (
    context.remainingPicks !== null &&
    result.additionalLevels > context.remainingPicks
  )
    result.notes.push(
      `추가 ${result.additionalLevels}회 필요 · 기록한 남은 선택 ${context.remainingPicks}회를 넘습니다.`,
    );
  for (const rule of dataset.rules) {
    if (!applicable(rule, dataset)) continue;
    const subjectMissing = matchesSubject(rule, ref, run, context, dataset);
    if (!subjectMissing) continue;
    const missing = matchContext(rule, context, decision, dataset);
    if (missing)
      result.evidence.push({ rule, missing: [...missing, ...subjectMissing] });
    else if (rule.context.phase) {
      const phase = Array.isArray(rule.context.phase)
        ? rule.context.phase
        : [rule.context.phase];
      const withoutPhase = {
        ...rule,
        context: { ...rule.context, phase: context.phase || phase },
      };
      if (matchContext(withoutPhase, context, decision, dataset))
        result.phaseNotes.push(rule);
    }
  }
  result.evidence.sort(
    (a, b) =>
      a.missing.length - b.missing.length ||
      priorities.indexOf(rulePriority(a.rule, dataset)) -
        priorities.indexOf(rulePriority(b.rule, dataset)) ||
      confidenceOrder.indexOf(a.rule.confidence) -
        confidenceOrder.indexOf(b.rule.confidence),
  );
  const first = result.evidence[0];
  if (first) {
    result.priority = first.missing.length
      ? "conditional"
      : rulePriority(first.rule, dataset);
    result.confidence = first.rule.confidence;
    result.disputed =
      result.evidence.some((e) =>
        dataset.integration.disputedRuleIds.includes(e.rule.id),
      ) ||
      (result.evidence.some(
        (e) => !e.missing.length && rulePriority(e.rule, dataset) === "caution",
      ) &&
        result.evidence.some(
          (e) =>
            !e.missing.length &&
            ["core", "high", "consider"].includes(
              rulePriority(e.rule, dataset),
            ),
        ));
    const onlyOlderSources = first.rule.sourceIds.every((id) =>
      /stale|older|low_current/.test(
        dataset.sources.find((s) => s.id === id)?.reliability ?? "",
      ),
    );
    if (onlyOlderSources)
      result.confidence =
        confidenceOrder[
          Math.max(2, confidenceOrder.indexOf(result.confidence))
        ];
    if (result.disputed && priorities.indexOf(result.priority) < 2)
      result.priority = "consider";
    if (first.missing.length || metaFreshness(context, dataset, now).limited) {
      result.confidence = "low";
      if (priorities.indexOf(result.priority) < 3)
        result.priority = "conditional";
    } else if (!context.goal || !context.archetype || !context.phase) {
      result.confidence =
        confidenceOrder[
          Math.max(2, confidenceOrder.indexOf(result.confidence))
        ];
      if (priorities.indexOf(result.priority) < 2) result.priority = "consider";
    }
    if (result.notes.length) result.priority = "caution";
  }
  return result;
}

export function compareRecommendations(a: Recommendation, b: Recommendation) {
  return (
    priorities.indexOf(a.priority) - priorities.indexOf(b.priority) ||
    confidenceOrder.indexOf(a.confidence) -
      confidenceOrder.indexOf(b.confidence) ||
    a.additionalLevels - b.additionalLevels ||
    a.name.localeCompare(b.name, "ko")
  );
}
export function getLiveMeta(run: Run, dataset = metaData, now = new Date()) {
  const context = contextFor(run);
  if (!context.goal && !context.archetype && !context.phase) return [];
  return [
    ...dataset.entities.combinations.map((c) => `combination:${c.id}`),
    ...dataset.entities.activeSupport.map((c) => `active:${c.id}`),
  ]
    .map((ref) => evaluateMeta(ref, run, dataset, now))
    .filter(
      (r) =>
        !r.blocked.length && !r.owned && r.evidence.length && !r.notes.length,
    )
    .sort(compareRecommendations);
}
export function getContextAdvice(run: Run, dataset = metaData) {
  const context = contextFor(run);
  const refs = [
    `archetype:${context.archetype}`,
    `ultimate:${context.ultimate}`,
    ...dataset.rules
      .filter((r) => r.subject.type === "strategy")
      .map((r) => `strategy:${r.subject.id}`),
  ];
  return refs
    .filter((ref) => !ref.endsWith(":"))
    .map((ref) => evaluateMeta(ref, run, dataset))
    .filter((r) => r.evidence.some((e) => !e.missing.length))
    .slice(0, 2);
}

export function rankArtifacts(
  ids: string[],
  run: Run,
  proximity: Record<string, Proximity> = {},
  dataset = metaData,
  now = new Date(),
) {
  const context = contextFor(run);
  return [...new Set(ids)]
    .filter(
      (id) =>
        dataset.entities.artifacts.some((a) => a.id === id) &&
        !context.artifacts.includes(id),
    )
    .map((id) => {
      const r = evaluateMeta(`artifact:${id}`, run, dataset, now);
      const clock = normalizeProgress(run.progress);
      const opinion = phaseOpinion(
        id,
        clock.startedAt !== null || clock.elapsed > 0
          ? elapsedSeconds(clock, now.getTime())
          : null,
      );
      if (opinion)
        r.notes.push(`${opinion} · v0.992 편집자 의견, 현재 패치 재확인 필요`);
      const before = synergyProgress(context.artifacts);
      const completed = synergyProgress([...context.artifacts, id]).filter(
        (s) =>
          s.remaining === 0 && before.find((b) => b.id === s.id)!.remaining > 0,
      );
      for (const synergy of completed)
        r.notes.push(
          `보유 유물 기준: 이 선택으로 ${synergy.nameKo} 완성 · v0.992 AtWiki 레시피`,
        );
      const progress = proximity[id];
      const policy = dataset.integration.proximity;
      const rule = dataset.rules.find(
        (rule) => rule.id === policy.ruleId && applicable(rule, dataset),
      );
      if (
        progress &&
        dataset.entities.synergies.some((s) => s.id === progress.synergyId) &&
        !context.synergies.includes(progress.synergyId)
      ) {
        const near =
          Number.isInteger(progress.missing) &&
          progress.missing > 0 &&
          progress.missing <= policy.maxMissing &&
          (!policy.requireCoreOwned || progress.coreOwned);
        if (
          near &&
          rule &&
          matchContext(rule, context, "artifact_choice", dataset)
        ) {
          r.evidence.unshift({ rule, missing: [] });
          r.notes.push(
            `직접 확인: ${entityName(`synergy:${progress.synergyId}`, dataset)} 완성까지 ${progress.missing}개 · 핵심 재료 보유`,
          );
          r.priority = metaFreshness(context, dataset, now).limited
            ? "conditional"
            : "high";
          r.confidence = metaFreshness(context, dataset, now).limited
            ? "low"
            : "medium";
        } else
          r.notes.push(
            "시너지 완성이 멀거나 핵심 재료 미확인 · 단품 가치를 우선 비교하세요.",
          );
      }
      return r;
    })
    .sort(compareRecommendations);
}

export function validateMetaData(dataset = metaData) {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const r of dataset.rules) {
    if (ids.has(r.id)) errors.push(`중복 규칙: ${r.id}`);
    ids.add(r.id);
    if (!r.rationaleKo || !r.patch || !r.sourceIds.length)
      errors.push(`근거 누락: ${r.id}`);
    for (const id of r.sourceIds)
      if (!dataset.sources.some((s) => s.id === id))
        errors.push(`출처 누락: ${id}`);
  }
  for (const e of dataset.entities.combinations)
    if (!comboById[e.id]) errors.push(`조합 연결 누락: ${e.id}`);
  for (const e of dataset.entities.activeSupport) {
    const requirement = activeRequirement(e.id, dataset);
    if (
      !requirement ||
      !stageFor(requirement)?.traits.some((t) => t.id === requirement.traitId)
    )
      errors.push(`특성 연결 누락: ${e.id}`);
  }
  return errors;
}
