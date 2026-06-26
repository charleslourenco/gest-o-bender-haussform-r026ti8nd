import { useRef, useState, MouseEvent as ReactMouseEvent } from 'react'

export function useGrabScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [isDragging, setIsDragging] = useState(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)

  const onMouseDown = (e: ReactMouseEvent<T>) => {
    if (!ref.current) return
    setIsDragging(true)
    startX.current = e.pageX - ref.current.offsetLeft
    scrollLeft.current = ref.current.scrollLeft
  }

  const onMouseLeave = () => {
    setIsDragging(false)
  }

  const onMouseUp = () => {
    setIsDragging(false)
  }

  const onMouseMove = (e: ReactMouseEvent<T>) => {
    if (!isDragging || !ref.current) return
    e.preventDefault()
    const x = e.pageX - ref.current.offsetLeft
    const walk = (x - startX.current) * 2 // Scroll speed multiplier
    ref.current.scrollLeft = scrollLeft.current - walk
  }

  return {
    ref,
    isDragging,
    events: {
      onMouseDown,
      onMouseLeave,
      onMouseUp,
      onMouseMove,
    },
  }
}
