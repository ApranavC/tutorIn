import React, { useEffect, useMemo, useRef, useState } from "react";
import { MeetingProvider } from "@videosdk.live/react-sdk";
import { LeaveScreen } from "./screens/LeaveScreen";
import { JoiningScreen } from "./screens/JoiningScreen";
import { ILSContainer } from "./interactive-live-streaming/ILSContainer";
import { MeetingAppProvider } from "./MeetingAppContextDef";
import { generateToken } from "@/lib/videoService";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Smartphone } from "lucide-react";

const OrientationBlocker = () => (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center">
        <div className="mb-6 text-purple-500">
            <div className="relative">
                <Smartphone size={80} className="animate-[rotate_3s_ease-in-out_infinite]" />
                <style jsx>{`
                    @keyframes rotate {
                        0%, 100% { transform: rotate(0deg); }
                        50% { transform: rotate(90deg); }
                    }
                `}</style>
            </div>
        </div>
        <h2 className="text-2xl font-bold mb-4 tracking-tight">Rotate Your Device</h2>
        <p className="text-gray-400 max-w-xs leading-relaxed">
            For the best learning experience, please rotate your phone to landscape mode.
        </p>
    </div>
);

interface LiveClassRoomProps {
    roomId: string;
    classId?: string;
    role: "teacher" | "student";
    participantName: string;
}

