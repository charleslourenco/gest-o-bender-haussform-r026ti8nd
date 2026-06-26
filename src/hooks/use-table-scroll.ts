import { useState, useRef, useEffect, useCallback } from 'react'

export function useTableScroll() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollWidth - scrollLeft - clientWidth > 1)
    }
  }, [])

  useEffect(() => {
    checkScroll()
    window.addEventListener('resize', checkScroll)
    let observer: ResizeObserver | undefined

    // Slight delay to ensure content is painted before first check
    const timeout = setTimeout(checkScroll, 100)

    if (scrollRef.current) {
      observer = new ResizeObserver(() => checkScroll())
      observer.observe(scrollRef.current)
      if (scrollRef.current.firstElementChild) {
        observer.observe(scrollRef.current.firstElementChild)
      }
    }
    return () => {
      window.removeEventListener('resize', checkScroll)
      observer?.disconnect()
      clearTimeout(timeout)
    }
  }, [checkScroll])

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -400, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 400, behavior: 'smooth' })
    }
  }

  return { scrollRef, canScrollLeft, canScrollRight, scrollLeft, scrollRight, checkScroll }
}
