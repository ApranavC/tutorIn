
import { SignJWT } from "jose";
import axios from "axios";

// NOTE: In a production app, token generation should happen on the server.
// For this "Zero-Backend" demo, we generate it here using the API Secret.
export const generateToken = async (): Promise<string> => {
    const API_KEY = process.env.NEXT_PUBLIC_VIDEOSDK_API_KEY;
    const SECRET_KEY = process.env.NEXT_PUBLIC_VIDEOSDK_SECRET_KEY;

    if (!API_KEY || !SECRET_KEY) {
        throw new Error("VideoSDK API Key or Secret Key is missing");
    }

    const secret = new TextEncoder().encode(SECRET_KEY);

    const jwt = await new SignJWT({
        apikey: API_KEY,
        permissions: ["allow_join", "allow_mod"],
        version: 2,
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('120m')
        .sign(secret);

    return jwt;
};

export const createRoom = async (tokenPromise: string | Promise<string>): Promise<string> => {
    try {
        const token = await tokenPromise; // Handle both string and promise
        const url = `https://api.videosdk.live/v2/rooms`;
        const response = await axios.post(url, {}, {
            headers: {
                Authorization: `${token}`,
                "Content-Type": "application/json",
            },
        });
        return response.data.roomId;
    } catch (error: any) {
        console.error("Error creating room:", error.response?.data || error.message);
        throw new Error(error.response?.data?.error || "Failed to create meeting room");
    }
};

export const fetchRecordings = async (roomId: string, tokenPromise: string | Promise<string>): Promise<any[]> => {
    try {
        const token = await tokenPromise;
        const url = `https://api.videosdk.live/v2/recordings?meetingId=${roomId}`;
        const response = await axios.get(url, {
            headers: {
                Authorization: `${token}`,
            },
        });
        return response.data.data || []; // Ensure array
    } catch (error: any) {
        console.error("Error fetching recordings:", error.response?.data || error.message);
        return [];
    }
};
