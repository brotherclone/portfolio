'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { GraphNode } from '@/lib/graphTransform'
import styles from './DetailPanel.module.scss'

interface Props {
  node: GraphNode | null
  onClose: () => void
}

/**
 * Returns the content fields that should be displayed for a given node.
 * Exported for unit testing without DOM rendering.
 */
export function getDisplayContent(node: GraphNode) {
  return {
    label: node.label,
    summary: node.summary,
    // detail is already stripped from confidential nodes at build time;
    // this check is an explicit safety belt
    detail: node.confidential ? undefined : node.detail,
    url: node.url,
    mediaType: node.mediaType,
  }
}

export function DetailPanel({ node, onClose }: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!node) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [node, onClose])

  if (!node || !mounted) return null

  const { label, summary, detail, url, mediaType } = getDisplayContent(node)

  return createPortal(
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={styles.panel}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <button className={styles.close} onClick={onClose} aria-label="Close panel">
          ×
        </button>
        <p className={styles.type}>{node.type}</p>
        <h2 className={styles.label}>{label}</h2>
        <p className={styles.summary}>{summary}</p>
        {detail && <p className={styles.detail}>{detail}</p>}
        {mediaType === 'audio' && url && (
          <audio className={styles.audio} controls src={url} aria-label={`Listen to ${label}`}>
            Your browser does not support the audio element.
          </audio>
        )}
        {mediaType !== 'audio' && url && (
          <a className={styles.link} href={url} target="_blank" rel="noopener noreferrer">
            View artifact ↗
          </a>
        )}
      </div>
    </div>,
    document.body
  )
}
