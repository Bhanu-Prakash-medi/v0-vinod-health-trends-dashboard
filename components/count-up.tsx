"use client"

import { useEffect, useRef, useState } from "react"

interface CountUpProps {
  value: string
  duration?: number
  className?: string
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * Animates a pre-formatted number ("5.27", "1,234", "80%") from 0 when it
 * scrolls into view, keeping the original decimals, grouping and suffix.
 */
export default function CountUp({ value, duration = 1100, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const match = value.match(/^(-?[\d,]*\.?\d+)(.*)$/)
  const target = match ? Number.parseFloat(match[1].replace(/,/g, "")) : Number.NaN
  const decimals = match?.[1].split(".")[1]?.length ?? 0
  const grouped = match?.[1].includes(",") ?? false
  const suffix = match?.[2] ?? ""

  const [current, setCurrent] = useState<number | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !Number.isFinite(target)) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCurrent(target)
      return
    }

    let frame = 0
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        const start = performance.now()
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration)
          setCurrent(target * easeOutCubic(t))
          if (t < 1) frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [target, duration])

  const text = !Number.isFinite(target)
    ? value
    : new Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: grouped,
      }).format(current ?? 0) + suffix

  return (
    <span ref={ref} className={className} aria-label={value}>
      <span aria-hidden="true">{text}</span>
    </span>
  )
}
