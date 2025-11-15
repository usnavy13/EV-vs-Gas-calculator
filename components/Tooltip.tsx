'use client';

import { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
}

export default function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;

      // Position tooltip above if not enough space below, otherwise below
      if (spaceBelow < tooltipRect.height && spaceAbove > spaceBelow) {
        setPosition('top');
      } else {
        setPosition('bottom');
      }
    }
  }, [isVisible]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsVisible(!isVisible);
    } else if (e.key === 'Escape') {
      setIsVisible(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-[11px] font-semibold text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        onKeyDown={handleKeyDown}
        aria-label="More information"
        aria-expanded={isVisible}
        tabIndex={0}
      >
        i
      </button>

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 w-64 rounded-2xl border border-slate-900/10 bg-slate-900/95 p-3 text-sm text-white shadow-xl shadow-slate-900/20 ${
            position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          } left-1/2 transform -translate-x-1/2`}
          role="tooltip"
        >
          <div className="whitespace-pre-line">{content}</div>
          {/* Arrow */}
          <div
            className={`absolute left-1/2 transform -translate-x-1/2 w-0 h-0 border-4 border-transparent ${
              position === 'top'
                ? 'top-full border-t-slate-900/90'
                : 'bottom-full border-b-slate-900/90'
            }`}
          />
        </div>
      )}
      {children}
    </div>
  );
}

