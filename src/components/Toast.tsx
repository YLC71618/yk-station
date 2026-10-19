import { useCallback, useEffect, useRef, useState } from 'react'
import './Toast.css'

/** Short-lived message, e.g. after a treatment. */
export function useToast(ms = 2600) {
  const [message, setMessage] = useState('')
  const timer = useRef<number | undefined>(undefined)
  const show = useCallback(
    (msg: string) => {
      setMessage(msg)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setMessage(''), ms)
    },
    [ms],
  )
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return { message, show }
}

export function Toast({ message }: { message: string }) {
  if (!message) return null
  return (
    <div className="toast" role="status">
      {message}
    </div>
  )
}
