import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const CRON_SECRET = process.env.CRON_SECRET;

export async function POST() {
  if (!CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET not configured on server" }, { status: 500 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/run-alert-engine`, {
      method: "POST",
      headers: {
        "x-cron-secret": CRON_SECRET,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      let errorMessage = `Backend error ${res.status}`;
      try {
        const json = JSON.parse(body);
        errorMessage = json.error || json.message || errorMessage;
      } catch {
        errorMessage = body || errorMessage;
      }
      return NextResponse.json({ error: errorMessage }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "Alert engine triggered successfully" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
