import * as React from "react"
import { Progress } from "./ui/Progress"

export function LoadingScreen() {
  const [progress, setProgress] = React.useState(13)

  React.useEffect(() => {
    const timer = setTimeout(() => setProgress(66), 500)
    const timer2 = setTimeout(() => setProgress(90), 1500)
    return () => {
      clearTimeout(timer)
      clearTimeout(timer2)
    }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-in fade-in duration-500">
      <div className="text-sm font-medium text-slate-500 dark:text-slate-400 animate-pulse">Loading data...</div>
      <Progress value={progress} className="w-[60%] max-w-md" />
    </div>
  )
}
