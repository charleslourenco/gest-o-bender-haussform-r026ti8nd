import {
  useRef,
  useState,
  MouseEvent as ReactMouseEvent,
  TouchEvent as ReactTouchEvent,
  useEffect,
} from 'react'

export function useGrabScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [startY, setStartY] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)

  const isInteractive = (target: HTMLElement) => {
    return (
      target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'SELECT' ||
      target.tagName === 'A' ||
      target.tagName === 'TEXTAREA' ||
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('[role="button"]') ||
      target.closest('[role="tab"]')
    )
  }

  const onMouseDown = (e: ReactMouseEvent<T>) => {
    if (isInteractive(e.target as HTMLElement)) return
    if (!ref.current) return
    setIsDragging(true)
    setStartX(e.pageX - ref.current.offsetLeft)
    setStartY(e.pageY - ref.current.offsetTop)
    setScrollLeft(ref.current.scrollLeft)
    setScrollTop(ref.current.scrollTop)
  }

  const onMouseLeave = () => setIsDragging(false)
  const onMouseUp = () => setIsDragging(false)

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

  const onTouchStart = (e: ReactTouchEvent<T>) => {
    if (isInteractive(e.target as HTMLElement)) return
    if (!ref.current) return
    setIsDragging(true)
    setStartX(e.touches[0].pageX - ref.current.offsetLeft)
    setStartY(e.touches[0].pageY - ref.current.offsetTop)
    setScrollLeft(ref.current.scrollLeft)
    setScrollTop(ref.current.scrollTop)
  }

  const onTouchEnd = () => setIsDragging(false)

  const onTouchMove = (e: ReactTouchEvent<T>) => {
    if (!isDragging || !ref.current) return
    const x = e.touches[0].pageX - ref.current.offsetLeft
    const y = e.touches[0].pageY - ref.current.offsetTop
    const walkX = (x - startX) * 1.5
    const walkY = (y - startY) * 1.5
    ref.current.scrollLeft = scrollLeft - walkX
    ref.current.scrollTop = scrollTop - walkY
  }

  useEffect(() => {
    if (isDragging) {
      document.body.style.userSelect = 'none'
    } else {
      document.body.style.userSelect = ''
    }
    return () => {
      document.body.style.userSelect = ''
    }
  }, [isDragging])

  return {
    ref,
    events: {
      onMouseDown,
      onMouseLeave,
      onMouseUp,
      onMouseMove,
      onTouchStart,
      onTouchEnd,
      onTouchMove,
    },
    isDragging,
  }
}
