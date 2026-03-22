import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ChartContainerProps {
  title: string
  children?: React.ReactNode
}

export function ChartContainer({ title, children }: ChartContainerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {children || (
          <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-500">Chart will be implemented here</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}