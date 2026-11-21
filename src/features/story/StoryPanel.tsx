import { useEffect, useRef } from 'react';
import { tr } from '@/lib/i18n';
import { localize } from '@/lib/locale';
import type { Story } from '@/lib/schemas/stories';
import { SourceNotes } from './SourceNotes';

interface StoryPanelProps {
  story: Story;
  /** 0-based step shown. */
  step: number;
  onStep: (step: number) => void;
  onClose: () => void;
  /** Move focus to the step heading when the panel opens (later step changes always do). */
  focusOnOpen?: boolean;
}

/**
 * The guided tour: one short sourced step at a time, with Back and Next. Not a modal: the timeline
 * stays usable, and each step moves it. Focus moves to the step's heading when the step changes, so
 * screen readers read the new step.
 */
export function StoryPanel({ story, step, onStep, onClose, focusOnOpen = true }: StoryPanelProps) {
  const current = story.steps[step];
  const headingRef = useRef<HTMLHeadingElement>(null);
  const total = story.steps.length;

  const firstStep = useRef(true);
  useEffect(() => {
    const opening = firstStep.current;
    firstStep.current = false;
    if (opening && !focusOnOpen) return;
    headingRef.current?.focus();
    // Only when the step changes; focusOnOpen matters on the first run alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (!current) return null;
  const sources = story.sources.filter((s) => current.sourceIds.includes(s.id));

  return (
    <section className="sc-story" aria-labelledby="story-step-title" data-testid="story-panel">
      <p className="sc-story-progress">{tr('tour.progress', { step: step + 1, total })}</p>
      <h2 id="story-step-title" ref={headingRef} tabIndex={-1} className="sc-story-title">
        {localize(current.title)}
      </h2>
      <p className="sc-story-text">{localize(current.text)}</p>
      <SourceNotes sources={sources} />
      <div className="sc-story-actions">
        <button
          type="button"
          className="sc-button"
          disabled={step === 0}
          onClick={() => {
            onStep(step - 1);
          }}
        >
          {tr('tour.back')}
        </button>
        {step < total - 1 ? (
          <button
            type="button"
            className="sc-button sc-button--primary"
            onClick={() => {
              onStep(step + 1);
            }}
          >
            {tr('tour.next')}
          </button>
        ) : (
          <button type="button" className="sc-button sc-button--primary" onClick={onClose}>
            {tr('tour.finish')}
          </button>
        )}
        <button type="button" className="sc-button" onClick={onClose}>
          {tr('tour.close')}
        </button>
      </div>
    </section>
  );
}
