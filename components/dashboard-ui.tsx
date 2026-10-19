"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

// Building blocks shared by the executive dashboard and the analytics page.
export const number = (value: number) => new Intl.NumberFormat("en").format(value);
export const percent = (value: number | null) => value == null ? "—" : `${value}%`;
export function duration(ms: number | null) {
  if (ms == null) return "—";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.round(seconds % 3600 / 60)}m`;
}
export function timeAgo(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} h ago`;
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(new Date(value));
}
export const dateTime = (value: string) => new Intl.DateTimeFormat("en", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
export const uptimeTone = (value: number) => value >= 99.5 ? "text-[#1f7a1f]" : value >= 95 ? "text-[#a15c00]" : "text-[#b42318]";

export const card = "rounded-2xl border border-[#e4e2dc] bg-white";
export const muted = "text-[#6f6f68]";

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-[13px] font-medium uppercase tracking-[.08em] text-[#6f6f68]">{children}</h2>;
}

export function StatCard({ label, value, detail, detailTone, tone, title }: { label: string; value: string; detail: string; detailTone?: "good" | "bad"; tone?: "danger" | "warning"; title?: string }) {
  return <div className={cn("rounded-2xl border p-5", tone === "danger" ? "border-[#e9a7ac] bg-[#f9d8da]" : tone === "warning" ? "border-[#e7b64e] bg-[#f8dc9f]" : "border-[#e4e2dc] bg-white")} title={title}>
    <p className={cn("text-[15px]", tone === "danger" ? "text-[#8f1d24]" : tone === "warning" ? "text-[#8a6a2b]" : muted)}>{label}</p>
    <p className={cn("mt-1 text-[34px] font-semibold leading-tight tracking-tight", tone === "danger" ? "text-[#8f1d24]" : tone === "warning" ? "text-[#7a4b00]" : "text-[#1a1a17]")}>{value}</p>
    <p className={cn("mt-1 text-[15px] leading-snug", detailTone === "good" ? "text-[#1f7a1f]" : detailTone === "bad" ? "text-[#b42318]" : tone === "danger" ? "text-[#8f1d24]" : tone === "warning" ? "text-[#7a4b00]" : muted)}>{detail}</p>
  </div>;
}

export function Panel({ icon: Icon, title, action, children, className }: { icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; title: string; action?: { href: string; label: string } | null; children: React.ReactNode; className?: string }) {
  return <section className={cn(card, "p-5 sm:p-6", className)}>
    <div className="mb-5 flex items-start justify-between gap-3">
      <h2 className="flex items-center gap-2 text-[19px] font-semibold text-[#1a1a17]"><Icon size={20} strokeWidth={1.75} />{title}</h2>
      {action && <Link href={action.href} className="shrink-0 text-[16px] text-[#1d5fa7] hover:underline">{action.label}</Link>}
    </div>
    {children}
  </section>;
}

export function Note({ children }: { children: React.ReactNode }) {
  return <p className={cn("py-6 text-center text-sm", muted)}>{children}</p>;
}

export function MiniStat({ label, value, detail, valueClass }: { label: string; value: string; detail: string; valueClass?: string }) {
  return <div className="rounded-xl border border-[#e4e2dc] p-3.5">
    <p className={cn("text-[14px] leading-snug", muted)}>{label}</p>
    <p className={cn("mt-0.5 text-[28px] font-semibold leading-tight", valueClass || "text-[#1a1a17]")}>{value}</p>
    <p className={cn("text-[14px]", muted)}>{detail}</p>
  </div>;
}

export function MeterRow({ label, value, share, color }: { label: string; value: string; share: number | null; color: string }) {
  return <div>
    <div className="flex items-center justify-between text-[16px]"><span>{label}</span><span className="tabular-nums">{value}</span></div>
    <div className="mt-1.5 h-1.5 rounded-full bg-[#f0efea]"><div className="h-full rounded-full" style={{ width: `${Math.min(100, share ?? 0)}%`, background: color }} /></div>
  </div>;
}

export function bytes(value: number | null | undefined) {
  if (value == null) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"]; let size = value, unit = 0;
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit++; }
  return `${size >= 10 || unit === 0 ? Math.round(size) : size.toFixed(1)} ${units[unit]}`;
}
