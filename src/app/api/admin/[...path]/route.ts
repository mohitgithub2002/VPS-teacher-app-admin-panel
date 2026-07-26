/**
 * Backend-for-frontend for the Admin API.
 *
 * The browser only ever talks to this same-origin route, which means the
 * httpOnly `session` cookie behaves normally — no CORS preflights and no
 * third-party cookie problems.
 *
 *   ADMIN_API_BASE_URL set   → forward verbatim to the real Admin API
 *   ADMIN_API_BASE_URL unset → serve the bundled demo dataset
 */

import { NextResponse, type NextRequest } from "next/server";

import { handleMockRequest } from "@/server/mock/handler";

const UPSTREAM = process.env.ADMIN_API_BASE_URL?.replace(/\/$/, "");
const SESSION_COOKIE = process.env.ADMIN_SESSION_COOKIE ?? "session";
const SESSION_MAX_AGE = 60 * 60 * 12;

export const dynamic = "force-dynamic";

async function handle(request: NextRequest, path: string[]) {
  const search = request.nextUrl.searchParams;
  const method = request.method.toUpperCase();

  let body: Record<string, unknown> | null = null;
  if (method !== "GET" && method !== "HEAD") {
    const raw = await request.text();
    if (raw) {
      try {
        body = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return NextResponse.json({ error: "malformed JSON body" }, { status: 400 });
      }
    }
  }

  if (UPSTREAM) {
    return proxy(request, path, body, method);
  }

  const result = handleMockRequest(
    method,
    path,
    search,
    body,
    Boolean(request.cookies.get(SESSION_COOKIE)?.value),
  );

  const response = NextResponse.json(
    result.error ? { error: result.error } : { data: result.data ?? null },
    { status: result.status },
  );

  if (result.setSession) {
    response.cookies.set(SESSION_COOKIE, "demo-admin-session", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
  }

  if (result.clearSession) {
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}

async function proxy(
  request: NextRequest,
  path: string[],
  body: Record<string, unknown> | null,
  method: string,
) {
  const query = request.nextUrl.search;
  const target = `${UPSTREAM}/${path.map(encodeURIComponent).join("/")}${query}`;
  const cookie = request.headers.get("cookie");

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: body === null ? undefined : JSON.stringify(body),
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "the admin API is unreachable" },
      { status: 502 },
    );
  }

  const text = await upstream.text();
  const payload = text
    ? safeParse(text)
    : { error: upstream.ok ? undefined : "empty response from the admin API" };

  const response = NextResponse.json(payload, { status: upstream.status });

  // Pass the upstream session cookie through to the browser unchanged.
  const setCookies =
    typeof upstream.headers.getSetCookie === "function"
      ? upstream.headers.getSetCookie()
      : [upstream.headers.get("set-cookie")].filter(Boolean as unknown as (v: string | null) => v is string);

  for (const value of setCookies) {
    response.headers.append("set-cookie", value);
  }

  return response;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { error: "the admin API returned a non-JSON response" };
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return handle(request, path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return handle(request, path);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return handle(request, path);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return handle(request, path);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return handle(request, path);
}
