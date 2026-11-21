import { useEffect, useRef } from 'react';
import type { Story } from '@/lib/schemas/stories';
import { SourceNotes } from './SourceNotes';

interface StoryPanelProps {
  story: Story;
  /** 0-based step shown. */
  step: number;
  onStep: (step: number) => void;
  onClose: () => void;
}

/**
 * The guided tour: one short sourced step at a time, with Back and Next. Not a modal: the timeline
 * stays usable, and each step moves it. Focus moves to the step's heading when the step changes, so
 * screen readers read the new step.
 */
export function StoryPanel({ story, step, onStep, onClose }: StoryPanelProps) {
  const current = story.steps[step];
  const headingRef = useRef<HTMLHeadingElement>(null);
  const total = story.steps.length;

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  if (!current) return null;
  const sources = story.sources.filter((s) => current.sourceIds.includes(s.id));

  return (
    <section className="sc-story" aria-labelledby="story-step-title" data-testid="story-panel">
      <p className="sc-story-progress">
        Tour: step {step + 1} of {total}
      </p>
      <h2 id="story-step-title" ref={headingRef} tabIndex={-1} className="sc-story-title">
        {current.title.en}
      </h2>
      <p className="sc-story-text">{current.text.en}</p>
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
          Back
        </button>
        {step < total - 1 ? (
          <button
            type="button"
            className="sc-button sc-button--primary"
            onClick={() => {
              onStep(step + 1);
            }}
          >
            Next
          </button>
        ) : (
          <button type="button" className="sc-button sc-button--primary" onClick={onClose}>
            Finish
          </button>
        )}
        <button type="button" className="sc-button" onClick={onClose}>
          Close tour
        </button>
      </div>
    </section>
  );
}
