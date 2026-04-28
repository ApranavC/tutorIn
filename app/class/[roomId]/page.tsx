
"use client";
import { Suspense } from "react";
export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
// import { generateToken } from "../../../lib/videoService"; // Moved to LiveClassRoom
import dynamic_next from 'next/dynamic';

const LiveClassRoom = dynamic_next(() => import('@/components/live-class/LiveClassRoom'), {
    ssr: false,
    loading: () => <div className="h-screen flex items-center justify-center bg-gray-950 text-white">Loading Live Class...</div>,
});
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { db } from "../../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

function ClassRoomContent() {
    const { roomId: rawRoomId } = useParams();
    const roomId = Array.isArray(rawRoomId) ? rawRoomId[0] : rawRoomId;
    const searchParams = useSearchParams();
    const classId = searchParams.get("classId");
    const courseId = searchParams.get("courseId");
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    const [classStatus, setClassStatus] = useState<"loading" | "active" | "ended" | "not_found">("loading");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [classDetails, setClassDetails] = useState<Record<string, unknown> | null>(null);

    // Keep a live ref to profile/courseId so the popstate handler always reads
    // the latest values instead of being frozen at first render.
    const profileRef = useRef(profile);
    const courseIdRef = useRef(courseId);
    useEffect(() => { profileRef.current = profile; }, [profile]);
    useEffect(() => { courseIdRef.current = courseId; }, [courseId]);

    // Handle Browser Back Button
    useEffect(() => {
        window.history.pushState(null, "", window.location.href);

        const handlePopState = (event: PopStateEvent) => {
            event.preventDefault();
            let dashboardUrl = profileRef.current?.role === "teacher"
                ? "/teacher/dashboard"
                : "/student/dashboard";

            if (courseIdRef.current) {
                dashboardUrl += `?courseId=${courseIdRef.current}`;
            }
            router.replace(dashboardUrl);
        };

        window.addEventListener("popstate", handlePopState);

        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, [router]);


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
                            return;
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
                console.warn("No classId provided in URL");
                setClassStatus("active");
            }
        };

        if (user && !loading) {
            initMeeting();
        }
    }, [user, profile, loading, roomId, router, classId]);

    // Screen Wake Lock
    useEffect(() => {
        let wakeLock: WakeLockSentinel | null = null;

        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wakeLock = await navigator.wakeLock.request('screen');
                    console.log('Wake Lock is active');
                }
            } catch (err: unknown) {
                const errObj = err instanceof Error ? err : { name: 'Unknown', message: String(err) };
                console.warn(`Wake Lock Error: ${errObj.name}, ${errObj.message}`);
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

    // if (!meetingUrl) return <div className="h-screen flex items-center justify-center">Preparing Class Environment...</div>;
    // Removed waiting for meetingUrl, now checking loading states inside LiveClassRoom or here if needed.
    // Using classStatus only.

    if (!roomId) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-gray-100">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">Invalid Room</h1>
                <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    const resolvedRole: "teacher" | "student" =
        profile?.role === "teacher" ? "teacher" : "student";

    return (
        <div className="flex flex-col h-[100dvh] w-full bg-gray-950 overflow-hidden">
            <LiveClassRoom
                roomId={roomId}
                classId={classId || ""}
                role={resolvedRole}
                participantName={profile?.displayName || user?.email?.split("@")[0] || "User"}
            />
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
