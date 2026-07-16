"use client"

import React, { useEffect, useRef, useState } from 'react'

type DraftCardProps = {
  title?: string
  initialContent: string
  onContentChange?: (content: string) => void
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <rect height="14" rx="2" ry="2" width="14" x="8" y="8" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export default function DraftCard({ title = 'Draft', initialContent, onContentChange }: DraftCardProps) {
  const [content, setContent] = useState(initialContent)
  const [copied, setCopied] = useState(false)
  const resetCopiedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (resetCopiedTimeout.current) {
        clearTimeout(resetCopiedTimeout.current)
      }
    }
  }, [])

  function showCopiedConfirmation() {
    setCopied(true)

    if (resetCopiedTimeout.current) {
      clearTimeout(resetCopiedTimeout.current)
    }

    resetCopiedTimeout.current = setTimeout(() => {
      setCopied(false)
      resetCopiedTimeout.current = null
    }, 2000)
  }

  async function copyWithFallback(text: string) {
    const el = document.createElement('textarea')
    el.value = text
    el.setAttribute('readonly', '')
    el.style.position = 'fixed'
    el.style.top = '0'
    el.style.left = '-9999px'
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }

  async function handleCopy() {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API unavailable')
      }

      await navigator.clipboard.writeText(content)
    } catch {
      await copyWithFallback(content)
    }

    showCopiedConfirmation()
  }

  function handleContentChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const nextContent = event.target.value
    setContent(nextContent)
    onContentChange?.(nextContent)
  }

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <button
          aria-live="polite"
          className="inline-flex min-w-[5.75rem] items-center justify-end gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          onClick={handleCopy}
          type="button"
        >
          {copied ? (
            <>
              <CheckIcon className="h-4 w-4 text-green-600" />
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <ClipboardIcon className="h-4 w-4" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <textarea
        className="mt-4 min-h-40 w-full resize-y rounded-md border border-gray-200 bg-gray-50 p-3 text-sm leading-6 text-gray-800 outline-none transition focus:border-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-100"
        onChange={handleContentChange}
        value={content}
      />
    </article>
  )
}
