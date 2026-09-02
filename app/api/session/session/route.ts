import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const LOCAL_SESSIONS = {
  logisticos: {
    contractor: "Logisticos",
    email: "logisticos@gmail.com",
    isAdmin: false,
    isPeople: false,
  },
  people: {
    contractor: "People",
    email: "people@transporte.com",
    isAdmin: false,
    isPeople: true,
  },
  admin: {
    contractor: "Admin",
    email: "admin@gmail.com",
    isAdmin: true,
    isPeople: false,
  },
} as const;

export async function GET() {
  const sessionValue = (await cookies()).get("local_session")?.value;
  const session = LOCAL_SESSIONS[sessionValue as keyof typeof LOCAL_SESSIONS];

  if (!session) {
    return NextResponse.json({ error: "Sin sesión." }, { status: 401 });
  }

  return NextResponse.json({ session });
}
