import { NextResponse } from "next/server";
import { SignJWT } from "jose";

export async function GET() {
    const API_KEY = process.env.NEXT_PUBLIC_VIDEOSDK_API_KEY;
    const SECRET_KEY = process.env.NEXT_PUBLIC_VIDEOSDK_SECRET_KEY;

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
