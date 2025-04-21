"use client"

import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"

interface ExperienceCardProps {
  title: string
  company: string
  period: string
  location: string
  description: string[]
  icon?: ReactNode
}

export default function ExperienceCard({ title, company, period, location, description, icon }: ExperienceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      whileHover={{ x: 5 }}
    >
      <Card className="bg-background/50 backdrop-blur-sm border-muted overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            {icon && <div className="bg-emerald-500/10 p-3 rounded-full shrink-0">{icon}</div>}
            <div className="space-y-4">
              <div>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <h3 className="text-xl font-bold">
                    {title} at {company}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{period}</span>
                    <span className="bg-emerald-500/10 text-emerald-500 text-xs px-2 py-1 rounded-full">
                      {location}
                    </span>
                  </div>
                </div>
              </div>
              <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                {description.map((item, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 0.1 * index }}
                  >
                    {item}
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
