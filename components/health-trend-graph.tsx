"use client"

import { Card } from "@/components/ui/card"
import { ChevronRight } from "lucide-react"

export default function HealthTrendGraph() {
  const dataPoints = [
    { year: 2020, value: 45, x: 50, y: 120 },
    { year: 2021, value: 38, x: 100, y: 135 },
    { year: 2022, value: 52, x: 150, y: 105 },
    { year: 2023, value: 41, x: 200, y: 125 },
    { year: 2024, value: 43.3, x: 250, y: 120 },
  ]

  const normalRangeY = { min: 80, max: 50 }

  return (
    <Card className="border border-[#f0f3f5] p-4 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-[#2e3742]">Urea / Creatinine Ratio</h3>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-lg font-semibold text-[#459f49]">43.3 ratio</span>
            <span className="text-xs text-[#9dabbd]">15-Jan-24</span>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-[#9dabbd]" />
      </div>

      {/* Graph */}
      <div className="relative h-[160px] w-full">
        <svg viewBox="0 0 300 160" className="h-full w-full">
          {/* Grid lines */}
          <line x1="50" y1="20" x2="50" y2="140" stroke="#e5e7eb" strokeWidth="1" />
          <line x1="50" y1="140" x2="290" y2="140" stroke="#e5e7eb" strokeWidth="1" />

          {/* Horizontal grid */}
          {[40, 80, 120, 160].map((val, i) => (
            <g key={val}>
              <line
                x1="50"
                y1={20 + i * 30}
                x2="290"
                y2={20 + i * 30}
                stroke="#D2D8E0"
                strokeDasharray="4 4"
                strokeWidth="0.5"
              />
              <text x="35" y={24 + i * 30} fontSize="10" fill="#9dabbd" textAnchor="end">
                {160 - val}
              </text>
            </g>
          ))}

          {/* Normal range highlight */}
          <rect
            x="50"
            y={normalRangeY.max}
            width="240"
            height={normalRangeY.min - normalRangeY.max}
            fill="#edf7ee"
            opacity="0.5"
          />

          {/* Data line */}
          <polyline
            points={dataPoints.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#459f49"
            strokeWidth="2"
          />

          {/* Data points */}
          {dataPoints.map((point, i) => (
            <g key={i}>
              <circle cx={point.x} cy={point.y} r="4" fill="#459f49" stroke="white" strokeWidth="2" />
              <text x={point.x} y="155" fontSize="10" fill="#9dabbd" textAnchor="middle">
                {point.year}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Range Indicator */}
      <div className="mt-4 flex items-center gap-2">
        <div className="h-3.5 w-4 rounded border border-[#addaaf] bg-[#edf7ee]" />
        <span className="text-xs text-[#4d5c6f]">Normal range: 40 to 100 ratio</span>
      </div>
    </Card>
  )
}
