"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Search, Wrench, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"

const toolsList = [
  {
    title: "Resume Generator",
    description: "Create a professional, ATS-friendly resume in minutes. Choose from templates tailored for the tech industry.",
    icon: <FileText className="h-5 w-5 text-rose-500" />,
    iconBg: "bg-rose-500/10",
    href: "/tools/resume",
    badge: "Popular",
  },
  {
    title: "Resume Analyzer",
    description: "Upload your existing resume and get AI-powered feedback on how to improve it for better match rates.",
    icon: <Search className="h-5 w-5 text-indigo-500" />,
    iconBg: "bg-indigo-500/10",
    href: "/tools/resume-analyzer",
    badge: "New",
  }
]

export function ToolsClient() {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground flex items-center gap-2">
          Career Tools
        </h1>
        <p className="text-sm text-muted-foreground">
          Supercharge your preparation with our AI-powered utilities.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300 mt-4">
        {toolsList.map((tool, idx) => (
          <Card
            key={idx}
            className="group flex cursor-pointer flex-col justify-between transition-colors hover:bg-muted/50"
            onClick={() => router.push(tool.href)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tool.iconBg}`}>
                  {tool.icon}
                </div>
                {tool.badge && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary">
                    {tool.badge}
                  </Badge>
                )}
              </div>
              <CardTitle className="group-hover:text-primary transition-colors">
                {tool.title}
              </CardTitle>
              <CardDescription>
                {tool.description}
              </CardDescription>
            </CardHeader>
            <div className="flex-1" />
            <CardContent>
              <div className="flex items-center text-sm font-medium text-muted-foreground transition-colors group-hover:text-primary">
                Open Tool
                <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
