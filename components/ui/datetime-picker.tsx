"use client"

import * as React from "react"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

interface DateTimePickerProps {
  id?: string
  value?: string // "YYYY-MM-DDTHH:mm" or ISO string or ""
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DateTimePicker({
  id,
  value,
  onChange,
  placeholder = "dd/MM/yyyy hh:mm aa",
  disabled = false,
  className,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  // Parse prop value ("YYYY-MM-DDTHH:mm" or ISO string) to Date object
  const date = React.useMemo(() => {
    if (!value) return undefined
    if (value.includes("T")) {
      const [datePart, timePart] = value.split("T")
      if (!datePart) return undefined
      const [year, month, day] = datePart.split("-").map(Number)
      let hours = 0
      let minutes = 0
      if (timePart) {
        const [h, m] = timePart.split(":").map(Number)
        hours = h || 0
        minutes = m || 0
      }
      const d = new Date(year, month - 1, day, hours, minutes)
      return isNaN(d.getTime()) ? undefined : d
    }
    const d = new Date(value)
    return isNaN(d.getTime()) ? undefined : d
  }, [value])

  const hours = Array.from({ length: 12 }, (_, i) => i + 1) // 1 to 12

  const updateDate = (newDate: Date | undefined) => {
    if (!newDate) {
      onChange?.("")
      return
    }
    const year = newDate.getFullYear()
    const month = String(newDate.getMonth() + 1).padStart(2, "0")
    const day = String(newDate.getDate()).padStart(2, "0")
    const hoursStr = String(newDate.getHours()).padStart(2, "0")
    const minsStr = String(newDate.getMinutes()).padStart(2, "0")
    onChange?.(`${year}-${month}-${day}T${hoursStr}:${minsStr}`)
  }

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) return
    const current = date ? new Date(date) : new Date()
    selectedDate.setHours(current.getHours(), current.getMinutes(), 0, 0)
    updateDate(selectedDate)
  }

  const handleTimeChange = (
    type: "hour" | "minute" | "ampm",
    val: string
  ) => {
    const current = date ? new Date(date) : new Date()
    const newDate = new Date(current)

    if (type === "hour") {
      const target12 = parseInt(val, 10)
      const isPM = newDate.getHours() >= 12
      let target24 = target12 % 12
      if (isPM) target24 += 12
      newDate.setHours(target24)
    } else if (type === "minute") {
      newDate.setMinutes(parseInt(val, 10))
    } else if (type === "ampm") {
      const currentHours = newDate.getHours()
      if (val === "PM" && currentHours < 12) {
        newDate.setHours(currentHours + 12)
      } else if (val === "AM" && currentHours >= 12) {
        newDate.setHours(currentHours - 12)
      }
    }
    updateDate(newDate)
  }

  const currentHour12 = date
    ? date.getHours() % 12 === 0
      ? 12
      : date.getHours() % 12
    : 12
  const isPM = date ? date.getHours() >= 12 : false

  return (
    <div className={cn("relative flex items-center w-full", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            disabled={disabled}
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal text-xs h-9 px-3 pr-8",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-60" />
            <span className="truncate">
              {date ? (
                format(date, "dd/MM/yyyy hh:mm aa")
              ) : (
                <span>{placeholder}</span>
              )}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-50" align="start">
          <div className="sm:flex">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
            />
            <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x border-t sm:border-t-0 sm:border-l">
              {/* Hour picker */}
              <ScrollArea className="w-full sm:w-auto h-36 sm:h-full">
                <div className="flex sm:flex-col p-2 gap-1">
                  <div className="hidden sm:block text-[10px] font-semibold text-center text-muted-foreground uppercase py-1 px-1">
                    Hour
                  </div>
                  {hours.map((hour) => (
                    <Button
                      key={hour}
                      type="button"
                      size="sm"
                      variant={
                        date && currentHour12 === hour
                          ? "default"
                          : "ghost"
                      }
                      className="sm:w-full shrink-0 h-8 px-2.5 text-xs font-mono"
                      onClick={() => handleTimeChange("hour", hour.toString())}
                    >
                      {String(hour).padStart(2, "0")}
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="sm:hidden" />
              </ScrollArea>

              {/* Minute picker */}
              <ScrollArea className="w-full sm:w-auto h-36 sm:h-full">
                <div className="flex sm:flex-col p-2 gap-1">
                  <div className="hidden sm:block text-[10px] font-semibold text-center text-muted-foreground uppercase py-1 px-1">
                    Min
                  </div>
                  {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                    <Button
                      key={minute}
                      type="button"
                      size="sm"
                      variant={
                        date && date.getMinutes() === minute
                          ? "default"
                          : "ghost"
                      }
                      className="sm:w-full shrink-0 h-8 px-2.5 text-xs font-mono"
                      onClick={() =>
                        handleTimeChange("minute", minute.toString())
                      }
                    >
                      {String(minute).padStart(2, "0")}
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="sm:hidden" />
              </ScrollArea>

              {/* AM/PM picker */}
              <ScrollArea className="w-full sm:w-auto">
                <div className="flex sm:flex-col p-2 gap-1">
                  <div className="hidden sm:block text-[10px] font-semibold text-center text-muted-foreground uppercase py-1 px-1">
                    Period
                  </div>
                  {["AM", "PM"].map((ampm) => (
                    <Button
                      key={ampm}
                      type="button"
                      size="sm"
                      variant={
                        date &&
                        ((ampm === "AM" && !isPM) || (ampm === "PM" && isPM))
                          ? "default"
                          : "ghost"
                      }
                      className="sm:w-full shrink-0 h-8 px-3 text-xs font-semibold"
                      onClick={() => handleTimeChange("ampm", ampm)}
                    >
                      {ampm}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {date && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 h-7 w-7 text-muted-foreground hover:text-foreground z-10"
          onClick={(e) => {
            e.stopPropagation()
            onChange?.("")
          }}
          title="Clear date"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}
