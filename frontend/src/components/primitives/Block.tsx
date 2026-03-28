'use client'

import type { BlockPayload } from '@/lib/agui'
import styles from './Block.module.scss'

type Props = { block: BlockPayload }

export function Block({ block }: Props) {
  switch (block.type) {
    case 'header': {
      const Tag = (`h${block.level ?? 2}`) as 'h1' | 'h2' | 'h3'
      return <Tag className={styles.header}>{block.text}</Tag>
    }
    case 'paragraph':
      return <p className={styles.paragraph}>{block.text}</p>
    case 'image':
      return (
        <figure className={styles.figure}>
          <img className={styles.image} src={block.src} alt={block.caption ?? ''} />
          {block.caption && <figcaption className={styles.caption}>{block.caption}</figcaption>}
        </figure>
      )
    case 'button':
      return (
        <a className={styles.button} href={block.href} target="_blank" rel="noopener noreferrer">
          {block.label} ↗
        </a>
      )
    case 'badge_row':
      return (
        <div className={styles.badgeRow}>
          {block.badges.map(b => (
            <span key={b} className={styles.badge}>{b}</span>
          ))}
        </div>
      )
  }
}
