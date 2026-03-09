
"use client";
import { Suspense } from "react";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
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
    const { roomId } = useParams();
    const searchParams = useSearchParams();
    const classId = searchParams.get("classId");
    const courseId = searchParams.get("courseId");
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    // const [meetingUrl, setMeetingUrl] = useState(""); // Removed
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

    // if (!meetingUrl) return <div className="h-screen flex items-center justify-center">Preparing Class Environment...</div>;
    // Removed waiting for meetingUrl, now checking loading states inside LiveClassRoom or here if needed.
    // Using classStatus only.

    return (
        <div className="flex flex-col h-[100dvh] w-full bg-gray-950 overflow-hidden">
            <LiveClassRoom
                roomId={roomId as string}
                role={profile?.role || "student"}
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
