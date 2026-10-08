"use client";
import { useQuery } from "@tanstack/react-query";
import { getAdminIdentity } from "@/lib/operations-api";
export function useAdminAccess() {
  const query = useQuery({ queryKey: ["admin-identity"], queryFn: getAdminIdentity, staleTime: 30_000, refetchInterval: 30_000 });
  const can = (permission: string) => Boolean(query.data?.permissions.some(p => p === "*" || p === permission));
  return { ...query, can };
}
