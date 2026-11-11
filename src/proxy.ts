import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

const NATIVE_ORIGINS = [
  "https://localhost",
  "http://localhost",
  "capacitor://localhost",
  "ionic://localhost",
];

function allowedOrigins(): string[] {
  const extra = (process.env.CAPACITOR_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return [...NATIVE_ORIGINS, ...extra];
}

function withNativeCors(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins().includes(origin)) return response;
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Vary", "Origin");
  return response;
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/") && request.method === "OPTIONS") {
    return withNativeCors(request, new NextResponse(null, { status: 204 }));
  }
  const response = await updateSession(request);
  if (request.nextUrl.pathname.startsWith("/api/")) return withNativeCors(request, response);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|splash/|screenshots/|sw.js|offline.html|\\.well-known/|manifest.webmanifest|.*\\.png$).*)"],
};
