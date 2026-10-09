import { api, ApiResponse, Pagination, UserRecord } from "./api";

export interface AdminIdentity { id: string; adminRole: string; permissions: string[]; }
export interface OperationItem {
  _id: string; title?: string; name?: string; email?: string; adminRole?: string;
  user?: UserRecord; actor?: UserRecord; assignedTo?: UserRecord; reviewedBy?: UserRecord; resolvedBy?: UserRecord;
  alert?: { _id: string; title: string }; notes?: { body: string; actor?: UserRecord; at: string }[];
  type?: string; severity?: string; status?: string; verdict?: string; resolution?: string;
  kind?: string; source?: string; tool?: string; outcome?: string; reason?: string;
  action?: string; resource?: string; resourceId?: string;
  changes?: Record<string, string | boolean>;
  bankName?: string; nickname?: string; accountType?: string; isLocked?: boolean; lockedReason?: string;
  createdAt?: string; occurredAt?: string; resolvedAt?: string; firstActionAt?: string;
}
export interface Overview {
  days: number; from: string; to: string; generatedAt: string; trackingStartedAt: string | null;
  users: { total: number; emailVerified: number; emailVerifiedPercent: number; kycVerified: number; kycVerifiedPercent: number; newToday: number; new7: number; new30: number; dau: number; wau: number; mau: number };
  accounts: { active: number; bankLinkedUsers: number; bankLinkedPercent: number; banks: { bank: string; users: number; accounts: number }[] };
  alerts: { today: number; last7: number; last30: number; risk: { _id: string; count: number }[]; falsePositive: number; reviewed: number; falsePositiveRate: number; averageResponseMs: number | null; responseSampleCount: number };
  panics: { today: number; open: number }; cases: { open: number; resolved: number }; protectiveActions: number;
  verification: { usage: { _id: string; count: number }[]; sources: { _id: string; count: number }[] };
  learning: { started: number; completed: number; incomplete: number; averageDurationMs: number | null; additionalQuestionUsers: number; attempts: number; popular: { _id: string; title: string; users: number; attempts: number }[] };
  availability: { service: string; samples: number; percent: number; lastCheckedAt: string }[];
  trends: { date: string; newUsers: number; activeUsers: number; alerts: number; panics: number; protective: number; resolvedCases: number; confirmed: number }[];
}
export interface Health { generatedAt: string; services: { service: string; uptime: number; available: boolean; samples: number; checkedAt: string; latencyMs: number }[]; trends: { service: string; date: string; uptime: number }[]; measurement: string; }
export const getAdminIdentity = () => api.get<ApiResponse<AdminIdentity>>("/admin/me").then(r => r.data.data);
export const getOverview = (days: number) => api.get<ApiResponse<Overview>>("/admin/dashboard/overview", { params: { days } }).then(r => r.data.data);
export const getOperations = (section: string, filters: Record<string, string | number>) => api.get<ApiResponse<{ items: OperationItem[]; pagination: Pagination }>>(`/admin/${section}`, { params: filters }).then(r => r.data.data);
export const updateOperation = (section: string, id: string, payload: Record<string, string>) => api.patch(`/admin/${section}/${id}${section === "staff" ? "/role" : ""}`, payload).then(r => r.data);
export const createCase = (payload: Record<string, string>) => api.post("/admin/cases", payload).then(r => r.data);
export const getOperators = () => api.get<ApiResponse<UserRecord[]>>("/admin/cases/operators").then(r => r.data.data);
export const getHealth = (days: number) => api.get<ApiResponse<Health>>("/admin/health", { params: { days } }).then(r => r.data.data);
export const getUserOverview = (id: string) => api.get<ApiResponse<{ user: UserRecord; age: number | null; accountCount: number; accounts: OperationItem[]; alerts: OperationItem[]; cases: OperationItem[]; emergencies: { _id: string; status: string; activatedAt: string; resolvedAt?: string; clearedByRole?: string }[] }>>(`/admin/users/${id}/overview`).then(r => r.data.data);
