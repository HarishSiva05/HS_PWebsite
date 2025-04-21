"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { MessageSquare, Lock, Zap, Leaf, ArrowLeft, Github, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import AnimatedBackground from "@/components/animated-background"
import Link from "next/link"
import Image from "next/image"

const projects = [
  {
    id: 1,
    title: "AI-Driven Security Chatbot",
    description:
      "Developed a prototype for an AI-based chatbot to detect and respond to security anomalies in repository systems using mock data. The chatbot uses natural language processing to understand security queries and provide appropriate responses.",
    longDescription:
      "This project involved creating an AI-powered security assistant that can monitor repository systems for unusual activities and respond to security incidents in real-time. The chatbot was built using Python and leverages machine learning algorithms to detect anomalies in system behavior. It can analyze patterns in user access, file modifications, and system logs to identify potential security threats. The chatbot provides immediate alerts and can suggest remediation steps based on the type of anomaly detected. It also features a conversational interface that allows security personnel to query the system about specific events or patterns.",
    image: "/placeholder.svg?height=400&width=600",
    tags: ["Python", "AI/ML", "Security", "NLP"],
    category: "security",
    github: "https://github.com/Harish-Sivaram/security-chatbot",
    demo: "#",
    icon: <MessageSquare className="h-6 w-6" />,
    technologies: ["Python", "TensorFlow", "Natural Language Processing", "Flask"],
  },
  {
    id: 2,
    title: "EthChat",
    description:
      "A decentralized messaging application hosted on the Ethereum Blockchain that allows you to send and receive encrypted messages via smart contract.",
    longDescription:
      "EthChat is a fully decentralized messaging platform built on the Ethereum blockchain. The application uses smart contracts to store encrypted messages, ensuring that only the intended recipients can decrypt and read them. All messages are secured using end-to-end encryption, with private keys never leaving the user's device. The application features a modern, intuitive interface that makes blockchain messaging accessible to non-technical users. EthChat also includes features like message expiration, read receipts, and the ability to send small amounts of cryptocurrency along with messages. The project demonstrates how blockchain technology can be used to create secure, censorship-resistant communication channels.",
    image: "/placeholder.svg?height=400&width=600",
    tags: ["Blockchain", "Ethereum", "Encryption", "Web3"],
    category: "blockchain",
    github: "https://github.com/Harish-Sivaram/ethchat",
    demo: "#",
    icon: <Lock className="h-6 w-6" />,
    technologies: ["Solidity", "React", "Web3.js", "IPFS"],
  },
  {
    id: 3,
    title: "Peer-Peer Energy Trading System",
    description:
      "Blockchain revolutionizes residential energy trading, enabling direct peer-to-peer transactions and maximizing benefits. Secure, automated, and sustainable.",
    longDescription:
      "This project implements a decentralized energy trading platform that allows homeowners with solar panels or other renewable energy sources to sell excess energy directly to neighbors. The system uses blockchain technology to create a transparent, secure marketplace where energy producers and consumers can trade without intermediaries. Smart contracts automatically execute trades based on predefined conditions, such as price thresholds or time-of-day preferences. The platform includes features for real-time monitoring of energy production and consumption, automated billing, and reputation systems for reliable energy providers. By enabling direct peer-to-peer energy trading, the system helps maximize the value of renewable energy investments and promotes more sustainable energy consumption patterns.",
    image: "/placeholder.svg?height=400&width=600",
    tags: ["Blockchain", "Smart Contracts", "Energy", "P2P"],
    category: "blockchain",
    github: "https://github.com/Harish-Sivaram/p2p-energy",
    demo: "#",
    icon: <Zap className="h-6 w-6" />,
    technologies: ["Ethereum", "IoT", "Smart Contracts", "React"],
  },
  {
    id: 4,
    title: "Agrimate",
    description:
      "Wholesome application developed to enhance the financial capabilities of farmers, providing tools for financial management and market access.",
    longDescription:
      "Agrimate is a comprehensive platform designed to empower farmers with financial tools and market insights. The application helps farmers track expenses, manage inventory, and forecast revenues based on crop cycles and market trends. It includes features for connecting directly with buyers, eliminating middlemen and ensuring farmers receive fair prices for their produce. The platform also provides access to microloans and insurance products specifically tailored for agricultural needs. Agrimate integrates weather forecasting and crop disease prediction to help farmers make informed decisions about planting and harvesting. The mobile-first approach ensures that farmers can access these tools even in areas with limited internet connectivity.",
    image: "/placeholder.svg?height=400&width=600",
    tags: ["FinTech", "Agriculture", "Mobile App", "Financial Inclusion"],
    category: "fintech",
    github: "https://github.com/Harish-Sivaram/agrimate",
    demo: "#",
    icon: <Leaf className="h-6 w-6" />,
    technologies: ["React Native", "Node.js", "MongoDB", "Financial APIs"],
  },
]

