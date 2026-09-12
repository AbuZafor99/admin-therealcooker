"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter(); const params = useSearchParams(); const [show, setShow] = useState(false); const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); setLoading(true); const form = new FormData(e.currentTarget); const result = await signIn("credentials", { email: form.get("email"), password: form.get("password"), redirect: false }); setLoading(false); if (result?.error) return toast.error(result.error.includes("CredentialsSignin") ? "Invalid email or password" : result.error); toast.success("Welcome back"); router.replace(params.get("callbackUrl") || "/dashboard"); }
  return <AuthShell title="Welcome" subtitle="Sign in to continue to the admin dashboard"><form onSubmit={submit} className="space-y-4"><label className="block text-sm text-slate-700">Email address<Input name="email" type="email" autoComplete="email" required placeholder="you@gmail.com" className="mt-2" /></label><label className="block text-sm text-slate-700">Password<div className="relative mt-2"><Input name="password" type={show ? "text" : "password"} autoComplete="current-password" required placeholder="••••••••" className="pr-11"/><button type="button" onClick={() => setShow(v => !v)} aria-label="Toggle password" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{show ? <EyeOff size={20}/> : <Eye size={20}/>}</button></div></label><div className="flex items-center justify-between text-sm"><label className="flex items-center gap-2 text-slate-500"><input type="checkbox" className="accent-[#caa85a]"/> Remember me</label><Link href="/forgot-password" className="text-[#b28d3d] hover:underline">Forgot password?</Link></div><Button disabled={loading} size="lg" className="mt-6 w-full">{loading ? "Signing in…" : "Log In"}</Button></form></AuthShell>;
}
