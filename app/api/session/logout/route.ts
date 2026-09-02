import { NextResponse } from "next/server";export async function POST(){const x=NextResponse.json({ok:true});x.cookies.delete("local_session");return x}