export default function LiveClassRoom({ roomId, classId, role, participantName: initialParticipantName }: LiveClassRoomProps) {
    const [participantName, setParticipantName] = useState(initialParticipantName);
    const [token, setToken] = useState("");
    const [tokenError, setTokenError] = useState<string | null>(null);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [meetingId, setMeetingId] = useState(roomId);
    const [micOn, setMicOn] = useState(role === "teacher");
    const [webcamOn, setWebcamOn] = useState(role === "teacher");
    const [selectedMic, setSelectedMic] = useState({ id: null });
    const [selectedWebcam, setSelectedWebcam] = useState({ id: null });
    const [selectWebcamDeviceId, setSelectWebcamDeviceId] = useState(
        selectedWebcam.id
    );
    const [meetingMode, setMeetingMode] = useState<"SEND_AND_RECV" | "RECV_ONLY">(
        (role === "teacher" ? "SEND_AND_RECV" : "RECV_ONLY") as "SEND_AND_RECV" | "RECV_ONLY"
    );
    const [selectMicDeviceId, setSelectMicDeviceId] = useState(selectedMic.id);
    const [isMeetingStarted, setMeetingStarted] = useState(false);
    const joinTriggeredRef = useRef(false);
    const [isMeetingLeft, setIsMeetingLeft] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isPortrait, setIsPortrait] = useState(false);
    const [leaveReason, setLeaveReason] = useState<{ code: number; message: string } | null>(null);
    const router = useRouter();

    useEffect(() => {
        const checkLayout = () => {
            const isMob = window.matchMedia("only screen and (max-width: 768px)").matches;
            setIsMobile(isMob);
            setIsPortrait(window.innerHeight > window.innerWidth);
        };
        checkLayout();
        window.addEventListener('resize', checkLayout);
        return () => window.removeEventListener('resize', checkLayout);
    }, []);

    useEffect(() => {
        if (!isMobile) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "Are you sure you want to exit?";
            return "Are you sure you want to exit?";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [isMobile]);

    useEffect(() => {
        let cancelled = false;
        const initToken = async () => {
            try {
                const generatedToken = await generateToken();
                if (cancelled) return;
                setToken(generatedToken);
                setTokenError(null);
            } catch (err) {
                console.error("Failed to generate token", err);
                if (!cancelled) {
                    setTokenError(
                        err instanceof Error ? err.message : "Failed to connect to the class service."
                    );
                }
            }
        };
        initToken();
        return () => { cancelled = true; };
    }, []);

    const retryTokenFetch = async () => {
        setTokenError(null);
        setToken("");
        try {
            const generatedToken = await generateToken();
            setToken(generatedToken);
        } catch (err) {
            console.error("Failed to generate token", err);
            setTokenError(
                err instanceof Error ? err.message : "Failed to connect to the class service."
            );
        }
    };

    // Role is expected to be static per session
    /*
    useEffect(() => {
        if (role === 'teacher') {
            setMeetingMode("SEND_AND_RECV");
        } else {
            setMeetingMode("RECV_ONLY");
        }
    }, [role]);
    */

    const meetingConfig = useMemo(() => ({
        meetingId,
        micEnabled: micOn,
        webcamEnabled: webcamOn,
        name: participantName || "User",
        mode: meetingMode,
        multiStream: false,
        debugMode: false,
    }), [meetingId, micOn, webcamOn, participantName, meetingMode]);

    if (tokenError) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-gray-900 text-white p-6 text-center">
                <h2 className="text-xl font-bold mb-2">Unable to start the class</h2>
                <p className="text-gray-300 mb-6 max-w-md">{tokenError}</p>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={retryTokenFetch}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-sm font-semibold"
                    >
                        Retry
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push(role === "teacher" ? "/teacher/dashboard" : "/student/dashboard")}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-semibold"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (isRedirecting) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-gray-900 text-white gap-4">
                <div className="h-10 w-10 rounded-full border-4 border-gray-700 border-t-indigo-500 animate-spin" />
                <p className="text-sm text-gray-300">Returning to dashboard...</p>
            </div>
        );
    }

    if (!token) {
        return <div className="flex h-screen items-center justify-center bg-gray-900 text-white">Initializing...</div>;
    }

    return (
        <>
            {isMobile && isPortrait && isMeetingStarted && <OrientationBlocker />}
            {isMeetingStarted ? (
                <MeetingAppProvider>
                    <MeetingProvider
                        config={meetingConfig}
                        token={token}
                        reinitialiseMeetingOnConfigChange={true}
                        joinWithoutUserInteraction={true}
                    >
                        <ILSContainer
                            onMeetingLeave={(reason: { code: number; message: string }) => {
                                setWebcamOn(false);
                                setMicOn(false);
                                setMeetingStarted(false);
                                setLeaveReason(reason);
                                setIsMeetingLeft(true);

                                if (reason && reason.code) {
                                    const code = reason.code;
                                    if ([1006, 1008, 1009].includes(code)) {
                                        // Class ended. Teachers go to notes form, students see LeaveScreen.
                                        if (role === "teacher") {
                                            router.push(`/teacher/class/${classId || meetingId || roomId}/finish`);
                                        }
                                    } else if (code === 1101) {
                                        // "throw user to the home page from which he can rejoin"
                                        const dashUrl = role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";
                                        router.push(dashUrl);
                                    } else {
                                        // "say something went wrong and take to homepage"
                                        toast.error(`Meeting left unexpectedly (Code: ${code}). Returning to dashboard.`);
                                        const dashUrl = role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";
                                        setIsRedirecting(true);
                                        setTimeout(() => router.push(dashUrl), 1500);
                                        // Fallback: if navigation never lands, drop the spinner so the
                                        // user lands on LeaveScreen instead of being stuck.
                                        setTimeout(() => setIsRedirecting(false), 6000);
                                    }
                                }
                            }}
                            setIsMeetingLeft={setIsMeetingLeft}
                            selectedMic={selectedMic}
                            selectedWebcam={selectedWebcam}
                            selectWebcamDeviceId={selectWebcamDeviceId}
                            setSelectWebcamDeviceId={setSelectWebcamDeviceId}
                            selectMicDeviceId={selectMicDeviceId}
                            setSelectMicDeviceId={setSelectMicDeviceId}
                            micEnabled={micOn}
                            webcamEnabled={webcamOn}
                            meetingMode={meetingMode}
                            setMeetingMode={setMeetingMode}
                            role={role}
                        />
                    </MeetingProvider>
                </MeetingAppProvider>
            ) : isMeetingLeft ? (
                <LeaveScreen setIsMeetingLeft={setIsMeetingLeft} leaveReason={leaveReason} role={role} />
            ) : (
                <JoiningScreen
                    participantName={participantName}
                    setParticipantName={setParticipantName}
                    setMeetingId={setMeetingId}
                    meetingId={meetingId}
                    setToken={setToken}
                    setMicOn={setMicOn}
                    micEnabled={micOn}
                    webcamEnabled={webcamOn}
                    setSelectedMic={setSelectedMic}
                    setSelectedWebcam={setSelectedWebcam}
                    setWebcamOn={setWebcamOn}
                    onClickStartMeeting={() => {
                        if (joinTriggeredRef.current) return;
                        joinTriggeredRef.current = true;
                        setMeetingStarted(true);
                    }}
                    meetingMode={meetingMode}
                    setMeetingMode={setMeetingMode}
                    role={role}
                />
            )}
        </>
    );
}
