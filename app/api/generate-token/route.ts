import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { headers } from "next/headers";

export async function GET() {
    const headersList = await headers();
    const referer = headersList.get("referer") || "";
    const host = headersList.get("host") || "";

    if (referer) {
        let refererHost = "";
        try {
            refererHost = new URL(referer).host;
        } catch {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
        if (refererHost !== host) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
    }

    // Server-only secrets — must NOT be prefixed with NEXT_PUBLIC_.
    // Fall back to the legacy public names so existing deployments keep working
    // until operators rotate the secret and rename the env var.
    const API_KEY = process.env.VIDEOSDK_API_KEY || process.env.NEXT_PUBLIC_VIDEOSDK_API_KEY;
    const SECRET_KEY = process.env.VIDEOSDK_SECRET_KEY || process.env.NEXT_PUBLIC_VIDEOSDK_SECRET_KEY;

    if (!API_KEY || !SECRET_KEY) {
        return NextResponse.json(
            { error: "VideoSDK API Key or Secret Key is missing" },
            { status: 500 }
        );
    }

    const secret = new TextEncoder().encode(SECRET_KEY);

    const jwt = await new SignJWT({
        apikey: API_KEY,
        permissions: ["allow_join", "allow_mod"],
        version: 2,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("120m")
        .sign(secret);

    return NextResponse.json({ token: jwt });
}
