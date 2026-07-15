'use client';

import React, { useState, useEffect } from 'react';

// ─── Step definitions ──────────────────────────────────────────────────────────

/**
 * Each step has a human-readable message and an auto-advance duration in ms.
 * `Infinity` on the last step means it will never auto-advance — it stays visible
 * until the request resolves (success or error).
 *
 * Timing contract (from VOC-132):
 *   0–3s   → step 0
 *   3–6s   → step 1
 *   6–10s  → step 2
 *   10–20s → step 3
 *   20s+   → step 4  (appears only after 20 total seconds; never auto-advances)
 */
const STEPS = [
  { message: 'Reading your latest commits...', duration: 3000 },
  { message: 'Finding the most meaningful changes...', duration: 3000 },
  { message: 'Writing 3 post variations for you...', duration: 4000 },
  { message: 'Almost there — polishing the drafts...', duration: 10000 },
  {
    message: 'Taking a bit longer than usual — still working...',
    duration: Infinity,
  },
] as const;

/**
 * Number of steps shown in the dot progress indicator.
 * We show only the first 4 planned steps — step 5 is an overflow/timeout state,
 * not a scheduled phase, so including it in the indicator would be misleading.
 */
const INDICATOR_STEP_COUNT = STEPS.length - 1; // 4

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * VOC-132 — LoadingView.
 *
 * Shown during the 8–20 second window while POST /api/generate is in flight.
 * Cycles through contextual step messages so the user understands meaningful work
 * is happening instead of experiencing an opaque blank screen.
 *
 * Behaviour:
 *   - Steps 0–3 auto-advance after their configured duration.
 *   - Step 4 ("Taking a bit longer...") appears only after 20 cumulative seconds
 *     and never auto-advances — it persists until the parent replaces this view
 *     with either success (drafts page) or an ErrorView.
 *   - No cancel button: generation is not cancellable once started.
 *   - Zero layout shift: the text container has a fixed min-height sized to the
 *     longest message, so the spinner never jumps when text changes.
 *   - Memory-safe: all timers are cleared in useEffect cleanup so unmounting
 *     mid-flight (e.g. unexpected navigation) causes no leaks.
 */
export function LoadingView() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const step = STEPS[stepIndex];

    // Step 4 has Infinity duration — bail immediately; no timer to set.
    if (step.duration === Infinity) return;

    const timer = setTimeout(() => {
      // Cap at STEPS.length - 1 as a safety net against any stale closure firing
      // after the component has been unmounted and remounted.
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }, step.duration);

    // Cleanup: cancel the pending timer if the component unmounts or stepIndex
    // changes before the timer fires (e.g. error dismisses this view).
    return () => clearTimeout(timer);
  }, [stepIndex]);

  const currentStep = STEPS[stepIndex];
  const isOverflowStep = stepIndex === STEPS.length - 1;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Generating your post"
      className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4"
    >
      {/* ── Spinner ──────────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"
      />

      {/* ── Step message ─────────────────────────────────────────────────────── */}
      {/*
        min-h reserves space equal to two lines of text at the font size used (text-lg).
        This prevents layout shift when the step message changes length — the spinner
        and dots remain pinned in place regardless of how long the current message is.
        At text-lg (18px) + leading-7, 2 lines ≈ 56px. We use min-h-[3.5rem] (56px).
      */}
      <p
        className="text-lg font-medium text-gray-800 text-center max-w-sm min-h-[3.5rem]
          leading-7 flex items-center justify-center"
      >
        {currentStep.message}
      </p>

      {/* ── Step indicator dots ───────────────────────────────────────────────── */}
      {/*
        Shows the 4 planned steps (0–3). When in the overflow step (4), all 4 dots
        remain filled to signal "we've completed all phases, just waiting on the API".
        This is a deliberate UX choice: an empty dot indicator in the overflow state
        would look like a regression.
      */}
      <div className="flex gap-2" aria-hidden="true">
        {Array.from({ length: INDICATOR_STEP_COUNT }).map((_, i) => {
          const isActive = isOverflowStep ? true : i === stepIndex;
          const isPast = !isOverflowStep && i < stepIndex;

          return (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                isActive || isPast ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          );
        })}
      </div>

      {/* ── Overflow state sub-label ─────────────────────────────────────────── */}
      {/*
        Only visible during the overflow step (20s+). Gives extra reassurance without
        looking broken — the user understands something is taking longer, not that
        the app has crashed.
      */}
      {isOverflowStep && (
        <p className="text-sm text-gray-400 text-center max-w-xs">
          Complex repositories with lots of activity can take up to 30 seconds.
        </p>
      )}
    </div>
  );
}
