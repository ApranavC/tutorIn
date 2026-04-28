import {
  Constants,
  useMeeting,
  useParticipant,
  usePubSub,
} from "@videosdk.live/react-sdk";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import ConfirmBox from "../../ConfirmBox";
import { useMeetingAppContext } from "@/components/live-class/MeetingAppContextDef";

const reqInfoDefaultState = {
  enabled: false,
  mode: null,
  senderId: null,
  accept: () => { },
  reject: () => { },
};

const ModeListner = ({ setMeetingMode }) => {
  const mMeetingRef = useRef();
  const { setSideBarMode } = useMeetingAppContext();

  const [reqModeInfo, setReqModeInfo] = useState(reqInfoDefaultState);

  const mMeeting = useMeeting();
  const localParticipantId = mMeeting?.localParticipant?.id;
  const participant = useParticipant(localParticipantId);

  const participantRef = useRef();

  useEffect(() => {
    mMeetingRef.current = mMeeting;
  }, [mMeeting]);

  useEffect(() => {
    participantRef.current = participant;
  }, [participant]);

  usePubSub(`CHANGE_MODE_${mMeeting?.localParticipant?.id}`, {
    onMessageReceived: (data) => {
      // Ignore stale replayed messages (older than 10 seconds)
      if (data.timestamp && Date.now() - new Date(data.timestamp).getTime() > 10000) {
        return;
      }
      let message;
      try {
        message = JSON.parse(data.message);
      } catch (err) {
        console.error("Failed to parse mode change message:", err);
        return;
      }
      if (message.mode === Constants.modes.SEND_AND_RECV) {
        if (message.skipConsent) {
          mMeeting.changeMode(message.mode);
        } else {
          const muteMic = mMeetingRef.current?.muteMic;
          const disableWebcam = mMeetingRef.current?.disableWebcam;
          const disableScreenShare = mMeetingRef.current?.disableScreenShare;

          muteMic();
          disableWebcam();
          disableScreenShare();
          setReqModeInfo({
            enabled: true,
            senderId: data.senderId,
            mode: message.mode,
            accept: () => { },
            reject: () => { },
          });
        }
      } else {
        mMeeting.changeMode(message.mode);

        const muteMic = mMeetingRef.current?.muteMic;
        const disableWebcam = mMeetingRef.current?.disableWebcam;
        const disableScreenShare = mMeetingRef.current?.disableScreenShare;

        muteMic();
        disableWebcam();
        disableScreenShare();

        setSideBarMode(null);
      }
    },
  });

  const { publish: invitatioAcceptedPublish } = usePubSub(
    `INVITATION_ACCEPT_BY_COHOST`,
    {
      onMessageReceived: (data) => {
        try {
          new Audio("/preview.mp3").play().catch(() => { });
        } catch { }

        toast(`${data.senderName} has been added as a Co-host`, {
          position: "bottom-left",
          autoClose: 4000,
          hideProgressBar: true,
          closeButton: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
      },
      onOldMessagesReceived: () => { },
    }
  );

  const { publish: invitatioRejectedPublish } = usePubSub(
    `INVITATION_REJECT_BY_COHOST`,
    {
      onMessageReceived: (data) => {
        if (data.message.senderId === participantRef.current.participant.id) {
          try {
            new Audio("/preview.mp3").play().catch(() => { });
          } catch { }

          toast(
            `${data.senderName} has rejected the request to become Co-host`,
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
    }
  );

  useMeeting({
    onParticipantModeChanged: ({ mode, participantId }) => {
      if (participantId === localParticipantId) {
        setMeetingMode(mode);
      }
    },
  });

  return (
    <>
      <ConfirmBox
        open={reqModeInfo.enabled}
        successText={"Accept"}
        rejectText={"Deny"}
        onReject={() => {
          setReqModeInfo(reqInfoDefaultState);
          invitatioRejectedPublish(
            JSON.stringify({ senderId: reqModeInfo.senderId }),
            { persist: true }
          );
        }}
        onSuccess={() => {
          mMeeting.changeMode(reqModeInfo.mode);
          setReqModeInfo(reqInfoDefaultState);
          invitatioAcceptedPublish(JSON.stringify({}), { persist: true });
        }}
        title={`Request to become a Co-host`}
        subTitle={`Host has requested you to become a Co-host`}
      />
    </>
  );
};

export default ModeListner;
