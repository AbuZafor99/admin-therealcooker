"use client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell"; import { Input } from "@/components/ui/input"; import { Button } from "@/components/ui/button"; import { forgotPassword } from "@/lib/api"; import { apiError } from "@/lib/utils";
export default function ForgotPage() { const router = useRouter(); const mutation = useMutation({ mutationFn: forgotPassword, onSuccess: (_, email) => { toast.success("OTP sent to your email"); router.push(`/verify-email?email=${encodeURIComponent(email)}`); }, onError: e => toast.error(apiError(e)) }); return <AuthShell title="Forgot Password" subtitle="Enter your email to recover your password"><form onSubmit={e => { e.preventDefault(); mutation.mutate(String(new FormData(e.currentTarget).get("email"))); }} className="space-y-10"><div className="relative"><Mail className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"/><Input name="email" required type="email" placeholder="Enter your email" className="pl-12"/></div><Button disabled={mutation.isPending} size="lg" className="w-full">{mutation.isPending ? "Sending…" : "Send OTP"}</Button></form></AuthShell>; }
