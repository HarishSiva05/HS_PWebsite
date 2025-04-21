"use client"

import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"

interface CertificationCardProps {
  title: string
  issuer: string
  date: string
  icon?: ReactNode
}

export default function CertificationCard({ title, issuer, date, icon }: CertificationCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3 }}
      whileHover={{ x: 5 }}
    >
      <Card className="bg-background/50 backdrop-blur-sm border-muted overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {icon && <div className="bg-emerald-500/10 p-2 rounded-full shrink-0 mt-1">{icon}</div>}
            <div>
              <h4 className="font-medium">{title}</h4>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <span>{issuer}</span>
                <span>•</span>
                <span>{date}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
