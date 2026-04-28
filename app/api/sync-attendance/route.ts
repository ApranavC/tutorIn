import { NextResponse } from "next/server";
import { generateToken } from "../../../lib/videoService";
import { db } from "../../../lib/firebase"; // Default export from lib/firebase is db? No, usually named exports. I need to check firebase lib.
import { doc, updateDoc } from "firebase/firestore";

// I need to verify imports from lib/firebase.
// Checking previous files... `import { db, auth } from "../../../lib/firebase";` in student dashboard.
// So named import `db` is correct.

export async function POST(request: Request) {
    try {
        const { roomId, classId } = await request.json();

        if (!roomId || !classId) {
            return NextResponse.json({ error: "Missing roomId or classId" }, { status: 400 });
        }

        // 1. Generate Token
        const token = await generateToken();

        // 2. Fetch Sessions from VideoSDK
        // Fetching with a large perPage to get all sessions (if multiple)
        const url = `https://api.videosdk.live/v2/sessions/?roomId=${roomId}&perPage=20`;
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": token,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`VideoSDK API Error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        const sessions = data.data; // Array of sessions

        if (!sessions || sessions.length === 0) {
            return NextResponse.json({ message: "No sessions found for this room yet." });
        }

        // 3. Process Data: Aggregate duration per participant
        // Map<participantName, { totalMinutes, sessions: [] }>
        // Actually we prefer UID if possible, but VideoSDK only knows "name" or "participantId".
        // In our generateToken, we set participantId = name. 
        // So we will key by name (which acts as ID here).

        const participantStats: Record<string, {
            name: string,
            totalDurationMinutes: number,
            events: { start: string, end: string }[]
        }> = {};

        sessions.forEach((session: Record<string, unknown>) => {
            if (session.participants) {
                (session.participants as Record<string, unknown>[]).forEach((p: Record<string, unknown>) => {
                    const name = p.name as string;
                    if (!participantStats[name]) {
                        participantStats[name] = {
                            name: name,
                            totalDurationMinutes: 0,
                            events: []
                        };
                    }

                    if (p.timelog) {
                        (p.timelog as Record<string, unknown>[]).forEach((log: Record<string, unknown>) => {
                            const start = new Date(log.start as string).getTime();
                            const end = new Date(log.end as string).getTime();
                            const durationMs = end - start;
                            const durationMins = durationMs / 1000 / 60;

                            if (durationMins > 0) {
                                participantStats[name].totalDurationMinutes += durationMins;
                                participantStats[name].events.push({
                                    start: log.start as string,
                                    end: log.end as string
                                });
                            }
                        });
                    }
                });
            }
        });

        // Convert to array
        const timeline = Object.values(participantStats).map(stat => ({
            name: stat.name,
            duration: Math.round(stat.totalDurationMinutes * 10) / 10, // Round to 1 decimal
            events: stat.events
        }));

        // 4. Update Firestore
        const classRef = doc(db, "classes", classId);
        await updateDoc(classRef, {
            timeline: timeline,
            timelineLastSynced: new Date().toISOString()
        });

        return NextResponse.json({ success: true, timeline });

    } catch (error: unknown) {
        console.error("Sync Attendance Error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
    }
}
