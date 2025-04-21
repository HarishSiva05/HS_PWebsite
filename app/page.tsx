"use client"

import { useEffect, useState, useRef } from "react"
import { motion, useScroll, useTransform, useInView } from "framer-motion"
import {
  Shield,
  Code,
  Github,
  Linkedin,
  Mail,
  ChevronRight,
  Briefcase,
  GraduationCap,
  Award,
  FileText,
  Lock,
  Zap,
  MessageSquare,
  Leaf,
  Phone,
  ChevronDown,
  ExternalLink,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import TerminalText from "@/components/terminal-text"
import AnimatedCounter from "@/components/animated-counter"
import AnimatedBackground from "@/components/animated-background"
import { cn } from "@/lib/utils"
import Image from "next/image"

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [activeSection, setActiveSection] = useState("home")
  const [selectedProject, setSelectedProject] = useState<number | null>(null)

  const { scrollYProgress } = useScroll()
  const opacity = useTransform(scrollYProgress, [0, 0.05], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.05], [1, 0.97])

  const homeRef = useRef<HTMLElement>(null)
  const aboutRef = useRef<HTMLElement>(null)
  const experienceRef = useRef<HTMLElement>(null)
  const projectsRef = useRef<HTMLElement>(null)
  const certificationsRef = useRef<HTMLElement>(null)
  const contactRef = useRef<HTMLElement>(null)

  const homeInView = useInView(homeRef, { amount: 0.5 })
  const aboutInView = useInView(aboutRef, { amount: 0.5 })
  const experienceInView = useInView(experienceRef, { amount: 0.5 })
  const projectsInView = useInView(projectsRef, { amount: 0.5 })
  const certificationsInView = useInView(certificationsRef, { amount: 0.5 })
  const contactInView = useInView(contactRef, { amount: 0.5 })

  // Projects data
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

  // Update active section based on scroll position
  useEffect(() => {
    if (homeInView) setActiveSection("home")
    else if (aboutInView) setActiveSection("about")
    else if (experienceInView) setActiveSection("experience")
    else if (projectsInView) setActiveSection("projects")
    else if (certificationsInView) setActiveSection("certifications")
    else if (contactInView) setActiveSection("contact")
  }, [homeInView, aboutInView, experienceInView, projectsInView, certificationsInView, contactInView])

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId)
    if (section) {
      section.scrollIntoView({ behavior: "smooth" })
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <AnimatedBackground />

      {/* Fixed Navigation */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-muted/20"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <motion.div
            className="flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            {/* <Shield className="h-6 w-6 text-emerald-500" />
            <span className="font-bold text-lg">Harish Sivaram</span> */}
          </motion.div>

          <div className="hidden md:flex items-center gap-6">
            {[
              { id: "home", label: "Home" },
              { id: "about", label: "About" },
              { id: "experience", label: "Experience" },
              { id: "projects", label: "Projects" },
              { id: "certifications", label: "Certifications" },
              { id: "contact", label: "Contact" },
            ].map((item) => (
              <motion.button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={cn(
                  "text-sm font-medium relative",
                  activeSection === item.id ? "text-emerald-500" : "text-muted-foreground hover:text-foreground",
                )}
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                {item.label}
                {activeSection === item.id && (
                  <motion.div
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-emerald-500"
                    layoutId="activeSection"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.button>
            ))}
          </div>

          <div className="flex md:hidden">
            <Button variant="ghost" size="icon">
              <ChevronDown className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section id="home" ref={homeRef} className="relative min-h-screen flex items-center overflow-hidden pt-24 pb-20">
        <motion.div style={{ opacity, scale }} className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent" />
        </motion.div>

        <div className="container px-4 md:px-6 relative z-10">
          <div className="max-w-3xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Badge className="mb-4 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors">
                Cybersecurity Professional
              </Badge>
            </motion.div>

            <motion.h1
              className="text-4xl font-bold tracking-tighter sm:text-6xl xl:text-7xl/none mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <span className="block">Harish Sivaram</span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-6"
            >
              <TerminalText
                texts={[
                  "Cybersecurity Specialist",
                  "Full-Stack Developer",
                  "Blockchain Enthusiast",
                  "AI/ML Practitioner",
                ]}
              />
            </motion.div>

            <motion.p
              className="text-xl text-muted-foreground mb-8 max-w-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Master's student in Cybersecurity and Threat Intelligence with expertise in enterprise content management,
              blockchain technologies, and AI-driven security solutions.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-md px-8 py-6 text-lg"
                  onClick={() => scrollToSection("projects")}
                >
                  View Projects
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  className="rounded-md px-8 py-6 text-lg"
                  onClick={() => scrollToSection("contact")}
                >
                  Contact Me
                </Button>
              </motion.div>
            </motion.div>

            <motion.div
              className="flex gap-6 mt-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <motion.a
                href="https://github.com/Harish-Sivaram"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                whileHover={{ scale: 1.2, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <Github className="h-6 w-6" />
                <span className="sr-only">GitHub</span>
              </motion.a>
              <motion.a
                href="https://www.linkedin.com/in/harish-sivaram/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                whileHover={{ scale: 1.2, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <Linkedin className="h-6 w-6" />
                <span className="sr-only">LinkedIn</span>
              </motion.a>
              <motion.a
                href="mailto:harish.greenecm@gmail.com"
                className="text-muted-foreground hover:text-foreground transition-colors"
                whileHover={{ scale: 1.2, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <Mail className="h-6 w-6" />
                <span className="sr-only">Email</span>
              </motion.a>
            </motion.div>
          </div>
        </div>

        <motion.div
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
          onClick={() => scrollToSection("about")}
          style={{ cursor: "pointer" }}
        >
          <ChevronDown className="h-8 w-8 text-muted-foreground" />
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30 backdrop-blur-sm">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="space-y-2"
            >
              <h3 className="text-4xl font-bold text-emerald-500">
                <AnimatedCounter from={0} to={4} duration={2} />+
              </h3>
              <p className="text-muted-foreground">Years Experience</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-2"
            >
              <h3 className="text-4xl font-bold text-emerald-500">
                <AnimatedCounter from={0} to={4} duration={2} />+
              </h3>
              <p className="text-muted-foreground">Certifications</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-2"
            >
              <h3 className="text-4xl font-bold text-emerald-500">
                <AnimatedCounter from={0} to={4} duration={2} />+
              </h3>
              <p className="text-muted-foreground">Major Projects</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="space-y-2"
            >
              <h3 className="text-4xl font-bold text-emerald-500">
                <AnimatedCounter from={0} to={3} duration={2} />+
              </h3>
              <p className="text-muted-foreground">Hackathon Awards</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" ref={aboutRef} className="py-24 md:py-32">
        <div className="container px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center space-y-4 text-center mb-16"
          >
            <Badge className="mb-2">About Me</Badge>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Education & Background</h2>
            <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed">
              My academic journey and professional background in cybersecurity and software development.
            </p>
          </motion.div>

          <div className="grid gap-12 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-emerald-500" />
                Education
              </h3>
              <div className="space-y-6">
                <motion.div
                  className="border-l-2 border-emerald-500 pl-6 relative"
                  whileHover={{ x: 5, boxShadow: "0 4px 14px 0 rgba(16, 185, 129, 0.1)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <div className="absolute w-3 h-3 bg-emerald-500 rounded-full -left-[7px] top-1.5"></div>
                  <h4 className="font-semibold text-lg">Master's in Cybersecurity and Threat Intelligence</h4>
                  <p className="text-muted-foreground">University of Guelph • Sep 2024 - Present</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Courses: Cybersecurity and Defense, Threat Intelligence, Privacy Compliance, Penetration Testing,
                    Digital Forensic
                  </p>
                </motion.div>
                <motion.div
                  className="border-l-2 border-muted pl-6 relative"
                  whileHover={{ x: 5, boxShadow: "0 4px 14px 0 rgba(100, 100, 100, 0.1)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <div className="absolute w-3 h-3 bg-muted rounded-full -left-[7px] top-1.5"></div>
                  <h4 className="font-semibold text-lg">Bachelor's in Computer Science and Engineering</h4>
                  <p className="text-muted-foreground">
                    Sri Krishna College of Engineering and Technology • Aug 2019 - May 2023
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">GPA: 9.11</p>
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-8"
            >
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Code className="h-6 w-6 text-emerald-500" />
                Skills
              </h3>

              <Tabs defaultValue="languages" className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-background/50 backdrop-blur-sm p-1 rounded-lg">
                  <TabsTrigger value="languages" className="text-sm">
                    Languages
                  </TabsTrigger>
                  <TabsTrigger value="frameworks" className="text-sm">
                    Frameworks
                  </TabsTrigger>
                  <TabsTrigger value="tools" className="text-sm">
                    Tools
                  </TabsTrigger>
                  <TabsTrigger value="platforms" className="text-sm">
                    Platforms
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="languages" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    {["Python", "C#", "JavaScript", "SQL", "Java", "Swift"].map((lang) => (
                      <motion.div
                        key={lang}
                        whileHover={{ scale: 1.05, y: -2 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <Badge className="justify-start gap-2 py-2 px-3 w-full">
                          <Code className="h-4 w-4" /> {lang}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="frameworks" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    {["Scikit-learn", "TensorFlow", "Flask", "React"].map((framework) => (
                      <motion.div
                        key={framework}
                        whileHover={{ scale: 1.05, y: -2 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <Badge className="justify-start gap-2 py-2 px-3 w-full">
                          <Code className="h-4 w-4" /> {framework}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="tools" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    {["Docker", "Git", "PostgreSQL", "MySQL", "SQLite", "Laserfiche"].map((tool) => (
                      <motion.div
                        key={tool}
                        whileHover={{ scale: 1.05, y: -2 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <Badge className="justify-start gap-2 py-2 px-3 w-full">
                          <Code className="h-4 w-4" /> {tool}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="platforms" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    {["Linux", "Windows", "MacOS", "Web"].map((platform) => (
                      <motion.div
                        key={platform}
                        whileHover={{ scale: 1.05, y: -2 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <Badge className="justify-start gap-2 py-2 px-3 w-full">
                          <Code className="h-4 w-4" /> {platform}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Experience Section */}
      <section id="experience" ref={experienceRef} className="py-24 md:py-32 bg-muted/30 backdrop-blur-sm">
        <div className="container px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center space-y-4 text-center mb-16"
          >
            <Badge className="mb-2">Experience</Badge>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Professional Journey</h2>
            <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed">
              My work experience and professional contributions in the field.
            </p>
          </motion.div>

          <div className="space-y-12 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              whileHover={{ x: 5 }}
              className="bg-background/50 backdrop-blur-sm border border-muted rounded-lg overflow-hidden"
            >
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="bg-emerald-500/10 p-3 rounded-full shrink-0">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <h3 className="text-xl font-bold">Developer at Doqpros</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Apr 2022 - Sep 2024</span>
                          <span className="bg-emerald-500/10 text-emerald-500 text-xs px-2 py-1 rounded-full">
                            Remote
                          </span>
                        </div>
                      </div>
                    </div>
                    <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                      <motion.li
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                      >
                        Developed custom C# scripts for Laserfiche to automate repository tasks such as metadata
                        extraction and logging.
                      </motion.li>
                      <motion.li
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                      >
                        Built a Retrieval-Augmented Generation model for Laserfiche guides, enhancing knowledge
                        management and document search capabilities.
                      </motion.li>
                      <motion.li
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: 0.3 }}
                      >
                        Gained proficiency in ClickUp, leveraging it for project management, task tracking, and
                        collaboration across teams.
                      </motion.li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ x: 5 }}
              className="bg-background/50 backdrop-blur-sm border border-muted rounded-lg overflow-hidden"
            >
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="bg-emerald-500/10 p-3 rounded-full shrink-0">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <h3 className="text-xl font-bold">Developer at GreenECM Technologies</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Apr 2020 - Sep 2021</span>
                          <span className="bg-emerald-500/10 text-emerald-500 text-xs px-2 py-1 rounded-full">
                            Hybrid
                          </span>
                        </div>
                      </div>
                    </div>
                    <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                      <motion.li
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                      >
                        Developed responsive websites with a focus on user-friendly UI/UX design.
                      </motion.li>
                      <motion.li
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                      >
                        Installed, configured, and maintained IBM FileNet P8 systems to ensure efficient enterprise
                        content management workflows.
                      </motion.li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section id="projects" ref={projectsRef} className="py-24 md:py-32">
        <div className="container px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center space-y-4 text-center mb-16"
          >
            <Badge className="mb-2">Projects</Badge>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Featured Work</h2>
            <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed">
              A showcase of my projects, research, and technical contributions.
            </p>
          </motion.div>

          <Tabs defaultValue="all" className="w-full max-w-3xl mx-auto mb-12">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
              <TabsTrigger value="fintech">FinTech</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {projects.map((project) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                whileHover={{ y: -5 }}
                className="bg-background/50 backdrop-blur-sm border border-muted rounded-lg overflow-hidden cursor-pointer"
                onClick={() => setSelectedProject(project.id)}
              >
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="bg-emerald-500/10 p-2 rounded-full">{project.icon}</div>
                    <div>
                      <h3 className="text-lg font-bold">{project.title}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {project.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{project.description}</p>
                  <Button variant="ghost" size="sm" className="w-full justify-between group">
                    View Details
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Certifications & Awards Section */}
      <section id="certifications" ref={certificationsRef} className="py-24 md:py-32 bg-muted/30 backdrop-blur-sm">
        <div className="container px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center space-y-4 text-center mb-16"
          >
            <Badge className="mb-2">Achievements</Badge>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Certifications & Awards</h2>
            <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed">
              Professional certifications and recognition of my work and skills.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-8">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6 text-emerald-500" />
                Certifications
              </h3>
              <div className="grid gap-4">
                {[
                  {
                    title: "Laserfiche Platinum Certification 10",
                    issuer: "Laserfiche",
                    date: "2023",
                    icon: <FileText className="h-5 w-5" />,
                  },
                  {
                    title: "Laserfiche Gold Certification 10",
                    issuer: "Laserfiche",
                    date: "2022",
                    icon: <FileText className="h-5 w-5" />,
                  },
                  {
                    title: "Criminal Justice Information Services Security and Privacy Training",
                    issuer: "CJIS",
                    date: "2023",
                    icon: <Shield className="h-5 w-5" />,
                  },
                  {
                    title: "Cybersecurity Essentials",
                    issuer: "CISCO",
                    date: "2022",
                    icon: <Lock className="h-5 w-5" />,
                  },
                ].map((cert, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    whileHover={{ x: 5, boxShadow: "0 4px 14px 0 rgba(0, 0, 0, 0.1)" }}
                    className="bg-background/50 backdrop-blur-sm border border-muted rounded-lg p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="bg-emerald-500/10 p-2 rounded-full shrink-0 mt-1">{cert.icon}</div>
                      <div>
                        <h4 className="font-medium">{cert.title}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <span>{cert.issuer}</span>
                          <span>•</span>
                          <span>{cert.date}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Award className="h-6 w-6 text-emerald-500" />
                Awards & Achievements
              </h3>
              <div className="space-y-6">
                <motion.div
                  className="border-l-2 border-emerald-500 pl-6 relative"
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="absolute w-3 h-3 bg-emerald-500 rounded-full -left-[7px] top-1.5"></div>
                  <h4 className="font-semibold text-lg">WINNER - Yugam2020 48-Hour Hackathon</h4>
                  <p className="text-muted-foreground">2020</p>
                </motion.div>
                <motion.div
                  className="border-l-2 border-muted pl-6 relative"
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="absolute w-3 h-3 bg-muted rounded-full -left-[7px] top-1.5"></div>
                  <h4 className="font-semibold text-lg">3rd Place - Steganography Treasure Hunt</h4>
                  <p className="text-muted-foreground">AnokaFest</p>
                </motion.div>
                <motion.div
                  className="border-l-2 border-muted pl-6 relative"
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="absolute w-3 h-3 bg-muted rounded-full -left-[7px] top-1.5"></div>
                  <h4 className="font-semibold text-lg">Participation</h4>
                  <p className="text-muted-foreground">HackHarvard, HackAlphaX, MLH</p>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" ref={contactRef} className="py-24 md:py-32">
        <div className="container px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center space-y-4 text-center mb-16"
          >
            <Badge className="mb-2">Contact</Badge>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Get In Touch</h2>
            <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed">
              Interested in collaborating or have questions? Feel free to reach out.
            </p>
          </motion.div>

          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              <Card className="bg-background/50 backdrop-blur-sm border-muted overflow-hidden">
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <motion.div
                      className="flex items-center gap-4"
                      whileHover={{ x: 5 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <div className="bg-emerald-500/10 p-3 rounded-full">
                        <Mail className="h-6 w-6 text-emerald-500" />
                      </div>
                      <div>
                        <h4 className="font-medium">Email</h4>
                        <p className="text-muted-foreground">harish.greenecm@gmail.com</p>
                        <p className="text-muted-foreground">sivaramh@uoguelph.ca</p>
                      </div>
                    </motion.div>
                    <motion.div
                      className="flex items-center gap-4"
                      whileHover={{ x: 5 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <div className="bg-emerald-500/10 p-3 rounded-full">
                        <Phone className="h-6 w-6 text-emerald-500" />
                      </div>
                      <div>
                        <h4 className="font-medium">Phone</h4>
                        <p className="text-muted-foreground">+1 (647)-671-3863</p>
                      </div>
                    </motion.div>
                    <motion.div
                      className="flex items-center gap-4"
                      whileHover={{ x: 5 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <div className="bg-emerald-500/10 p-3 rounded-full">
                        <Linkedin className="h-6 w-6 text-emerald-500" />
                      </div>
                      <div>
                        <h4 className="font-medium">LinkedIn</h4>
                        <a
                          href="https://www.linkedin.com/in/harish-sivaram/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-emerald-500 transition-colors"
                        >
                          linkedin.com/in/harish-sivaram
                        </a>
                      </div>
                    </motion.div>
                    <motion.div
                      className="flex items-center gap-4"
                      whileHover={{ x: 5 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <div className="bg-emerald-500/10 p-3 rounded-full">
                        <Github className="h-6 w-6 text-emerald-500" />
                      </div>
                      <div>
                        <h4 className="font-medium">GitHub</h4>
                        <a
                          href="https://github.com/Harish-Sivaram"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-emerald-500 transition-colors"
                        >
                          github.com/Harish-Sivaram
                        </a>
                      </div>
                    </motion.div>
                  </div>
                  <div className="mt-8 pt-6 border-t border-border">
                    <p className="text-muted-foreground">
                      I'm currently open to research collaborations, internship opportunities, and projects in
                      cybersecurity and blockchain domains.
                    </p>
                    <div className="flex justify-center mt-6">
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2">
                          <Mail className="mr-2 h-4 w-4" />
                          Email Me
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-muted/20 py-8 md:py-12">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-emerald-500" />
              <span className="text-lg font-medium">Harish Sivaram • Cybersecurity Portfolio</span>
            </div>
            <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} All rights reserved.</p>
            <div className="flex gap-6">
              <motion.a
                href="https://github.com/Harish-Sivaram"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Github className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </motion.a>
              <motion.a
                href="https://www.linkedin.com/in/harish-sivaram/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Linkedin className="h-5 w-5" />
                <span className="sr-only">LinkedIn</span>
              </motion.a>
              <motion.a
                href="mailto:harish.greenecm@gmail.com"
                className="text-muted-foreground hover:text-foreground transition-colors"
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Mail className="h-5 w-5" />
                <span className="sr-only">Email</span>
              </motion.a>
            </div>
          </div>
        </div>
      </footer>

      {/* Project Details Modal */}
      <Dialog open={selectedProject !== null} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <h2 className="text-2xl font-bold">
              {selectedProject !== null && projects.find((p) => p.id === selectedProject)?.title}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setSelectedProject(null)}>
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogHeader>

          {selectedProject !== null && (
            <div className="space-y-6 mt-4">
              <div className="relative aspect-video rounded-lg overflow-hidden">
                <Image
                  src={projects.find((p) => p.id === selectedProject)?.image || "/placeholder.svg"}
                  alt={projects.find((p) => p.id === selectedProject)?.title || ""}
                  width={800}
                  height={450}
                  className="object-cover"
                />
                <div className="absolute top-4 right-4 bg-emerald-500/90 p-3 rounded-full">
                  {projects.find((p) => p.id === selectedProject)?.icon}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {projects
                  .find((p) => p.id === selectedProject)
                  ?.tags.map((tag, index) => (
                    <Badge key={index} className="bg-emerald-500/10 text-emerald-500">
                      {tag}
                    </Badge>
                  ))}
              </div>

              <div className="prose prose-invert max-w-none">
                <h3>Project Overview</h3>
                <p className="text-muted-foreground">
                  {projects.find((p) => p.id === selectedProject)?.longDescription}
                </p>

                <h3 className="mt-6">Technologies Used</h3>
                <ul className="grid grid-cols-2 gap-2">
                  {projects
                    .find((p) => p.id === selectedProject)
                    ?.technologies.map((tech, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Code className="h-4 w-4 text-emerald-500" />
                        {tech}
                      </li>
                    ))}
                </ul>

                <div className="flex gap-4 mt-8">
                  <Button asChild>
                    <a
                      href={projects.find((p) => p.id === selectedProject)?.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center"
                    >
                      <Github className="mr-2 h-4 w-4" />
                      View Source
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a
                      href={projects.find((p) => p.id === selectedProject)?.demo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Live Demo
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
