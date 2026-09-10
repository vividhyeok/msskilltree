import { useMemo, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { comboById, data, magicById } from "../data";
import type { Run } from "../engine";
import { metaData } from "../meta/data";
import {
  deckTargetIds,
  magicDeckHeat,
  rankDecks,
  type DeckCompatibility,
} from "./engine";
import "./style.css";

type Props = {
  run: Run;
  onUseDeck: (ids: string[], archetypeId: string) => void;
  onOpenLive: () => void;
};

const confidenceLabel: Record<string, string> = {
  high: "근거 높음",
  medium_high: "근거 중상",
  medium: "근거 보통",
  medium_low: "근거 낮음",
  low: "근거 낮음",
};

function DeckCard({
  deck,
  selectedCount,
  onUse,
}: {
  deck: DeckCompatibility;
  selectedCount: number;
  onUse: () => void;
}) {
  const coreNames = deck.coreCombinationIds
    .map((id) => comboById[id]?.nameKo)
    .filter(Boolean);
  const supportNames = deck.supportMagicIds
    .map((id) => magicById[id]?.nameKo)
    .filter(Boolean);
  const targetIds = deckTargetIds(deck);
  const style = {
    "--deck-strength": deck.blocked ? 0.08 : 0.28 + deck.score * 0.72,
  } as React.CSSProperties;
  return (
    <article
      className={`deck-card ${deck.blocked ? "is-blocked" : ""}`}
      style={style}
      data-compatibility={deck.label}
    >
      <div className="deck-card-head">
        <div>
          <span className="deck-fit">{deck.label}</span>
          <h2>{deck.nameKo}</h2>
        </div>
        <small>{confidenceLabel[deck.confidence] ?? deck.confidence}</small>
      </div>

      <div className="deck-match-line">
        {selectedCount ? (
          <>
            <strong>{deck.directMatches.length}</strong>개 직접 일치
            {deck.adjacentMatches.length > 0 && (
              <span> · {deck.adjacentMatches.length}개 조합 연결</span>
            )}
          </>
        ) : (
          <span>선택한 마법에 따라 카드 농도와 순서가 바뀝니다.</span>
        )}
      </div>

      {!!coreNames.length && (
        <div className="deck-row">
          <b>핵심 조합</b>
          <div className="deck-tags">
            {coreNames.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
        </div>
      )}
      {!!supportNames.length && (
        <div className="deck-row">
          <b>자주 붙는 지원</b>
          <div className="deck-tags subtle">
            {supportNames.slice(0, 5).map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
        </div>
      )}

      <p>{deck.notesKo}</p>

      <div className="deck-card-foot">
        <small>
          커뮤니티 스냅샷 v{deck.patch} · 근거 {deck.sourceCount}개
        </small>
        <button
          className="primary"
          disabled={!targetIds.length || deck.blocked}
          onClick={onUse}
        >
          {deck.blocked ? "현재 Run과 충돌" : targetIds.length ? "이 덱 목표로 가져가기" : "전략 참고용"}
        </button>
      </div>
    </article>
  );
}

export function DeckBoard({ run, onUseDeck, onOpenLive }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [focus, setFocus] = useState("");
  const ranked = useMemo(() => rankDecks(selected, run), [selected, run]);
  const officialVersion = metaData.patch.officialGameVersion ?? metaData.patch.targetGameVersion;

  function toggleMagic(id: string) {
    setFocus(id);
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  function importRun() {
    const ids = data.magics
      .filter((magic) => (run.levels[magic.id] ?? 0) > 0)
      .map((magic) => magic.id);
    setSelected(ids);
    setFocus(ids.at(-1) ?? "");
  }

  return (
    <main className="deck-board">
      <section className="deck-board-hero">
        <div>
          <span className="eyebrow">DECK BOARD · 빠른 탐색</span>
          <h1>중요한 선택만 눌러서 갈 수 있는 덱을 좁혀보세요.</h1>
          <p>
            레벨을 일일이 기록하지 않아도 됩니다. 마법 하나를 누르면 같이 쓰이는 마법은 더
            선명해지고, 아래 덱은 현재 선택과의 연결 정도에 따라 자동 정렬됩니다.
          </p>
        </div>
        <div className="deck-board-actions">
          <button onClick={importRun}>현재 Run에서 가져오기</button>
          <button
            onClick={() => {
              setSelected([]);
              setFocus("");
            }}
          >
            <RotateCcw size={15} /> 초기화
          </button>
          <button className="primary" onClick={onOpenLive}>
            Live 기록으로
          </button>
        </div>
      </section>

      <section className="deck-picker" aria-label="덱 탐색용 마법 선택">
        <div className="deck-picker-head">
          <div>
            <h2>지금 눈에 들어온 마법</h2>
            <p>
              {focus
                ? `${magicById[focus]?.nameKo} 기준으로 같은 조합·같은 덱에서 자주 연결되는 마법을 강조 중`
                : "게임에서 중요해 보이는 선택지만 몇 개 눌러도 됩니다."}
            </p>
          </div>
          <span>{selected.length}개 선택</span>
        </div>

        {!!selected.length && (
          <div className="deck-selected-line">
            {selected.map((id) => (
              <button key={id} onClick={() => toggleMagic(id)}>
                <Check size={13} /> {magicById[id]?.nameKo}
              </button>
            ))}
          </div>
        )}

        <div className="deck-magic-grid">
          {data.magics.map((magic) => {
            const heat = focus ? magicDeckHeat(focus, magic.id) : 0;
            const chosen = selected.includes(magic.id);
            const style = {
              "--relation-heat": focus ? Math.max(0.08, heat) : 0.34,
            } as React.CSSProperties;
            return (
              <button
                key={magic.id}
                className={`deck-magic ${chosen ? "is-chosen" : ""} ${focus === magic.id ? "is-focus" : ""}`}
                style={style}
                aria-pressed={chosen}
                onClick={() => toggleMagic(magic.id)}
                title={
                  focus && focus !== magic.id
                    ? heat >= 0.75
                      ? `${magic.nameKo} · 직접 조합 또는 같은 덱에서 강하게 연결`
                      : heat >= 0.3
                        ? `${magic.nameKo} · 일부 덱에서 연결`
                        : `${magic.nameKo} · 현재 선택과 연결 적음`
                    : magic.summary
                }
              >
                <strong>{magic.nameKo}</strong>
                <small>
                  {focus
                    ? focus === magic.id
                      ? "기준"
                      : heat >= 0.75
                        ? "강한 연결"
                        : heat >= 0.3
                          ? "연결"
                          : "관련 적음"
                    : magic.category === "support"
                      ? "지원"
                      : "공격"}
                </small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="deck-results" aria-label="추천 덱 목록">
        <div className="deck-results-head">
          <div>
            <h2>덱 / 전략 보드</h2>
            <p>
              현재 공식 버전은 v{officialVersion}. 카드의 커뮤니티 메타는 각 카드에 표시된
              스냅샷 버전을 기준으로 하며, 최신 패치 미검증 내용은 확정 티어처럼 표시하지 않습니다.
            </p>
          </div>
          <span>{ranked.length}개</span>
        </div>
        <div className="deck-card-grid">
          {ranked.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              selectedCount={selected.length}
              onUse={() => onUseDeck(deckTargetIds(deck), deck.id)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
