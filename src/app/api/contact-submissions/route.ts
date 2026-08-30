import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/ratelimit";

// Note: Database access is not implemented here because no customer
// database is connected in this environment. This handler focuses on
// validation, spam mitigation, and structured responses for the
// frontend. Persistence must be wired up once a database is attached.

interface ContactSubmissionBody {
  name?: string;
  email?: string;
  phone?: string | null;
  message?: string;
  source_page?: string;
  honeypot?: string;
}

function validate(body: ContactSubmissionBody) {
  const fieldErrors: Record<string, string> = {};

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  const phone = (body.phone ?? "").trim();
  const message = (body.message ?? "").trim();
  const sourcePage = (body.source_page ?? "").trim();

  if (!name) {
    fieldErrors.name = "Name is required";
  }

  if (!email) {
    fieldErrors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "Enter a valid email";
  }

  if (!message) {
    fieldErrors.message = "Message is required";
  } else if (message.length < 10) {
    fieldErrors.message = "Message must be at least 10 characters";
  }

  if (!sourcePage) {
    fieldErrors.source_page = "Source page is required";
  }

  return { fieldErrors, values: { name, email, phone, message, sourcePage } };
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.ip ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rate = await checkRateLimit(`contact-submissions:${ip}`, "email");
    if (!rate.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as ContactSubmissionBody;

    if (body.honeypot && body.honeypot.trim().length > 0) {
      return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
    }

    const { fieldErrors, values } = validate(body);

    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors },
        { status: 400 }
      );
    }

    // Persistence layer is intentionally omitted because the
    // environment has no attached database. When a database
    // is available, insert a new row into contact_submissions
    // with at least: name, email, phone, message, created_at,
    // and source_page (values.sourcePage).

    return NextResponse.json({ message: "Created" }, { status: 201 });
  } catch (error) {
    console.error("[contact-submissions] POST error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
