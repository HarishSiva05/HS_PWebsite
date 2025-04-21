"use client"

import { useState, useEffect, useRef } from "react"
import { useInView } from "framer-motion"

interface AnimatedCounterProps {
  from: number
  to: number
  duration?: number
  delay?: number
}

export default function AnimatedCounter({ from, to, duration = 2, delay = 0 }: AnimatedCounterProps) {
  const [count, setCount] = useState(from)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const countRef = useRef(from)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    if (isInView && !hasAnimated) {
      const startTime = Date.now() + delay * 1000
      const endTime = startTime + duration * 1000

      const timer = setInterval(() => {
        const now = Date.now()

        if (now < startTime) {
          return
        }

        if (now >= endTime) {
          setCount(to)
          clearInterval(timer)
          setHasAnimated(true)
          return
        }

        const progress = (now - startTime) / (endTime - startTime)
        const nextCount = Math.floor(from + (to - from) * progress)

        if (nextCount !== countRef.current) {
          countRef.current = nextCount
          setCount(nextCount)
        }
      }, 50)

      return () => clearInterval(timer)
    }
  }, [isInView, from, to, duration, delay, hasAnimated])

  return <span ref={ref}>{count}</span>
}
