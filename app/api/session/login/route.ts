import { NextResponse } from "next/server";

const LOCAL_USERS = {
  "logisticos@gmail.com": {
    password: "123456",
    contractor: "Logisticos",
    isAdmin: true,
    isPeople: true,
    isPresentation: true,
    sessionValue: "logisticos",
  },
  "people@transporte.com": {
    password: "123456",
    contractor: "People",
    isAdmin: false,
    isPeople: true,
    sessionValue: "people",
  },
  "admin@gmail.com": {
    password: "123456",
    contractor: "Admin",
    isAdmin: true,
    isPeople: false,
    sessionValue: "admin",
  },
} as const;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const user = LOCAL_USERS[email as keyof typeof LOCAL_USERS];

  if (!user || user.password !== password) {
    return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
  }

  const response = NextResponse.json({
    contractor: user.contractor,
    email,
    isAdmin: user.isAdmin,
    isPeople: user.isPeople,
    isPresentation: "isPresentation" in user && user.isPresentation,
  });
  response.cookies.set("local_session", user.sessionValue, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: body.remember ? 60 * 60 * 24 * 30 : undefined,
  });
  return response;
}
