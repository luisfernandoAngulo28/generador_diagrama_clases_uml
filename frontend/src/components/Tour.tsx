import { useEffect, useLayoutEffect, useState } from 'react';

export interface TourStep {
  target: string; // CSS selector
  title: string;
  body: string;
}

interface TourProps {
  steps: TourStep[];
  onFinish: () => void;
}

const MARGIN = 10;
const TOOLTIP_WIDTH = 320;
const TOOLTIP_HEIGHT_ESTIMATE = 190;

function placeTooltip(rect: DOMRect | null): { top: number; left: number } {
  if (!rect) return { top: 100, left: 100 };

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const spaceBelow = vh - rect.bottom;
  const spaceAbove = rect.top;
  const spaceRight = vw - rect.right;

  // Prefer stacking above/below when the target isn't nearly full-height.
  if (spaceBelow >= TOOLTIP_HEIGHT_ESTIMATE + MARGIN) {
    return {
      top: rect.bottom + MARGIN,
      left: clamp(rect.left, MARGIN, vw - TOOLTIP_WIDTH - MARGIN),
    };
  }
  if (spaceAbove >= TOOLTIP_HEIGHT_ESTIMATE + MARGIN) {
    return {
      top: rect.top - TOOLTIP_HEIGHT_ESTIMATE - MARGIN,
      left: clamp(rect.left, MARGIN, vw - TOOLTIP_WIDTH - MARGIN),
    };
  }
  // Neither fits (e.g. a full-height side panel) — place beside it instead.
  if (spaceRight >= TOOLTIP_WIDTH + MARGIN) {
    return {
      top: clamp(rect.top, MARGIN, vh - TOOLTIP_HEIGHT_ESTIMATE - MARGIN),
      left: rect.right + MARGIN,
    };
  }
  return {
    top: clamp(rect.top, MARGIN, vh - TOOLTIP_HEIGHT_ESTIMATE - MARGIN),
    left: clamp(rect.left - TOOLTIP_WIDTH - MARGIN, MARGIN, vw - TOOLTIP_WIDTH - MARGIN),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function Tour({ steps, onFinish }: TourProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const step = steps[index];

  useLayoutEffect(() => {
    function measure() {
      const el = document.querySelector(step.target);
      setRect(el ? el.getBoundingClientRect() : null);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [step.target]);

  useEffect(() => {
    if (rect) {
      document
        .querySelector(step.target)
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [rect, step.target]);

  function next() {
    if (index < steps.length - 1) setIndex(index + 1);
    else onFinish();
  }

  function prev() {
    if (index > 0) setIndex(index - 1);
  }

  const spotlightStyle = rect
    ? {
        top: rect.top - MARGIN,
        left: rect.left - MARGIN,
        width: rect.width + MARGIN * 2,
        height: rect.height + MARGIN * 2,
      }
    : undefined;

  const { top: tooltipTop, left: tooltipLeft } = placeTooltip(rect);

  return (
    <div className="tour">
      <div className="tour__backdrop" onClick={onFinish} />
      {spotlightStyle && <div className="tour__spotlight" style={spotlightStyle} />}
      <div
        className="tour__tooltip"
        style={{ top: tooltipTop, left: tooltipLeft, width: TOOLTIP_WIDTH }}
      >
        <div className="tour__step-count">
          Paso {index + 1} de {steps.length}
        </div>
        <h4 className="tour__title">{step.title}</h4>
        <p className="tour__body">{step.body}</p>
        <div className="tour__actions">
          <button className="tour__skip" onClick={onFinish}>
            Omitir recorrido
          </button>
          <div className="tour__nav">
            {index > 0 && (
              <button className="tour__prev" onClick={prev}>
                Atrás
              </button>
            )}
            <button className="tour__next" onClick={next}>
              {index === steps.length - 1 ? 'Entendido' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
