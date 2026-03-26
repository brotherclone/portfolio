'use client'

import type { RenderPathSummaryEvent } from '@/lib/agui'
import styles from './PathSummary.module.css'

type Props = RenderPathSummaryEvent['payload']

const TYPE_COLOR: Record<string, string> = {
  Concept: 'var(--color-warm)',
  Project: 'var(--color-cool)',
  Organization: 'var(--color-neutral)',
  Artifact: 'var(--color-gold)',
  Skill: 'var(--color-muted)',
  Era: 'var(--color-neutral)',
}

export function PathSummary({ nodes }: Props) {
  if (nodes.length === 0) return null
  return (
    <div className={styles.path}>
      {nodes.map((node, i) => (
        <span key={node.uri} className={styles.segment}>
          <span
            className={styles.chip}
            style={{ borderColor: node.type ? (TYPE_COLOR[node.type] ?? 'var(--color-border)') : 'var(--color-border)' }}
          >
            {node.label}
          </span>
          {i < nodes.length - 1 && <span className={styles.arrow}>→</span>}
        </span>
      ))}
    </div>
  )
}
