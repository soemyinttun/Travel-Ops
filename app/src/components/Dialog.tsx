import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'

/** Pop-up window for a form. Closes with the X, the Escape key, or a tap outside. Full width at the bottom on phones. */
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', key)
    box.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus()
    return () => document.removeEventListener('keydown', key)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={box} role="dialog" aria-modal="true" aria-label={title} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-4 shadow-xl sm:rounded-3xl sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-600 transition active:scale-95 hover:bg-slate-200"><Icon name="plus" className="h-5 w-5 rotate-45" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** A label above a field, in the style used by all forms. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">{label}<div className="mt-1 normal-case tracking-normal [&>*]:w-full">{children}</div></label>
}