export default function ProjectsPage() {
  const [filter, setFilter] = useState("all")
  const [selectedProject, setSelectedProject] = useState<number | null>(null)

  const filteredProjects = filter === "all" ? projects : projects.filter((project) => project.category === filter)

  const project = selectedProject !== null ? projects.find((p) => p.id === selectedProject) : null

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <AnimatedBackground />

      <div className="container px-4 md:px-6 py-24 md:py-32">
        {!project ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center space-y-4 text-center mb-16"
            >
              <Badge className="mb-2">Projects</Badge>
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">My Work</h1>
              <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed">
                A showcase of my projects in cybersecurity, blockchain, and software development.
              </p>

              <div className="flex items-center gap-4 mt-6">
                <Link href="/">
                  <Button variant="outline" className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back to Home
                  </Button>
                </Link>
              </div>
            </motion.div>

            <div className="mb-12">
              <Tabs defaultValue="all" onValueChange={setFilter}>
                <TabsList className="grid grid-cols-4 max-w-md mx-auto">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="security">Security</TabsTrigger>
                  <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
                  <TabsTrigger value="fintech">FinTech</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <motion.div
              className="grid gap-8 md:grid-cols-2 lg:grid-cols-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {filteredProjects.map((project) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  whileHover={{ y: -10 }}
                  className="bg-background/50 backdrop-blur-sm border border-muted rounded-lg overflow-hidden cursor-pointer"
                  onClick={() => setSelectedProject(project.id)}
                >
                  <div className="relative aspect-video overflow-hidden">
                    <Image
                      src={project.image || "/placeholder.svg"}
                      alt={project.title}
                      width={600}
                      height={400}
                      className="object-cover transition-transform duration-500 hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"></div>
                    <div className="absolute top-4 right-4 bg-emerald-500/90 p-2 rounded-full">{project.icon}</div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-3">{project.title}</h3>
                    <p className="text-muted-foreground mb-4 line-clamp-2">{project.description}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="bg-muted/50">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full">
                      View Details
                    </Button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <Button variant="outline" className="mb-8 gap-2" onClick={() => setSelectedProject(null)}>
              <ArrowLeft className="h-4 w-4" /> Back to Projects
            </Button>

            <div className="grid gap-12 md:grid-cols-[2fr_1fr]">
              <div>
                <div className="relative aspect-video rounded-lg overflow-hidden mb-8">
                  <Image
                    src={project.image || "/placeholder.svg"}
                    alt={project.title}
                    width={800}
                    height={450}
                    className="object-cover"
                  />
                  <div className="absolute top-4 right-4 bg-emerald-500/90 p-3 rounded-full">{project.icon}</div>
                </div>

                <h1 className="text-3xl font-bold mb-4">{project.title}</h1>

                <div className="flex flex-wrap gap-2 mb-6">
                  {project.tags.map((tag, index) => (
                    <Badge key={index} className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="prose prose-invert max-w-none">
                  <h3>Project Overview</h3>
                  <p className="text-muted-foreground">{project.longDescription}</p>

                  <h3 className="mt-8">Technologies Used</h3>
                  <ul>
                    {project.technologies.map((tech, index) => (
                      <li key={index}>{tech}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-background/50 backdrop-blur-sm border border-muted rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4">Project Details</h3>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Category</h4>
                      <p className="capitalize">{project.category}</p>
                    </div>

                    <div className="pt-4 border-t border-muted">
                      <h4 className="text-sm font-medium text-muted-foreground mb-4">Links</h4>

                      <div className="space-y-3">
                        <a
                          href={project.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Github className="h-5 w-5" />
                          <span>View Source Code</span>
                        </a>

                        <a
                          href={project.demo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ExternalLink className="h-5 w-5" />
                          <span>Live Demo</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-background/50 backdrop-blur-sm border border-muted rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4">Other Projects</h3>

                  <div className="space-y-4">
                    {projects
                      .filter((p) => p.id !== project.id)
                      .slice(0, 3)
                      .map((p) => (
                        <div
                          key={p.id}
                          className="flex items-start gap-3 p-3 hover:bg-muted/50 rounded-md cursor-pointer transition-colors"
                          onClick={() => setSelectedProject(p.id)}
                        >
                          <div className="bg-emerald-500/10 p-2 rounded-full">{p.icon}</div>
                          <div>
                            <h4 className="font-medium">{p.title}</h4>
                            <p className="text-sm text-muted-foreground line-clamp-1">{p.description}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
