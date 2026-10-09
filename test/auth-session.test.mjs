import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import axios, { AxiosError } from "axios";

async function loadSource(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace('from "axios"', `from ${JSON.stringify(import.meta.resolve("axios"))}`);
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}
const { refreshAccessToken, tokenExpiry, ensureAccessToken } = await loadSource("../lib/token-refresh.ts");
const { installAuthInterceptors } = await loadSource("../lib/auth-interceptors.ts");
const jwt = exp => `header.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.signature`;
const fresh = jwt(Math.floor(Date.now() / 1000) + 3600);
const session = accessToken => ({ accessToken, user: {}, expires: "2099-01-01" });

test("refresh uses one backend call for concurrent sessions and clears tokens on failure", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    await new Promise(resolve => setTimeout(resolve, 10));
    return Response.json({ success: true, data: { accessToken: fresh } });
  };
  try {
    const token = { accessToken: "expired", refreshToken: "valid-refresh" };
    const results = await Promise.all([refreshAccessToken(token, "https://api.example.test"), refreshAccessToken(token, "https://api.example.test")]);
    assert.equal(calls, 1);
    assert.equal(results[0].accessToken, fresh);
    assert.equal(results[0].refreshToken, "valid-refresh");
    assert.equal(results[0].accessTokenExpires, tokenExpiry(fresh));
    const missing = await refreshAccessToken({ accessToken: "expired" }, "https://api.example.test");
    assert.equal(missing.error, "RefreshTokenError");
    assert.equal(missing.accessToken, undefined);
    globalThis.fetch = async () => Response.json({ success: false }, { status: 401 });
    const invalid = await refreshAccessToken({ accessToken: "expired", refreshToken: "invalid-refresh" }, "https://api.example.test");
    assert.equal(invalid.error, "RefreshTokenError");
    assert.equal(invalid.refreshToken, undefined);
    assert.equal(invalid.accessToken, undefined);
  } finally { globalThis.fetch = original; }
});
test("session checks refresh expired tokens, preserve valid tokens and support forced refresh", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ success: true, data: { accessToken: fresh } }); };
  try {
    const valid = { accessToken: fresh, refreshToken: "session-valid" };
    assert.equal((await ensureAccessToken(valid, "https://api.example.test")).accessToken, fresh);
    assert.equal(calls, 0);
    await ensureAccessToken(valid, "https://api.example.test", true);
    assert.equal(calls, 1);
    const expired = { accessToken: jwt(1), refreshToken: "session-expired" };
    assert.equal((await ensureAccessToken(expired, "https://api.example.test")).accessToken, fresh);
    assert.equal(calls, 2);
    const failed = { error: "RefreshTokenError", refreshToken: "session-failed" };
    assert.equal((await ensureAccessToken(failed, "https://api.example.test")).error, "RefreshTokenError");
    assert.equal(calls, 2);
  } finally { globalThis.fetch = original; }
});

function setup({ refreshSucceeds = true, retrySucceeds = true, status = 401, missingSession = false } = {}) {
  let current = missingSession ? null : session("old-access");
  let refreshCalls = 0;
  let logoutCalls = 0;
  let requests = 0;
  const api = axios.create({ adapter: async config => {
    requests++;
    if (config.headers.Authorization === "Bearer new-access" && retrySucceeds) return { data: "ok", status: 200, statusText: "OK", headers: {}, config };
    throw new AxiosError("Rejected", "ERR_BAD_REQUEST", config, null, { data: {}, status, statusText: "Rejected", headers: {}, config });
  } });
  installAuthInterceptors(api, {
    enabled: () => true,
    getSession: async () => current,
    refreshSession: async () => {
      refreshCalls++;
      await new Promise(resolve => setTimeout(resolve, 10));
      current = refreshSucceeds ? session("new-access") : null;
      return current;
    },
    logout: async () => { logoutCalls++; },
  });
  return { api, counts: () => ({ refreshCalls, logoutCalls, requests }) };
}
test("concurrent 401 requests share refresh and retry with the new token", async () => {
  const { api, counts } = setup();
  const responses = await Promise.all([api.get("/users/profile"), api.get("/learnings")]);
  assert.equal(responses[0].data, "ok");
  assert.deepEqual(counts(), { refreshCalls: 1, logoutCalls: 0, requests: 4 });
});
test("failed refresh logs out once without retrying requests", async () => {
  const { api, counts } = setup({ refreshSucceeds: false });
  await Promise.allSettled([api.get("/users/profile"), api.get("/learnings")]);
  assert.deepEqual(counts(), { refreshCalls: 1, logoutCalls: 1, requests: 2 });
});
test("a second 401 logs out instead of entering a refresh loop", async () => {
  const { api, counts } = setup({ retrySucceeds: false });
  await assert.rejects(api.get("/users/profile"));
  assert.deepEqual(counts(), { refreshCalls: 1, logoutCalls: 1, requests: 2 });
});
test("public login errors and forbidden requests never trigger refresh or logout", async () => {
  const publicRequest = setup();
  await assert.rejects(publicRequest.api.post("/auth/login"));
  assert.deepEqual(publicRequest.counts(), { refreshCalls: 0, logoutCalls: 0, requests: 1 });
  const forbidden = setup({ status: 403 });
  await assert.rejects(forbidden.api.get("/users/profile"));
  assert.deepEqual(forbidden.counts(), { refreshCalls: 0, logoutCalls: 0, requests: 1 });
});
test("missing session logs out before sending a protected request", async () => {
  const { api, counts } = setup({ missingSession: true });
  await assert.rejects(api.get("/users/profile"), error => error.code === "AUTH_SESSION_EXPIRED");
  assert.deepEqual(counts(), { refreshCalls: 0, logoutCalls: 1, requests: 0 });
});
