import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useEffect, useState } from "react"
import { Loader2, Flame, CircleCheck, CircleDot, CalendarDays } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface PotdHistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20",
  Medium: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20",
  Hard: "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20",
}

export function PotdHistoryModal({ open, onOpenChange }: PotdHistoryModalProps) {
  const [history, setHistory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (open && history.length === 0) {
      setIsLoading(true)
      fetch("/api/logiclab/potd/history")
        .then(res => res.json())
        .then(data => {
          if (data.success && data.history) setHistory(data.history)
          setIsLoading(false)
        })
        .catch(() => setIsLoading(false))
    }
  }, [open, history.length])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border/60 p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="px-6 py-5 border-b border-border/60 bg-muted/20">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0 shadow-inner">
              <CalendarDays className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-foreground">Challenge History</span>
              <p className="text-sm font-normal text-muted-foreground mt-0.5">Review and practice previous Daily Challenges</p>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2 bg-background/50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-6 w-6 text-orange-500 animate-spin" />
              <span className="text-sm text-muted-foreground">Loading history...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <Flame className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-foreground font-medium mb-1">No history yet</p>
              <p className="text-sm text-muted-foreground">Daily challenges will appear here as time progresses.</p>
            </div>
          ) : (
            history.map((day) => {
              const isSolved = day.solved_status === "Accepted"
              const dateObj = new Date(day.date)
              
              return (
                <div 
                  key={day.date}
                  onClick={() => router.push(`/logiclab/problems/${day.problem_id}`)}
                  className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-card hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center w-10 shrink-0 border-r border-border/40 pr-4">
                      <span className="text-[14px] font-black text-foreground/80 leading-none">
                        {dateObj.toLocaleDateString('en-US', { day: '2-digit' })}
                      </span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase leading-none mt-1 tracking-wider">
                        {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground/90 group-hover:text-foreground transition-colors">
                          {day.coding_problems?.title}
                        </span>
                        {day.coding_problems?.difficulty && (
                          <Badge variant="secondary" className={cn("text-[10px] uppercase px-2 py-0 h-4", DIFFICULTY_COLORS[day.coding_problems.difficulty])}>
                            {day.coding_problems.difficulty}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {isSolved ? (
                          <span className="text-emerald-500 font-medium flex items-center gap-1">
                            <CircleCheck className="h-3.5 w-3.5" /> Solved
                          </span>
                        ) : day.solved_status ? (
                          <span className="text-amber-500 font-medium flex items-center gap-1">
                            <CircleDot className="h-3.5 w-3.5" /> Attempted
                          </span>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <div className="h-3 w-3 rounded-full border-[1.5px] border-muted-foreground/40" /> Unsolved
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm font-medium text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                    Practice
                  </div>
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
