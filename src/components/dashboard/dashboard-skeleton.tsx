import { Skeleton } from '@/components/ui/skeleton'

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 mt-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-32 w-full rounded-xl bg-steel-blue/10" />
        <Skeleton className="h-32 w-full rounded-xl bg-steel-blue/10" />
        <Skeleton className="h-32 w-full rounded-xl bg-steel-blue/10" />
        <Skeleton className="h-32 w-full rounded-xl bg-steel-blue/10" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-[400px] w-full rounded-xl bg-steel-blue/10" />
        <Skeleton className="h-[400px] w-full rounded-xl bg-steel-blue/10" />
      </div>
    </div>
  )
}
