import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export const Modal = ({
  open,
  title,
  description,
  children,
  primaryAction,
  secondaryAction,
  onClose,
  busy = false,
}) => {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  if (!open) return null

  const secondaryClassName = secondaryAction?.variant
    ? `button ${secondaryAction.variant}`
    : 'button ghost'
  const primaryClassName = primaryAction?.variant ? `button ${primaryAction.variant}` : 'button primary'

  const modalNode = (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Диалог'}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div className="modal">
        <div className="modal-head">
          <div className="modal-titles">
            {title ? <h3 className="modal-title">{title}</h3> : null}
            {description ? <p className="modal-description">{description}</p> : null}
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={busy}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">{children}</div>

        {primaryAction || secondaryAction ? (
          <div className="modal-actions">
            {secondaryAction ? (
              <button
                type="button"
                className={secondaryClassName}
                onClick={secondaryAction.onClick}
                disabled={busy || secondaryAction.disabled}
              >
                {secondaryAction.label}
              </button>
            ) : null}

            {primaryAction ? (
              <button
                type="button"
                className={primaryClassName}
                onClick={primaryAction.onClick}
                disabled={busy || primaryAction.disabled}
              >
                {primaryAction.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )

  if (typeof document === 'undefined') return modalNode
  return createPortal(modalNode, document.body)
}
