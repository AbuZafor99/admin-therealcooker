import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function apiError(error: unknown) { if (typeof error === "object" && error && "response" in error) { const response = (error as { response?: { data?: { message?: string } } }).response; return response?.data?.message || "Something went wrong"; } return error instanceof Error ? error.message : "Something went wrong"; }
export function formatDate(value?: string) { if (!value) return "—"; return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value)); }
