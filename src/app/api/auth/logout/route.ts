import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully",
  });

  response.cookies.set("anachak_token", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return response;
}
