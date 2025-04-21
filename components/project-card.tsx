"use client"

import { ExternalLink } from "lucide-react"
import { motion } from "framer-motion"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import type { ReactNode } from "react"

interface ProjectCardProps {
  title: string
  description: string
  image: string
  tags: string[]
  link: string
  icon?: ReactNode
}

export default function ProjectCard({ title, description, image, tags, link, icon }: ProjectCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -10 }}
    >
      <Card className="overflow-hidden h-full flex flex-col bg-background/50 backdrop-blur-sm border-muted">
        <div className="relative aspect-video overflow-hidden">
          <Image
            src={image || "/placeholder.svg"}
            alt={title}
            width={500}
            height={300}
            className="object-cover transition-transform duration-500 hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"></div>
          {icon && <div className="absolute top-4 right-4 bg-emerald-500/90 p-2 rounded-full">{icon}</div>}
        </div>
        <CardContent className="flex-grow p-6">
          <h3 className="text-xl font-bold mb-3">{title}</h3>
          <p className="text-muted-foreground mb-4">{description}</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="bg-muted/50">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
        <CardFooter className="p-6 pt-0">
          <motion.a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm font-medium text-emerald-500 hover:text-emerald-400 transition-colors group"
            whileHover={{ x: 5 }}
          >
            View Project <ExternalLink className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </motion.a>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
