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
  rank,
  selectedCount,
  onUse,
}: {
  deck: DeckCompatibility;
  rank: number;
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
        <div className="deck-rank" aria-label={`현재 적합도 ${rank}위`}>
          {rank}
        </div>
        <div className="deck-title-block">
          <span className="deck-fit">{deck.label}</span>
          <h2>{deck.nameKo}</h2>
        </div>
        <small>{confidenceLabel[deck.confidence] ?? deck.confidence}</small>
      </div>

      <div className="deck-match-line">
        {selectedCount ? (
          <>
            <strong>{deck.directMatches.length}</strong>
            <span> 직접 일치</span>
            {deck.adjacentMatches.length > 0 && (
              <span> · {deck.adjacentMatches.length} 조합 연결</span>
            )}
          </>
        ) : (
          <span>마법을 선택하면 현재 상황에 맞춰 순위가 자동으로 바뀝니다.</span>
        )}
      </div>

      {!!coreNames.length && (
        <div className="deck-row">
          <b>CORE COMBOS</b>
          <div className="deck-tags">
            {coreNames.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
        </div>
      )}

      {!!supportNames.length && (
        <div className="deck-row">
          <b>SUPPORT</b>
          <div className="deck-tags subtle">
            {supportNames.slice(0, 5).map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
        </div>
      )}

      <p>{deck.notesKo}</p>

      <div className="deck-card-foot">
        <div className="deck-source-meta">
          <span>PATCH {deck.patch}</span>
          <span>SOURCES {deck.sourceCount}</span>
        </div>
        <button
          className="primary"
          disabled={!targetIds.length || deck.blocked}
          onClick={onUse}
        >
          {deck.blocked
            ? "현재 Run과 충돌"
            : targetIds.length
              ? "이 덱으로 플레이"
              : "전략 참고용"}
        </button>
      </div>
    </article>
  );
}

export function DeckBoard({ run, onUseDeck, onOpenLive }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [focus, setFocus] = useState("");
  const ranked = useMemo(() => rankDecks(selected, run), [selected, run]);
  const officialVersion =
    metaData.patch.officialGameVersion ?? metaData.patch.targetGameVersion;
  const liveOwned = data.magics.filter((magic) => (run.levels[magic.id] ?? 0) > 0).length;

  function toggleMagic(id: string) {
    setFocus(id);
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
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
        <div className="deck-hero-copy">
          <span className="eyebrow">MAGIC SURVIVAL · BUILD ANALYTICS</span>
          <h1>전체 덱을 먼저 보고, 지금 뜬 마법으로 바로 좁혀보세요.</h1>
          <p>
            중급자용 빠른 탐색 화면입니다. 레벨을 하나씩 기록하지 않아도 현재 선택 몇 개만으로
            연결되는 덱과 핵심 조합을 비교할 수 있습니다.
          </p>
        </div>
        <div className="deck-board-actions">
          <button onClick={importRun} disabled={!liveOwned}>
            현재 Run {liveOwned ? `${liveOwned}개` : "없음"} 가져오기
          </button>
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

      <section className="deck-board-summary" aria-label="덱 보드 상태 요약">
        <div>
          <span>OFFICIAL PATCH</span>
          <strong>v{officialVersion}</strong>
          <small>현재 게임 버전</small>
        </div>
        <div>
          <span>META DECKS</span>
          <strong>{ranked.length}</strong>
          <small>비교 가능한 전략</small>
        </div>
        <div>
          <span>SCOUT PICKS</span>
          <strong>{selected.length}</strong>
          <small>빠르게 체크한 마법</small>
        </div>
        <div>
          <span>LIVE OWNED</span>
          <strong>{liveOwned}</strong>
          <small>현재 Run 보유 마법</small>
        </div>
      </section>

      <section className="deck-picker" aria-label="덱 탐색용 마법 선택">
        <div className="deck-section-label">QUICK SCOUT</div>
        <div className="deck-picker-head">
          <div>
            <h2>게임에서 눈에 들어온 마법만 체크</h2>
            <p>
              {focus
                ? `${magicById[focus]?.nameKo} 기준으로 같은 조합·같은 덱에서 자주 연결되는 마법을 강조하고 있습니다.`
                : "모든 레벨을 기록할 필요 없습니다. 핵심 선택 1~3개만 눌러도 덱 후보가 자동 정렬됩니다."}
            </p>
          </div>
          <span>{selected.length} PICKED</span>
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
        <div className="deck-section-label">META DECKS</div>
        <div className="deck-results-head">
          <div>
            <h2>현재 선택 기준 덱 적합도</h2>
            <p>
              카드 순서는 지금 체크한 마법과의 연결도로 바뀝니다. 커뮤니티 메타는 각 카드의
              스냅샷 버전과 근거 수를 함께 표시하며, 미검증 최신 패치는 확정 티어처럼 취급하지 않습니다.
            </p>
          </div>
          <span>{ranked.length} RESULTS</span>
        </div>
        <div className="deck-card-grid">
          {ranked.map((deck, index) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              rank={index + 1}
              selectedCount={selected.length}
              onUse={() => onUseDeck(deckTargetIds(deck), deck.id)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
