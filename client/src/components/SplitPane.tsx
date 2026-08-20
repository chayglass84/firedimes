import { useRef, useState, type PointerEvent, type ReactNode } from "react";

interface Props {
  left: ReactNode;
  right: ReactNode;
  defaultLeftPercent?: number;
}

const MIN_PERCENT = 20;
const MAX_PERCENT = 80;

export function SplitPane({ left, right, defaultLeftPercent = 66.7 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftPercent, setLeftPercent] = useState(defaultLeftPercent);
  const draggingRef = useRef(false);

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setLeftPercent(Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, pct)));
  }

  function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  return (
    <div className="split-pane" ref={containerRef}>
      <div className="split-pane-side" style={{ width: `calc(${leftPercent}% - 5px)` }}>
        {left}
      </div>
      <div
        className="split-pane-divider"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <div className="split-pane-side" style={{ width: `calc(${100 - leftPercent}% - 5px)` }}>
        {right}
      </div>
    </div>
  );
}
