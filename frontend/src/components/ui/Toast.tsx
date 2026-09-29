import { useCallback, useEffect, useState } from 'react'

type ToastVariant = 'success' | 'error'

type ToastState = {
  id: number
  text: string
  variant: ToastVariant
}

// Petite notification en bas de l'ecran, qui disparait toute seule
// (a la place des bandeaux qui decalaient la page).
export function useToast() {
  const [toast, setToast] = useState<ToastState>()

  useEffect(() => {
    if (!toast) {
      return
    }
    const timer = window.setTimeout(() => setToast(undefined), toast.variant === 'error' ? 5000 : 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const showToast = useCallback((text: string, variant: ToastVariant = 'success') => {
    setToast((current) => ({ id: (current?.id ?? 0) + 1, text, variant }))
  }, [])

  const toastElement = toast ? (
    <div key={toast.id} className={`toast ${toast.variant}`} role={toast.variant === 'error' ? 'alert' : 'status'}>
      {toast.text}
    </div>
  ) : null

  return { toastElement, showToast }
}
