import React, { useState, useEffect, useRef, createRef } from "react";
import {
  Constants,
  createCameraVideoTrack,
  useMeeting,
  usePubSub,
} from "@videosdk.live/react-sdk";
import { SidebarConatiner } from "../sidebar/SidebarContainer";
import { PresenterView } from "../PresenterView";
import { nameTructed, trimSnackBarText } from "@/components/live-class/utils/helper";
import { ILSBottomBar } from "./components/ILSBottomBar";
import useIsTab from "@/components/live-class/hooks/useIsTab";
import PollsListner from "./components/pollContainer/PollListner";
import FlyingEmojisOverlay from "./components/FlyingEmojisOverlay";
import MemorizedILSParticipantView from "./components/ILSParticipantView";
import WaitingToJoinScreen from "../screens/WaitingToJoinScreen";
import ConfirmBox from "../ConfirmBox";
import useIsMobile from "@/components/live-class/hooks/useIsMobile";
import { useMediaQuery } from "react-responsive";
import { toast } from "react-toastify";
import { useMeetingAppContext } from "@/components/live-class/MeetingAppContextDef";
import ModeListner from "./components/ModeListner";

export function ILSContainer({
  onMeetingLeave,
  setIsMeetingLeft,
  selectedMic,
  selectedWebcam,
  selectWebcamDeviceId,
  setSelectWebcamDeviceId,
  selectMicDeviceId,
  setSelectMicDeviceId,
  micEnabled,
  webcamEnabled,
  meetingMode,
  setMeetingMode,
  role,
}) {
  const { useRaisedHandParticipants } = useMeetingAppContext();
  const bottomBarHeight = 60;

  const [containerHeight, setContainerHeight] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [meetingError, setMeetingError] = useState(false);
  const [meetingErrorVisible, setMeetingErrorVisible] = useState(false);
  const mMeetingRef = useRef();
  const [localParticipantAllowedJoin, setLocalParticipantAllowedJoin] =
    useState(null);

  const containerRef = createRef();
  const containerHeightRef = useRef();
  const containerWidthRef = useRef();
  const meetingModeRef = useRef(meetingMode);

  useEffect(() => {
    containerHeightRef.current = containerHeight;
    containerWidthRef.current = containerWidth;
  }, [containerHeight, containerWidth]);

  const isMobile = useIsMobile();
  const isTab = useIsTab();
  const isLGDesktop = useMediaQuery({ minWidth: 1024, maxWidth: 1439 });
  const isXLDesktop = useMediaQuery({ minWidth: 1440 });

  const sideBarContainerWidth = isXLDesktop
    ? 400
    : isLGDesktop
      ? 360
      : isTab
        ? 320
        : isMobile
          ? 280
          : 240;

  useEffect(() => {
    if (containerRef.current?.offsetHeight) {
      setContainerHeight(containerRef.current.offsetHeight);
    }
    if (containerRef.current?.offsetWidth) {
      setContainerWidth(containerRef.current.offsetWidth);
    }

    window.addEventListener("resize", () => {
      if (containerRef.current?.offsetHeight) {
        setContainerHeight(containerRef.current.offsetHeight);
      }
      if (containerRef.current?.offsetWidth) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    });
  }, [containerRef]);

  const { participantRaisedHand, participantLowerHand } = useRaisedHandParticipants();

  const _handleMeetingLeft = () => {
    setIsMeetingLeft(true);
  };

  const _handleOnRecordingStateChanged = ({ status }) => {
    if (
      meetingModeRef.current === Constants.modes.SEND_AND_RECV &&
      (status === Constants.recordingEvents.RECORDING_STARTED ||
        status === Constants.recordingEvents.RECORDING_STOPPED)
    ) {
      toast(
        `${status === Constants.recordingEvents.RECORDING_STARTED
          ? "Meeting recording is started."
          : "Meeting recording is stopped."
        }`,
        {
          position: "bottom-left",
          autoClose: 4000,
          hideProgressBar: true,
          closeButton: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        }
      );
    }
  };

  function onParticipantJoined(participant) {
    // Change quality to low, med or high based on resolution
    participant && participant.setQuality("high");
  }

  function onEntryResponded(participantId, name) {
    // console.log(" onEntryResponded", participantId, name);
    if (mMeetingRef.current?.localParticipant?.id === participantId) {
      if (name === "allowed") {
        setLocalParticipantAllowedJoin(true);
      } else {
        setLocalParticipantAllowedJoin(false);
        setTimeout(() => {
          _handleMeetingLeft();
        }, 3000);
      }
    }
  }

  async function onMeetingJoined() {
    const {
      changeWebcam,
      changeMic,
      muteMic,
      disableWebcam,
      localParticipant,
    } = mMeetingRef.current;

    // ensure only run for send_and_recv type
    if (localParticipant.mode !== Constants.modes.SEND_AND_RECV) return;

    if (webcamEnabled && selectedWebcam.id) {
      try {
        const track = await createCameraVideoTrack({
          optimizationMode: "motion",
          encoderConfig: "h540p_w960p",
          facingMode: "environment",
          cameraId: selectedWebcam.id,
          multiStream: false,
        });
        changeWebcam(track);
      } catch (err) {
        console.error("Failed to swap to selected webcam", err);
      }
    }

    if (micEnabled && selectedMic.id) {
      try {
        changeMic(selectedMic.id);
      } catch (err) {
        console.error("Failed to swap to selected mic", err);
      }
    }
  }
  function onMeetingLeft(reason) {
    // console.log("onMeetingLeft");
    if (typeof onMeetingLeave === "function") {
      onMeetingLeave(reason);
    }
  }

  const _handleOnError = (data) => {
    const { code, message } = data;

    const joiningErrCodes = [
      4001, 4002, 4003, 4004, 4005, 4006, 4007, 4008, 4009, 4010,
    ];

    const isJoiningError = joiningErrCodes.findIndex((c) => c === code) !== -1;

    try {
      new Audio("/preview.mp3").play().catch(() => { });
    } catch { }

    setMeetingErrorVisible(true);
    setMeetingError({
      code,
      message: isJoiningError ? "Unable to join meeting!" : message,
    });
  };

  const mMeeting = useMeeting({
    onParticipantJoined,
    onEntryResponded,
    onMeetingJoined,
    onMeetingLeft,
    onError: _handleOnError,
    onRecordingStateChanged: _handleOnRecordingStateChanged,
    onParticipantLeft: (participant) => {
      console.log("Participant left:", participant.displayName);
    },
  });

  useEffect(() => {
    mMeetingRef.current = mMeeting;
  }, [mMeeting]);

  const isPresenting = mMeeting.presenterId ? true : false;

  usePubSub("RAISE_HAND", {
    onMessageReceived: (data) => {
      const localParticipantId = mMeeting?.localParticipant?.id;

      const { senderId, senderName } = data;

      const isLocal = senderId === localParticipantId;

      try {
        new Audio("/preview.mp3").play().catch(() => { });
      } catch { }

      toast(`${isLocal ? "You" : nameTructed(senderName, 15)} raised hand 🖐🏼`, {
        position: "bottom-left",
        autoClose: 4000,
        hideProgressBar: true,
        closeButton: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });

      participantRaisedHand(senderId);
    },
  });

  usePubSub("LOWER_HAND", {
    onMessageReceived: (data) => {
      const { message } = data;
      participantLowerHand(message); // message is the participantId
    },
  });

  usePubSub("CHAT", {
    onMessageReceived: (data) => {
      const localParticipantId = mMeeting?.localParticipant?.id;

      const { senderId, senderName, message } = data;

      const isLocal = senderId === localParticipantId;

      if (!isLocal) {
        try {
          new Audio("/preview.mp3").play().catch(() => { });
        } catch { }

        toast(
          `${trimSnackBarText(
            `${nameTructed(senderName, 15)} says: ${message}`
          )}`,
          {
            position: "bottom-left",
            autoClose: 4000,
            hideProgressBar: true,
            closeButton: false,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "light",
          }
        );
      }
    },
  });

  return (
    <div className="fixed inset-0">
      <div ref={containerRef} className="h-full flex flex-col bg-gray-800">
        <FlyingEmojisOverlay />
        {typeof localParticipantAllowedJoin === "boolean" ? (
          localParticipantAllowedJoin ? (
            <>
              <ModeListner
                setMeetingMode={setMeetingMode}
                meetingMode={meetingMode}
              />
              <PollsListner />

              <PollsListner />

              <div className={` flex flex-1 flex-row bg-gray-800 min-h-0 `}>
                <div className={`flex flex-1 min-h-0 `}>
                  {isPresenting ? (
                    <PresenterView
                      height={containerHeight - bottomBarHeight}
                    />
                  ) : null}
                  {isPresenting && isMobile ? null : (
                    <MemorizedILSParticipantView isPresenting={isPresenting} />
                  )}
                </div>

                <SidebarConatiner
                  height={containerHeight - bottomBarHeight}
                  sideBarContainerWidth={sideBarContainerWidth}
                  meetingMode={meetingMode}
                  role={role}
                />
              </div>

              <ILSBottomBar
                bottomBarHeight={bottomBarHeight}
                setIsMeetingLeft={setIsMeetingLeft}
                selectWebcamDeviceId={selectWebcamDeviceId}
                setSelectWebcamDeviceId={setSelectWebcamDeviceId}
                selectMicDeviceId={selectMicDeviceId}
                setSelectMicDeviceId={setSelectMicDeviceId}
                meetingMode={meetingMode}
                role={role}
              />
            </>
          ) : (
            <></>
          )
        ) : (
          !mMeeting.isMeetingJoined && <WaitingToJoinScreen />
        )}
        <ConfirmBox
          open={meetingErrorVisible}
          successText="OKAY"
          onSuccess={() => {
            setMeetingErrorVisible(false);
          }}
          title={`Error Code: ${meetingError.code}`}
          subTitle={meetingError.message}
        />
      </div>
    </div>
  );
}
