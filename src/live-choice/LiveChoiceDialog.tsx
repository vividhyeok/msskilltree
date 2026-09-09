import { useMemo, useState } from "react";
import { Dialog } from "../components/Dialog";
import type { Run } from "../engine";
import {
  getLiveChoiceOptions,
  rankLiveChoices,
  type LiveChoiceKind,
} from "./engine";
import "./style.css";

export function LiveChoiceDialog({
  run,
  onRecord,
  onClose,
}: {
  run: Run;
  onRecord: (kind: LiveChoiceKind, id: string) => void;
  onClose: () => void;
}) {
  const options = useMemo(() => getLiveChoiceOptions(run), [run]);
  const [choices, setChoices] = useState(["", "", ""]);
  const [activeSlot, setActiveSlot] = useState(0);
  const [query, setQuery] = useState("");
  const ranked = useMemo(() => rankLiveChoices(choices, run), [choices, run]);
  const normalized = query.replaceAll(" ", "").toLowerCase();
  const results = normalized
    ? options
        .filter(
          (option) =>
            !choices.includes(option.key) &&
            option.nameKo.replaceAll(" ", "").toLowerCase().includes(normalized),
        )
        .slice(0, 10)
    : [];

  function choose(key: string) {
    setChoices((old) => old.map((value, index) => (index === activeSlot ? key : value)));
    const next = choices.findIndex((value, index) => !value && index !== activeSlot);
    setActiveSlot(next >= 0 ? next : Math.min(2, activeSlot + 1));
    setQuery("");
  }

  return (
    <Dialog title="이번 3택 비교" className="live-choice-dialog" onClose={onClose}>
      <div className="live-choice">
        <p className="live-choice-lead">
          게임에 뜬 선택지만 입력하세요. 목표 조합, 기록된 스탯, 현재 Run 메타처럼
          <strong> 확인 가능한 근거만</strong> 이용해 비교합니다.
        </p>

        <div className="live-choice-slots" role="group" aria-label="이번 레벨업 선택지">
          {choices.map((key, index) => {
            const option = options.find((o) => o.key === key);
            return (
              <button
                key={index}
                className={activeSlot === index ? "active" : ""}
                onClick={() => {
                  setActiveSlot(index);
                  setQuery("");
                }}
              >
                <span>{index + 1}</span>
                <strong>{option?.nameKo ?? "선택"}</strong>
                <small>{option?.typeLabel ?? "눌러서 입력"}</small>
              </button>
            );
          })}
        </div>

        <label className="live-choice-search">
          <span>{activeSlot + 1}번 선택지 검색</span>
          <input
            autoFocus
            aria-label={`${activeSlot + 1}번 선택지 검색`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="인게임 이름 입력"
          />
        </label>

        {!!results.length && (
          <div className="live-choice-search-results">
            {results.map((option) => (
              <button key={option.key} onClick={() => choose(option.key)}>
                <strong>{option.nameKo}</strong>
                <span>{option.typeLabel} · {option.role}</span>
              </button>
            ))}
          </div>
        )}
        {normalized && !results.length && (
          <p className="muted">현재 선택 가능한 목록에서 찾지 못했습니다.</p>
        )}

        {!!ranked.length && (
          <section className="live-choice-ranking" aria-label="이번 선택 비교 결과">
            <div className="live-choice-heading">
              <h3>지금 비교</h3>
              <span>{ranked.length < 3 ? "나머지 선택지도 입력하면 더 정확해요" : "위에서부터 우선 검토"}</span>
            </div>
            {ranked.map((choice, index) => (
              <article className={`live-choice-card rank-${index + 1}`} key={choice.key}>
                <div className="live-choice-card-head">
                  <b>{index + 1}</b>
                  <div>
                    <strong>{choice.nameKo}</strong>
                    <small>{choice.typeLabel} · {choice.role}</small>
                  </div>
                  <span>{choice.label}</span>
                </div>
                <p className="live-choice-plain">{choice.detail}</p>
                <ul>
                  {choice.reasons.slice(0, 3).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <button
                  className={index === 0 ? "primary" : ""}
                  onClick={() => {
                    onRecord(choice.kind, choice.id);
                    onClose();
                  }}
                >
                  {choice.nameKo} 선택 기록
                </button>
              </article>
            ))}
          </section>
        )}

        <p className="live-choice-footnote">
          같은 등급처럼 보이더라도 근거가 부족하면 억지로 순위를 만들지 않습니다. 특성 선택이
          필요한 마법은 기록 후 기존 특성 선택 화면으로 이어집니다.
        </p>
      </div>
    </Dialog>
  );
}
