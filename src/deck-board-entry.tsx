import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { DeckBoard } from "./deck-board/DeckBoard";
import { normalizeMetaContext } from "./meta/data";
import {
  deserialize,
  fresh,
  serialize,
  STORAGE_KEY,
  type Saved,
} from "./storage";
import "./style.css";
import "./meta/style.css";

function readSaved(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? deserialize(raw) : fresh();
  } catch {
    return fresh();
  }
}

function DeckBoardApp() {
  const [saved] = useState(readSaved);
  const run = useMemo(() => ({ ...saved.run }), [saved.run]);

  function useDeck(ids: string[], archetypeId: string) {
    const meta = normalizeMetaContext(run.meta);
    const next: Saved = {
      ...saved,
      run: {
        ...run,
        pinned: ids,
        meta: { ...meta, archetype: archetypeId },
      },
      history: [...saved.history, saved.run].slice(-30),
    };
    localStorage.setItem(STORAGE_KEY, serialize(next));
    location.href = "/";
  }

  return (
    <>
      <header className="game-header">
        <a className="brand" href="/">
          MS <span>Companion</span>
        </a>
        <div className="header-actions">
          <a className="deck-board-back" href="/">
            Live 기록
          </a>
        </div>
      </header>
      <nav className="workspace-tabs" aria-label="사용 모드">
        <a className="active" href="/deck-board.html">
          덱 보드
        </a>
        <a href="/">Live 기록</a>
      </nav>
      <DeckBoard
        run={run}
        onUseDeck={useDeck}
        onOpenLive={() => {
          location.href = "/";
        }}
      />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DeckBoardApp />
  </React.StrictMode>,
);
