'use client'

import * as React from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface DateRange {
  from: Date
  to: Date
}

interface DateRangePickerProps {
  value?: DateRange
  onChange?: (range: DateRange) => void
  className?: string
}

const presets = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 12 months', days: 365 },
]

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [range, setRange] = React.useState<DateRange>(
    value || {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date(),
    }
  )
  const [isOpen, setIsOpen] = React.useState(false)

  const handlePresetClick = (days: number) => {
    const newRange: DateRange = {
      from: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      to: new Date(),
    }
    setRange(newRange)
    onChange?.(newRange)
    setIsOpen(false)
  }

  const formatDateRange = (range: DateRange) => {
    const fromStr = range.from.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: range.from.getFullYear() !== range.to.getFullYear() ? 'numeric' : undefined,
    })
    const toStr = range.to.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    return `${fromStr} - ${toStr}`
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start text-left font-normal',
            !range && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {range ? formatDateRange(range) : 'Pick a date range'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4">
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-900 mb-3">Select Period</div>
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handlePresetClick(preset.days)}
              >
                {preset.label}
              </Button>
            ))}
            <div className="border-t pt-2 mt-2">
              <div className="text-xs text-gray-500 mb-2">Custom Range</div>
              <div className="grid gap-2">
                <div>
                  <label className="text-xs text-gray-600">From</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    value={range.from.toISOString().split('T')[0]}
                    onChange={(e) => {
                      const newRange = {
                        ...range,
                        from: new Date(e.target.value),
                      }
                      setRange(newRange)
                      onChange?.(newRange)
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">To</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    value={range.to.toISOString().split('T')[0]}
                    onChange={(e) => {
                      const newRange = {
                        ...range,
                        to: new Date(e.target.value),
                      }
                      setRange(newRange)
                      onChange?.(newRange)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
