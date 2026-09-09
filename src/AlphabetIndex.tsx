// src/AlphabetIndex.tsx
//
// iOS-style section index bar (what Contacts calls sectionIndexTitles):
// a thin A–Z rail pinned to the right edge that you tap or drag your thumb
// down to jump between letters. Mobile only — desktop has room to scroll.

import { useRef, useState } from "react";

type Props = {
  /** Letters to show, in order. Only letters that actually have birds. */
  letters: string[];
  /** Letter currently nearest the top of the viewport, for the "you are here" dot. */
  activeLetter: string | null;
  onSelect: (letter: string, instant: boolean) => void;
};

function buzz() {
  // Android only — iOS Safari has no vibrate, so this is a silent no-op there.
  if (typeof navigator.vibrate === "function") navigator.vibrate(6);
}

export default function AlphabetIndex({ letters, activeLetter, onSelect }: Props) {
  const railRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const lastLetterRef = useRef<string | null>(null);

  const [dragLetter, setDragLetter] = useState<string | null>(null);
  const [bubbleY, setBubbleY] = useState(0);

  if (!letters.length) return null;

  // Map a Y coordinate to a letter by position along the rail, rather than
  // hit-testing each letter — keeps the drag smooth across the gaps.
  const letterAt = (clientY: number) => {
    const rail = railRef.current;
    if (!rail) return null;
    const r = rail.getBoundingClientRect();
    const pct = (clientY - r.top) / r.height;
    const idx = Math.min(letters.length - 1, Math.max(0, Math.floor(pct * letters.length)));
    return letters[idx];
  };

  const track = (clientY: number) => {
    const letter = letterAt(clientY);
    if (!letter) return;

    setBubbleY(Math.min(window.innerHeight - 48, Math.max(48, clientY)));
    setDragLetter(letter);

    if (letter !== lastLetterRef.current) {
      lastLetterRef.current = letter;
      onSelect(letter, true);
      buzz();
    }
  };

  const endDrag = () => {
    draggingRef.current = false;
    lastLetterRef.current = null;
    setDragLetter(null);
  };

  return (
    <>
      {/* Big letter preview that follows the thumb */}
      <div
        className="alpha-bubble"
        style={{ top: bubbleY, opacity: dragLetter ? 1 : 0 }}
        aria-hidden="true"
      >
        {dragLetter ?? ""}
      </div>

      <div
        ref={railRef}
        className="alpha-rail"
        aria-label="Jump to letter"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          draggingRef.current = true;
          lastLetterRef.current = null;
          track(e.clientY);
        }}
        onPointerMove={(e) => {
          if (draggingRef.current) track(e.clientY);
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {letters.map((letter) => (
          <button
            key={letter}
            type="button"
            className={`alpha-letter ${
              dragLetter === letter || (!dragLetter && activeLetter === letter)
                ? "alpha-letter-active"
                : ""
            }`}
            onClick={() => onSelect(letter, false)}
            aria-label={`Jump to birds starting with ${letter}`}
          >
            {letter}
          </button>
        ))}
      </div>
    </>
  );
}
