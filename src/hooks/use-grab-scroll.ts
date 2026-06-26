import { useRef, useState, MouseEvent as ReactMouseEvent } from 'react'

export function useGrabScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [startY, setStartY] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)

  const onMouseDown = (e: ReactMouseEvent<T>) => {
    const target = e.target as HTMLElement
    // Ignore interactive elements to allow normal clicks
    if (
      target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'SELECT' ||
      target.tagName === 'A' ||
      target.tagName === 'TEXTAREA' ||
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input')
    ) {
      return
    }

    if (!ref.current) return
    setIsDragging(true)
    setStartX(e.pageX - ref.current.offsetLeft)
    setStartY(e.pageY - ref.current.offsetTop)
    setScrollLeft(ref.current.scrollLeft)
    setScrollTop(ref.current.scrollTop)
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
    const y = e.pageY - ref.current.offsetTop
    const walkX = (x - startX) * 1.5
    const walkY = (y - startY) * 1.5
    ref.current.scrollLeft = scrollLeft - walkX
    ref.current.scrollTop = scrollTop - walkY
  }

  return {
    ref,
    events: {
      onMouseDown,
      onMouseLeave,
      onMouseUp,
      onMouseMove,
    },
    isDragging,
  }
}
