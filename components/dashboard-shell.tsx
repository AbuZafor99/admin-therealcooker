"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { BadgeCheck, CircleUserRound, FileText, GraduationCap, Home, LogOut, Menu, Newspaper, Users, X } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { logoutSession } from "@/lib/client-auth";
import { cn } from "@/lib/utils";

const links = [{ href: "/dashboard", label: "Dashboard", icon: Home }, { href: "/users", label: "Users List", icon: Users }, { href: "/learning", label: "Learning", icon: GraduationCap }, { href: "/verification", label: "Verification", icon: BadgeCheck }, { href: "/news", label: "News Feed", icon: Newspaper }, { href: "/terms", label: "Terms & Conditions", icon: FileText }];
const names: Record<string, string> = { dashboard: "Dashboard", users: "All Users List", learning: "Learning", verification: "Verification", news: "News Feed", terms: "Terms & Conditions", profile: "Profile" };

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { data, status } = useSession();
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const key = path.split("/")[1] || "dashboard";

  useEffect(() => {
    if (status === "unauthenticated" || data?.error) {
      void logoutSession().catch(() => { router.replace("/login"); });
    }
  }, [status, data?.error, router]);

  async function confirmSignOut() {
    setLoggingOut(true);
    try { await logoutSession(); }
    catch { setLoggingOut(false); toast.error("Unable to log out. Please try again."); }
  }

  return <div className="min-h-screen bg-[#f2f2f2]">
    <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-[288px] flex-col bg-[#a48734] p-5 text-white transition-transform lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
      <button aria-label="Close menu" onClick={() => setOpen(false)} className="absolute right-4 top-4 lg:hidden"><X /></button>
      <div className="mb-10 mt-5"><Brand compact /></div>
      <nav className="space-y-2">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} className={cn("flex h-12 items-center gap-3 rounded-md px-3 text-base font-medium transition hover:bg-white/15", path === href && "bg-[#cfb067]")}><Icon size={20} />{label}</Link>)}</nav>
      <Dialog.Root open={confirmLogout} onOpenChange={value => { if (!loggingOut) setConfirmLogout(value); }}>
        <Dialog.Trigger asChild><button className="mt-auto flex h-12 items-center gap-3 rounded-md px-3 text-left hover:bg-white/15"><LogOut size={20} />Log out</button></Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/60" />
          <Dialog.Content onOpenAutoFocus={event => { event.preventDefault(); document.getElementById("cancel-logout")?.focus(); }} className="fixed left-1/2 top-1/2 z-[81] w-[calc(100%_-_2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
            <Dialog.Title className="text-xl font-semibold text-slate-800">Log out?</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-slate-600">Are you sure you want to log out of your account?</Dialog.Description>
            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild><Button id="cancel-logout" variant="outline" disabled={loggingOut}>No</Button></Dialog.Close>
              <Button onClick={confirmSignOut} disabled={loggingOut}>{loggingOut ? "Logging out…" : "Yes"}</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </aside>
    {open && <button aria-label="Close menu" className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
    <div className="lg:pl-[288px]">
      <header className="sticky top-0 z-30 flex h-[84px] items-center border-b bg-white px-5 sm:px-10">
        <button aria-label="Open menu" onClick={() => setOpen(true)} className="mr-4 lg:hidden"><Menu /></button>
        <div className="flex items-center gap-2 text-sm sm:text-base"><Home size={21} /><span className="text-slate-500">Home</span><span className="text-slate-400">›</span><strong>{names[key]}</strong></div>
        <Link href="/profile" className="ml-auto flex size-11 items-center justify-center overflow-hidden rounded-full border bg-[#f7f0df]">{data?.user?.image ? <img src={data.user.image} alt={data.user.name || "Admin"} className="size-full object-cover" /> : <CircleUserRound className="text-[#a48734]" />}</Link>
      </header>
      <main className="min-h-[calc(100vh-84px)] p-4 sm:p-7 lg:p-10">{children}</main>
    </div>
  </div>;
}
