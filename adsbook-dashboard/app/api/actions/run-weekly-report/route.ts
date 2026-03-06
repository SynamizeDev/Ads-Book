import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const CRON_SECRET = process.env.CRON_SECRET;

export async function POST() {
  try {
    const headers: Record<string, string> = {};
    if (CRON_SECRET) {
      headers["x-cron-secret"] = CRON_SECRET;
    }

    const res = await fetch(`${BACKEND_URL}/run-weekly-report`, {
      method: "POST",
      headers,
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

    return NextResponse.json({ success: true, message: "Weekly report sent successfully" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
