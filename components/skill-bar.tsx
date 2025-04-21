"use client"

import type { ReactNode } from "react"
import { motion } from "framer-motion"

interface SkillBarProps {
  skill: string
  percentage: number
  icon?: ReactNode
}

export default function SkillBar({ skill, percentage, icon }: SkillBarProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && <span className="text-emerald-500">{icon}</span>}
          <span className="font-medium">{skill}</span>
        </div>
        <span className="text-sm text-muted-foreground">{percentage}%</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
          initial={{ width: 0 }}
          whileInView={{ width: `${percentage}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        ></motion.div>
      </div>
    </div>
  )
}
