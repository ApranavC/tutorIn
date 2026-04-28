
import axios from "axios";

// Token generation is handled server-side via /api/generate-token
// to avoid crypto.subtle issues in browser (HTTP) contexts.
export const generateToken = async (): Promise<string> => {
    const res = await fetch("/api/generate-token");
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate VideoSDK token");
    }
    const data = await res.json();
    return data.token;
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
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            console.error("Error creating room:", error.response?.data || error.message);
            throw new Error(error.response?.data?.error || "Failed to create meeting room");
        }
        console.error("Error creating room:", error);
        throw new Error("Failed to create meeting room");
    }
};

export const fetchRecordings = async (roomId: string, tokenPromise: string | Promise<string>): Promise<Record<string, unknown>[]> => {
    try {
        const token = await tokenPromise;
        const url = `https://api.videosdk.live/v2/recordings?meetingId=${roomId}`;
        const response = await axios.get(url, {
            headers: {
                Authorization: `${token}`,
            },
        });
        return response.data.data || []; // Ensure array
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            console.error("Error fetching recordings:", error.response?.data || error.message);
        } else {
            console.error("Error fetching recordings:", error);
        }
        return [];
    }
};
