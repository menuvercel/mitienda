import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface WeekPickerProps {
  value: string
  onChange: (date: string) => void
}

export function WeekPicker({ value, onChange }: WeekPickerProps) {
  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: weekEnd
  })

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          {value ? format(new Date(value), "EEEE, d 'de' MMMM", { locale: es }) : 
            <span>Selecciona un día de esta semana</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ? new Date(value) : undefined}
          onSelect={(date) => onChange(date ? format(date, 'yyyy-MM-dd') : '')}
          disabled={(date) => {
            return !weekDays.some(weekDay => isSameDay(date, weekDay))
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
