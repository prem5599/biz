'use client'

import * as React from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SearchResult {
  id: string
  title: string
  description?: string
  type?: string
  url?: string
}

interface SearchInputProps {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onSelect?: (result: SearchResult) => void
  onSearch?: (query: string) => Promise<SearchResult[]>
  className?: string
  debounceMs?: number
  showAutocomplete?: boolean
}

export function SearchInput({
  placeholder = 'Search...',
  value: controlledValue,
  onChange,
  onSelect,
  onSearch,
  className,
  debounceMs = 300,
  showAutocomplete = true,
}: SearchInputProps) {
  const [value, setValue] = React.useState(controlledValue || '')
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedIndex, setSelectedIndex] = React.useState(-1)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Debounce search
  React.useEffect(() => {
    if (!onSearch || !value.trim() || !showAutocomplete) {
      setResults([])
      return
    }

    setIsLoading(true)
    const timer = setTimeout(async () => {
      try {
        const searchResults = await onSearch(value)
        setResults(searchResults)
        setIsOpen(true)
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [value, onSearch, debounceMs, showAutocomplete])

  // Handle click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleChange = (newValue: string) => {
    setValue(newValue)
    onChange?.(newValue)
    setSelectedIndex(-1)
  }

  const handleClear = () => {
    setValue('')
    onChange?.('')
    setResults([])
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const handleSelect = (result: SearchResult) => {
    setValue(result.title)
    onChange?.(result.title)
    onSelect?.(result)
    setIsOpen(false)
    setResults([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      handleSelect(results[selectedIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(results.length > 0)}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-md border border-gray-300 bg-white px-10 py-2 text-sm',
            'placeholder:text-gray-400',
            'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        />
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          {value && !isLoading && (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Autocomplete dropdown */}
      {isOpen && results.length > 0 && showAutocomplete && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg"
        >
          <div className="max-h-[300px] overflow-y-auto py-1">
            {results.map((result, index) => (
              <button
                key={result.id}
                onClick={() => handleSelect(result)}
                className={cn(
                  'w-full px-4 py-2 text-left transition-colors',
                  'hover:bg-gray-50',
                  selectedIndex === index && 'bg-blue-50'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {result.title}
                    </div>
                    {result.description && (
                      <div className="text-xs text-gray-500 truncate mt-0.5">
                        {result.description}
                      </div>
                    )}
                  </div>
                  {result.type && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                      {result.type}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
