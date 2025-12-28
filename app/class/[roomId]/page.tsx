
"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { generateToken } from "../../../lib/videoService";
import { useParams, useRouter, useSearchParams } from "next/navigation";

export default function ClassRoom() {
    const { roomId } = useParams();
    const searchParams = useSearchParams();
    const classId = searchParams.get("classId");
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [meetingUrl, setMeetingUrl] = useState("");


    useEffect(() => {
        const initMeeting = async () => {
            if (!loading) {
                if (!user) {
                    router.push("/login");
                    return;
                }

                try {
                    const token = await generateToken();
                    const name = profile?.displayName || user.email?.split("@")[0] || "User";

                    // Permissions & Params based on Role
                    const isTeacher = profile?.role === "teacher";

                    // Determine redirect URL
                    let redirectUrl = window.location.origin;
                    if (classId) {
                        if (isTeacher) {
                            redirectUrl = `${window.location.origin}/teacher/class/${classId}/finish`;
                        } else {
                            redirectUrl = `${window.location.origin}/student/class/${classId}/rate`;
                        }
                    }
                    console.log("Redirect URL set to:", redirectUrl);

                    const params = new URLSearchParams({
                        name: name,
                        participantId: name, // User requested name to be the participantId
                        meetingId: roomId as string,
                        token: token,
                        micEnabled: isTeacher ? "true" : "false",
                        webcamEnabled: isTeacher ? "true" : "false",
                        participantCanToggleSelfWebcam: "true",
                        participantCanToggleSelfMic: "true",
                        chatEnabled: "true",
                        raiseHandEnabled: "true",

                        // Polls: Everyone sees polls, only teacher creates them
                        pollEnabled: "true",
                        canCreatePoll: isTeacher ? "true" : "false",

                        // Layout: Only teacher can change layout
                        canChangeLayout: isTeacher ? "true" : "false",
                        canPin: isTeacher ? "true" : "false",

                        // Teacher specific
                        screenShareEnabled: isTeacher ? "true" : "false",
                        participantCanToggleOtherWebcam: isTeacher ? "true" : "false", // Teacher can toggle others
                        participantCanToggleOtherMic: isTeacher ? "true" : "false",
                        participantCanEndMeeting: isTeacher ? "true" : "false",
                        whiteboardEnabled: isTeacher ? "true" : "false",
                        canToggleWhiteboard: isTeacher ? "true" : "false",
                        canDrawOnWhiteboard: isTeacher ? "true" : "false",

                        // UI Customization (Optional)
                        joinScreenEnabled: "true", // Let them check mic/cam before joining
                        leftScreenDisabled: "false",
                        redirectOnLeave: redirectUrl,
                    });

                    const url = `https://embed.videosdk.live/rtc-js-prebuilt/0.3.43/?${params.toString()}`;
                    setMeetingUrl(url);
                } catch (e) {
                    console.error("Failed to generate token", e);
                }
            }
        };

        initMeeting();
    }, [user, profile, loading, roomId, router]);

    if (loading || !meetingUrl) return <div className="h-screen flex items-center justify-center">Loading Class...</div>;

    return (
        <div className="h-[100dvh] w-full bg-black">
            <iframe
                src={meetingUrl}
                allow="camera; microphone; fullscreen; display-capture; clipboard-read; clipboard-write"
                width="100%"
                height="100%"
                className="border-0"
                title="VideoSDK Meeting"
            ></iframe>
        </div>
    );
}
