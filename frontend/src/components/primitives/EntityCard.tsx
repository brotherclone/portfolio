'use client'

import type { RenderEntityCardEvent } from '@/lib/agui'
import styles from './EntityCard.module.css'

type Props = RenderEntityCardEvent['payload']

export function EntityCard({ label, type, summary, detail, url, mediaType }: Props) {
  return (
    <div className={styles.card}>
      <p className={styles.type}>{type}</p>
      <h3 className={styles.label}>{label}</h3>
      <p className={styles.summary}>{summary}</p>
      {detail && (
        <p className={styles.detail}>{detail}</p>
      )}
      {mediaType === 'audio' && url && (
        <audio className={styles.audio} controls src={url} aria-label={`Listen to ${label}`}>
          Your browser does not support the audio element.
        </audio>
      )}
      {mediaType !== 'audio' && url && (
        <a className={styles.link} href={url} target="_blank" rel="noopener noreferrer">
          View ↗
        </a>
      )}
    </div>
  )
}
