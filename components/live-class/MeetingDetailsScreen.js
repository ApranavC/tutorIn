import { CheckIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import { Constants } from "@videosdk.live/react-sdk";
import React, { useState } from "react";

export function MeetingDetailsScreen({
  onClickJoin,
  _handleOnCreateMeeting,
  participantName,
  videoTrack,
  setVideoTrack,
  onClickStartMeeting,
  setMeetingMode,
  meetingId,
  role,
}) {
  const [studioCode, setStudioCode] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [iscreateMeetingClicked, setIscreateMeetingClicked] = useState(false);
  const [isJoinMeetingClicked, setIsJoinMeetingClicked] = useState(false);

  React.useEffect(() => {
    if (meetingId && !isJoinMeetingClicked && !iscreateMeetingClicked) {
      setStudioCode(meetingId);
      setIsJoinMeetingClicked(true);
      if (role === "teacher") {
        setMeetingMode(Constants.modes.SEND_AND_RECV);
      } else {
        setMeetingMode(Constants.modes.RECV_ONLY);
      }
    }
  }, [meetingId, role, isJoinMeetingClicked, iscreateMeetingClicked, setMeetingMode]);

  return (
    <div
      className={`flex flex-1 flex-col justify-center w-full md:p-[6px] sm:p-1 p-1.5`}
    >
      {iscreateMeetingClicked ? (
        <div className="border border-solid border-gray-400 rounded-xl px-4 py-3  flex items-center justify-center">
          <p className="text-white text-base">{`Studio code : ${studioCode}`}</p>
          <button
            className="ml-2"
            onClick={() => {
              navigator.clipboard.writeText(studioCode);
              setIsCopied(true);
              setTimeout(() => {
                setIsCopied(false);
              }, 3000);
            }}
          >
            {isCopied ? (
              <CheckIcon className="h-5 w-5 text-green-400" />
            ) : (
              <ClipboardIcon className="h-5 w-5 text-white" />
            )}
          </button>
        </div>
      ) : null}

      {(iscreateMeetingClicked || isJoinMeetingClicked) && (
        <>
          <button
            disabled={participantName.length < 3}
            className={`w-full ${participantName.length < 3 ? "bg-gray-650" : "bg-purple-350"
              }  text-white px-2 py-3 rounded-xl mt-5`}
            onClick={() => {
              if (iscreateMeetingClicked) {
                if (videoTrack) {
                  videoTrack.stop();
                  setVideoTrack(null);
                }
                onClickStartMeeting();
              } else {
                if (studioCode && studioCode.length > 5) {
                  onClickJoin(studioCode);
                }
              }
            }}
          >
            {iscreateMeetingClicked
              ? "Start Class"
              : "Join Class"}
          </button>
        </>
      )}

      {!iscreateMeetingClicked && !isJoinMeetingClicked && (
        <div className="w-full md:mt-0 mt-4 flex flex-col">
          <div className="flex items-center justify-center flex-col w-full">
            <button
              className="w-full bg-purple-350 text-white px-2 py-3 rounded-xl"
              onClick={async () => {
                const studioCode = await _handleOnCreateMeeting();
                setStudioCode(studioCode);
                setIscreateMeetingClicked(true);
                setMeetingMode(Constants.modes.SEND_AND_RECV);
              }}
            >
              Create live stream
            </button>

            <button
              className="w-full bg-purple-350 text-white px-2 py-3 mt-5 rounded-xl"
              onClick={async () => {
                setIsJoinMeetingClicked(true);
                setMeetingMode(Constants.modes.SEND_AND_RECV);
              }}
            >
              Join as a Host
            </button>
            <button
              className="w-full bg-gray-650 text-white px-2 py-3 rounded-xl mt-5"
              onClick={() => {
                setIsJoinMeetingClicked(true);
                setMeetingMode(Constants.modes.RECV_ONLY);
              }}
            >
              Join as a Viewer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
