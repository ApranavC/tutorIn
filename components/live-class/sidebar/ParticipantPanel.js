import { useMeeting, useParticipant, usePubSub, Constants } from "@videosdk.live/react-sdk";
import React, { useMemo, useState, useEffect } from "react";
import MicOffIcon from "@/components/live-class/icons/ParticipantTabPanel/MicOffIcon";
import MicOnIcon from "@/components/live-class/icons/ParticipantTabPanel/MicOnIcon";
import RaiseHand from "@/components/live-class/icons/ParticipantTabPanel/RaiseHand";
import VideoCamOffIcon from "@/components/live-class/icons/ParticipantTabPanel/VideoCamOffIcon";
import VideoCamOnIcon from "@/components/live-class/icons/ParticipantTabPanel/VideoCamOnIcon";
import ToggleModeContainer from "../interactive-live-streaming/components/ToggleModeListner";
import { useMeetingAppContext } from "@/components/live-class/MeetingAppContextDef";
import { nameTructed } from "@/components/live-class/utils/helper";

const DemoteTrigger = ({ id, onDemoted }) => {
  const { publish } = usePubSub(`CHANGE_MODE_${id}`);

  useEffect(() => {
    publish(
      JSON.stringify({
        mode: Constants.modes.RECV_ONLY,
      })
    );
    onDemoted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

function ParticipantListItem({ participantId, raisedHand, onPromote, onDemote, role }) {
  const { micOn, webcamOn, displayName, isLocal, mode } =
    useParticipant(participantId);

  return (
    <div className="mt-2 m-2 p-2 bg-gray-700 rounded-lg mb-0 border border-gray-600 shadow-sm">
      <div className="flex flex-1 items-center relative">
        <div
          style={{
            color: "#212032",
            backgroundColor: "#757575",
          }}
          className="h-10 w-10 text-lg mt-0 rounded overflow-hidden flex relative items-center justify-center"
        >
          {displayName?.charAt(0).toUpperCase()}
        </div>
        <div className="ml-2 mr-1 flex flex-1 flex-col justify-center">
          <p className="text-base text-white overflow-hidden whitespace-pre-wrap overflow-ellipsis">
            {isLocal ? "You" : nameTructed(displayName, 15)}
          </p>
          {mode === Constants.modes.SEND_AND_RECV && (
            <p className="text-xs text-blue-400 font-semibold">Co-host</p>
          )}
        </div>
        {raisedHand && (
          <div className="flex items-center justify-center m-1 p-1">
            <RaiseHand fillcolor={"#fff"} />
          </div>
        )}
        <div className="m-1 p-1">{micOn ? <MicOnIcon /> : <MicOffIcon />}</div>
        <div className="m-1 p-1">
          {webcamOn ? <VideoCamOnIcon /> : <VideoCamOffIcon />}
        </div>
        {!isLocal && role === "teacher" && (
          <div className="m-1 p-1">
            {mode === Constants.modes.SEND_AND_RECV ? (
              <button
                onClick={onDemote}
                className="text-white text-xs bg-red-600 px-2 py-1 rounded hover:bg-red-700 font-semibold"
                title="Remove as Co-host"
              >
                Remove
              </button>
            ) : (
              <ToggleModeContainer
                participantId={participantId}
                participantMode={mode}
                onPromote={onPromote}
                raisedHand={raisedHand}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ParticipantPanel({ panelHeight, role }) {
  const { raisedHandsParticipants } = useMeetingAppContext();
  const mMeeting = useMeeting();
  const participants = mMeeting.participants;
  const [demoteQueue, setDemoteQueue] = useState([]);

  const handlePromote = (newCoHostId) => {
    const toDemote = [];
    participants.forEach((p) => {
      // Demote any other participant who is in CONFERENCE mode (and not local)
      if (
        p.id !== mMeeting.localParticipant.id &&
        p.id !== newCoHostId &&
        p.mode === Constants.modes.SEND_AND_RECV
      ) {
        toDemote.push(p.id);
      }
    });

    if (toDemote.length > 0) {
      setDemoteQueue((prev) => [...prev, ...toDemote]);
    }
  };

  const handleDemote = (coHostId) => {
    setDemoteQueue((prev) => [...prev, coHostId]);
  };

  const removeDemoteId = (id) => {
    setDemoteQueue((prev) => prev.filter((pid) => pid !== id));
  };

  const sortedRaisedHandsParticipants = useMemo(() => {
    const participantIds = [...participants.keys()];

    const notRaised = participantIds.filter(
      (pID) =>
        raisedHandsParticipants.findIndex(
          ({ participantId: rPID }) => rPID === pID
        ) === -1
    );

    const raisedSorted = raisedHandsParticipants.sort((a, b) => {
      if (a.raisedHandOn > b.raisedHandOn) {
        return -1;
      }
      if (a.raisedHandOn < b.raisedHandOn) {
        return 1;
      }
      return 0;
    });

    const combined = [
      ...raisedSorted.map(({ participantId: p }) => ({
        raisedHand: true,
        participantId: p,
      })),
      ...notRaised.map((p) => ({ raisedHand: false, participantId: p })),
    ];

    return combined;
  }, [raisedHandsParticipants, participants]);

  const filterParticipants = (sortedRaisedHandsParticipants) =>
    sortedRaisedHandsParticipants;

  const part = useMemo(
    () => filterParticipants(sortedRaisedHandsParticipants, participants),

    [sortedRaisedHandsParticipants, participants]
  );

  return (
    <div
      className={`flex w-full flex-col bg-gray-750 overflow-y-auto `}
      style={{ height: panelHeight }}
    >
      <div
        className="flex flex-col flex-1"
        style={{ height: panelHeight - 100 }}
      >
        {[...participants.keys()].map((participantId, index) => {
          const { raisedHand, participantId: peerId } = part[index];
          return (
            <ParticipantListItem
              key={participantId}
              participantId={peerId}
              raisedHand={raisedHand}
              onPromote={() => handlePromote(peerId)}
              onDemote={() => handleDemote(peerId)}
              role={role}
            />
          );
        })}
      </div>
      {demoteQueue.map((id) => (
        <DemoteTrigger key={id} id={id} onDemoted={() => removeDemoteId(id)} />
      ))}
    </div>
  );
}
