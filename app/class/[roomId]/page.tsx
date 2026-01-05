
"use client";
import { Suspense } from "react";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { generateToken } from "../../../lib/videoService";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { db } from "../../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

function ClassRoomContent() {
    const { roomId } = useParams();
    const searchParams = useSearchParams();
    const classId = searchParams.get("classId");
    const courseId = searchParams.get("courseId");
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    const [meetingUrl, setMeetingUrl] = useState("");
    const [classStatus, setClassStatus] = useState<"loading" | "active" | "ended" | "not_found">("loading");
    const [classDetails, setClassDetails] = useState<any>(null);

    // Handle Browser Back Button
    useEffect(() => {
        // Push a state so we can trap the back button
        window.history.pushState(null, "", window.location.href);

        const handlePopState = (event: PopStateEvent) => {
            // Prevent default back behavior and redirect to dashboard
            event.preventDefault();
            let dashboardUrl = profile?.role === "teacher"
                ? "/teacher/dashboard"
                : "/student/dashboard";

            if (courseId) {
                dashboardUrl += `?courseId=${courseId}`;
            }
            router.replace(dashboardUrl);
        };

        window.addEventListener("popstate", handlePopState);

        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, [router, profile]);


    useEffect(() => {
        const initMeeting = async () => {
            if (!user) {
                router.push("/login");
                return;
            }

            console.log("Debug: Class ID from params:", classId);

            // Check Class Status
            if (classId) {
                try {
                    const classRef = doc(db, "classes", classId);
                    const classSnap = await getDoc(classRef);

                    if (classSnap.exists()) {
                        const classData = classSnap.data();
                        console.log("Debug: Class Data:", classData);

                        if (classData.status !== "active") {
                            setClassStatus("ended");
                            return; // Stop here, don't generate token
                        }
                        setClassStatus("active");
                        setClassDetails(classData);
                    } else {
                        console.error("Class not found");
                        setClassStatus("not_found");
                        return;
                    }
                } catch (err) {
                    console.error("Error checking class status:", err);
                }
            } else {
                // Fallback if no classId provided (e.g. direct link test)
                // We allow it but warn or maybe strictly require classId?
                // For now, let's allow it but log it.
                console.warn("No classId provided in URL");
                setClassStatus("active"); // Assume active if direct link for now/testing
            }

            try {
                const token = await generateToken();
                const name = profile?.displayName || user.email?.split("@")[0] || "User";

                // Permissions & Params based on Role
                const isTeacher = profile?.role === "teacher";



                // Determine redirect URL
                let redirectUrl = window.location.origin;
                if (classId) {
                    // Ensure classId is valid string
                    if (isTeacher) {
                        redirectUrl = `${window.location.origin}/teacher/class/${classId}/finish`;
                    } else {
                        redirectUrl = `${window.location.origin}/student/class/${classId}/rate`;
                    }
                    if (courseId) {
                        redirectUrl += `?courseId=${courseId}`;
                    }
                } else {
                    // Default fallback redirects
                    if (isTeacher) {
                        redirectUrl = `${window.location.origin}/teacher/dashboard`;
                    } else {
                        redirectUrl = `${window.location.origin}/student/dashboard`;
                    }
                    if (courseId) {
                        redirectUrl += `?courseId=${courseId}`;
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

                    // Participant Control
                    canRemoveOtherParticipant: isTeacher ? "true" : "false",

                    // Video Settings (Fitting)
                    maintainVideoAspectRatio: "true",
                    maintainLandscapeVideoAspectRatio: "true",

                    // UI Customization (Optional)
                    joinScreenEnabled: isTeacher ? "true" : "false",
                    joinWithoutUserInteraction: isTeacher ? "false" : "true",
                    notificationSoundEnabled: "false",
                    notificationAlertsEnabled: "false",
                    leftScreenDisabled: "true",
                    reduceEdgeSpacing: "true",
                    brandingEnabled: "false",
                    poweredBy: "false",
                    redirectOnLeave: redirectUrl,
                });

                const url = `https://embed.videosdk.live/rtc-js-prebuilt/0.3.43/?${params.toString()}`;
                setMeetingUrl(url);
            } catch (e) {
                console.error("Failed to generate token", e);
            }
        };

        if (user && !loading) {
            initMeeting();
        }
    }, [user, profile, loading, roomId, router, classId]); // Added classId dependency

    // Screen Wake Lock
    useEffect(() => {
        let wakeLock: any = null;

        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    // Cast to any to avoid TS errors if types are missing
                    wakeLock = await (navigator as any).wakeLock.request('screen');
                    console.log('Wake Lock is active');
                }
            } catch (err: any) {
                console.warn(`Wake Lock Error: ${err.name}, ${err.message}`);
            }
        };

        const handleVisibilityChange = () => {
            if (wakeLock !== null && document.visibilityState === 'visible') {
                requestWakeLock();
            }
        };

        // Only request if class is active or loading
        if (classStatus === "active" || classStatus === "loading") {
            requestWakeLock();
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (wakeLock !== null) {
                wakeLock.release();
                wakeLock = null;
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [classStatus]);

    if (loading) return <div className="h-screen flex items-center justify-center">Loading User Data...</div>;

    if (classStatus === "ended") {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-gray-100">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">Class Ended</h1>
                <p className="text-gray-600 mb-6">This class session has already ended.</p>
                <button
                    onClick={() => window.history.back()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    if (classStatus === "not_found") {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-gray-100">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">Class Not Found</h1>
                <button
                    onClick={() => window.history.back()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    if (!meetingUrl) return <div className="h-screen flex items-center justify-center">Preparing Class Environment...</div>;

    return (
        <div className="flex flex-col landscape:flex-row h-[100dvh] w-full bg-gray-950 overflow-hidden">

            {/* Left Sidebar (Landscape) / Top Bar (Portrait) 
                In Landscape: Takes remaining space (flex-1).
                In Portrait: Fixed height header.
            */}
            <aside className="
                flex-shrink-0 
                w-full landscape:w-12
                bg-gray-900 border-b landscape:border-b-0 landscape:border-r border-gray-800
                p-2 flex landscape:flex-col items-center justify-between landscape:justify-start landscape:items-center transition-all gap-4"
            >
                {/* Branding / Back Button */}
                <div className="flex flex-row landscape:flex-col items-center gap-4">
                    <button
                        onClick={() => window.history.back()}
                        className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg"
                        title="Back to Dashboard"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
                    </button>

                    {/* Minimal Branding Icon only */}
                    <div className="hidden landscape:flex flex-col items-center text-gray-500">
                        <span className="font-bold text-xs tracking-widest rotate-180" style={{ writingMode: 'vertical-rl' }}>TUTORIN</span>
                    </div>
                </div>

                {/* Mobile Portrait Header Content (Title still useful on Portrait top bar?) 
                    User said "keep nav bar as only buttons". 
                    In portrait it is a top bar. Let's keep title in Portrait only for context, hide in landscape.
                */}
                <div className="block landscape:hidden text-white font-bold text-sm truncate">
                    {classDetails?.title}
                </div>
            </aside>

            {/* Video Container 
                Landscape: Height 100%, Width aspect-video (16:9). 
                           If screen is ultra-wide layout, sidebar takes rest.
                           If screen is 4:3 (iPad), sidebar shrinks or video shrinks?
                           We want video to be PRIMARY fixed ratio.
                Portrait:  Flex-1 (takes remaining height), Width 100%.
            */}
            <main className="
                relative
                w-full landscape:h-full landscape:w-auto
                flex-1
                bg-black shadow-2xl z-10"
            >
                <iframe
                    src={meetingUrl}
                    allow="camera; microphone; fullscreen; display-capture; clipboard-read; clipboard-write"
                    width="100%"
                    height="100%"
                    className="border-0 w-full h-full"
                    title="VideoSDK Meeting"
                ></iframe>
            </main>
        </div>
    );
}

// Wrap in Suspense for Next.js build requirement
export default function ClassRoom() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center bg-gray-950 text-white">Loading Class...</div>}>
            <ClassRoomContent />
        </Suspense>
    );
}
