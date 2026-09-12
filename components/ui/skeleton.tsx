import { cn } from "@/lib/utils";
export function Skeleton({ className }: { className?: string }) { return <div className={cn("relative overflow-hidden rounded-md bg-slate-200 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/50 before:to-transparent", className)} />; }
