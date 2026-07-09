import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

type OverlayBackdropProps = {
  children: ReactNode
  className: string
  onClose: () => void
  dismissOnBackdrop?: boolean
  dismissOnEscape?: boolean
}

export function OverlayBackdrop({
  children,
  className,
  onClose,
  dismissOnBackdrop = true,
  dismissOnEscape = true,
}: OverlayBackdropProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const focusable = backdropRef.current?.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    focusable?.focus()

    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissOnEscape) {
        onClose()
        return
      }

      if (event.key !== 'Tab' || !backdropRef.current) return

      const focusableElements = Array.from(backdropRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ))
      if (focusableElements.length === 0) return

      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyboard)
    return () => {
      window.removeEventListener('keydown', handleKeyboard)
      previouslyFocused?.focus()
    }
  }, [dismissOnEscape, onClose])

  return (
    <div
      ref={backdropRef}
      className={className}
      role="presentation"
      onMouseDown={(event) => {
        if (dismissOnBackdrop && event.target === event.currentTarget) onClose()
      }}
    >
      {children}
    </div>
  )
}

type DialogSurfaceProps = {
  children: ReactNode
  className: string
  labelledBy: string
  describedBy?: string
  kind?: 'dialog' | 'alertdialog'
  as?: 'section' | 'aside'
}

export function DialogSurface({
  children,
  className,
  labelledBy,
  describedBy,
  kind = 'dialog',
  as = 'section',
}: DialogSurfaceProps) {
  const Element = as

  return (
    <Element
      className={className}
      role={kind}
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
    >
      {children}
    </Element>
  )
}

type ConfirmationDialogProps = {
  className: string
  backdropClassName: string
  title: string
  titleId: string
  description: ReactNode
  descriptionId: string
  icon?: ReactNode
  cancelLabel: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmationDialog({
  className,
  backdropClassName,
  title,
  titleId,
  description,
  descriptionId,
  icon,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmationDialogProps) {
  return (
    <OverlayBackdrop
      className={backdropClassName}
      onClose={onCancel}
      dismissOnBackdrop={false}
    >
      <DialogSurface
        className={className}
        labelledBy={titleId}
        describedBy={descriptionId}
        kind="alertdialog"
      >
        {icon}
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
        <div>
          <button type="button" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </DialogSurface>
    </OverlayBackdrop>
  )
}

type DrawerHeaderProps = {
  label: string
  title: string
  titleId: string
  closeLabel: string
  onClose: () => void
}

export function DrawerHeader({
  label,
  title,
  titleId,
  closeLabel,
  onClose,
}: DrawerHeaderProps) {
  return (
    <header className="order-drawer-header">
      <div>
        <span>{label}</span>
        <h2 id={titleId}>{title}</h2>
      </div>
      <button type="button" aria-label={closeLabel} autoFocus onClick={onClose}>
        <X aria-hidden="true" />
      </button>
    </header>
  )
}
