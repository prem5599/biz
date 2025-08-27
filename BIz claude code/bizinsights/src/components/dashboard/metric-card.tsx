import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MetricCardProps {
  title: string
  value: string
  change: string
  description: string
}

export function MetricCard({ title, value, change, description }: MetricCardProps) {
  const isPositive = change.startsWith('+')
  const isNegative = change.startsWith('-')

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        {isPositive && <TrendingUp className="h-4 w-4 text-green-600" />}
        {isNegative && <TrendingDown className="h-4 w-4 text-red-600" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">
          <span className={`${
            isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : ''
          }`}>
            {change}
          </span>{' '}
          {description}
        </p>
      </CardContent>
    </Card>
  )
}