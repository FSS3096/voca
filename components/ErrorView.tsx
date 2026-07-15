'use client';

import React from 'react';

export type ErrorType =
  | 'no_activity'
  | 'ai_failure'
  | 'network'
  | 'auth_expired'
  | 'repo_not_found'
  | 'server_error'
  | 'timeout';

interface ErrorViewProps {
  errorType: ErrorType;
  message?: string;        // Override the default message for this error type
  onRetry?: () => void;    // If undefined, no retry button shown
  onBack?: () => void;     // "Go back" link — shown on all errors
}

const ERROR_METADATA: Record<
  ErrorType,
  { title: string; defaultMessage: string; isRetryable: boolean }
> = {
  no_activity: {
    title: 'No Recent Activity',
    defaultMessage:
      "Looks like there's nothing new in this repo in the last 7 days. Try committing and pushing some work, then generate again.",
    isRetryable: true,
  },
  ai_failure: {
    title: 'AI Generation Failed',
    defaultMessage:
      'Our AI writer hit a snag. This sometimes happens with Claude. Try again in a moment.',
    isRetryable: true,
  },
  network: {
    title: 'Network Connection Issue',
    defaultMessage: "Can't reach Voca's servers. Check your internet connection and try again.",
    isRetryable: true,
  },
  auth_expired: {
    title: 'Session Expired',
    defaultMessage: 'Your session expired. Sign in again to continue.',
    isRetryable: false,
  },
  repo_not_found: {
    title: 'Repository Access Denied',
    defaultMessage: "Can't access this repo. Make sure it's a repo you have push access to.",
    isRetryable: false,
  },
  server_error: {
    title: 'Server Error',
    defaultMessage:
      'Something on our end broke. Try again — if it keeps failing, the team has been notified.',
    isRetryable: true,
  },
  timeout: {
    title: 'Request Timed Out',
    defaultMessage:
      'This took too long. Try again — it usually finishes faster on the second attempt.',
    isRetryable: true,
  },
};

export function ErrorView({ errorType, message, onRetry, onBack }: ErrorViewProps) {
  const metadata = ERROR_METADATA[errorType] || {
    title: 'An Error Occurred',
    defaultMessage: 'Something went wrong. Please try again.',
    isRetryable: true,
  };

  const displayMessage = message || metadata.defaultMessage;
  const showRetry = metadata.isRetryable && !!onRetry;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 max-w-sm mx-auto text-center px-4">
      {/* Warning/Error Icon (SVG Warning Triangle) */}
      <svg
        className="w-12 h-12 text-red-500 animate-pulse"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>

      {/* Error Title */}
      <h2 className="text-lg font-medium text-gray-800">{metadata.title}</h2>

      {/* Error Message */}
      <p className="text-sm text-gray-500 leading-relaxed">{displayMessage}</p>

      {/* Actions */}
      <div className="flex flex-col items-center gap-3 mt-2 w-full">
        {/* Try Again Button for Retryable Errors */}
        {showRetry && (
          <button
            onClick={onRetry}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 px-4 font-medium hover:bg-blue-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Try Again
          </button>
        )}

        {/* Special Sign In link for Auth Expired */}
        {errorType === 'auth_expired' && (
          <a
            href="/"
            className="w-full bg-blue-600 text-white text-center rounded-lg py-2.5 px-4 font-medium hover:bg-blue-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Sign In Again
          </a>
        )}

        {/* Special Repo Selector link for Repo Not Found */}
        {errorType === 'repo_not_found' && (
          <button
            onClick={onBack}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 px-4 font-medium hover:bg-blue-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Choose Different Repository
          </button>
        )}

        {/* Go back Link (Always shown if onBack is provided) */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-blue-600 hover:text-blue-800 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 mt-1"
          >
            Go back
          </button>
        )}
      </div>
    </div>
  );
}
