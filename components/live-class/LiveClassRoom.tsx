import React, { useEffect, useState } from "react";
import { MeetingProvider } from "@videosdk.live/react-sdk";
import { LeaveScreen } from "./screens/LeaveScreen";
import { JoiningScreen } from "./screens/JoiningScreen";
import { ILSContainer } from "./interactive-live-streaming/ILSContainer";
import { MeetingAppProvider } from "./MeetingAppContextDef";
import { generateToken } from "@/lib/videoService";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface LiveClassRoomProps {
    roomId: string;
    classId?: string;
    role: "teacher" | "student";
    participantName: string;
}

export default function LiveClassRoom({ roomId, classId, role, participantName: initialParticipantName }: LiveClassRoomProps) {
    const [participantName, setParticipantName] = useState(initialParticipantName);
    const [token, setToken] = useState("");
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
    const [isMeetingLeft, setIsMeetingLeft] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [leaveReason, setLeaveReason] = useState<{ code: number; message: string } | null>(null);
    const router = useRouter();

    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.matchMedia("only screen and (max-width: 768px)").matches);
        };
        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    useEffect(() => {
        if (isMobile) {
            window.onbeforeunload = () => {
                return "Are you sure you want to exit?";
            };
        }
    }, [isMobile]);

    useEffect(() => {
        const initToken = async () => {
            try {
                const generatedToken = await generateToken();
                setToken(generatedToken);
            } catch (err) {
                console.error("Failed to generate token", err);
            }
        };
        initToken();
    }, []);

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

    if (!token) {
        return <div className="flex h-screen items-center justify-center bg-gray-900 text-white">Initializing...</div>;
    }

    return (
        <>
            {isMeetingStarted ? (
                <MeetingAppProvider>
                    <MeetingProvider
                        config={{
                            meetingId,
                            micEnabled: micOn,
                            webcamEnabled: webcamOn,
                            name: participantName || "User",
                            mode: meetingMode,
                            multiStream: false,
                            debugMode: false,
                        }}
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
                                        setTimeout(() => router.push(dashUrl), 1500);
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
