import { cn } from "@/lib/utils";
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) { return <input className={cn("h-11 w-full rounded-lg border border-[#d9b75f] bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[#caa85a]/20 disabled:bg-[#f8f2e5]", className)} {...props} />; }
