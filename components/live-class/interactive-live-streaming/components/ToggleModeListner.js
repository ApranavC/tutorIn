import { Popover, Transition } from "@headlessui/react";
import { AdjustmentsVerticalIcon } from "@heroicons/react/24/outline";
import {
  Constants,
  useMeeting,
  useParticipant,
  usePubSub,
} from "@videosdk.live/react-sdk";
import React, { Fragment, useEffect, useRef } from "react";
import ParticipantAddHostIcon from "@/components/live-class/icons/ParticipantTabPanel/ParticipantAddHostIcon";

const ToggleModeContainer = ({ participantId, participantMode, onPromote, raisedHand }) => {
  const mMeetingRef = useRef();
  const mMeeting = useMeeting({});

  const { isLocal } = useParticipant(participantId);

  useEffect(() => {
    mMeetingRef.current = mMeeting;
  }, [mMeeting]);

  const { publish } = usePubSub(`CHANGE_MODE_${participantId}`, {});
  const { publish: publishLowerHand } = usePubSub("LOWER_HAND");

  if (isLocal) return null;

  if (raisedHand && participantMode !== Constants.modes.SEND_AND_RECV) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (typeof onPromote === "function") {
              onPromote();
            }
            publish(
              JSON.stringify({
                mode: Constants.modes.SEND_AND_RECV,
                skipConsent: true,
              }),
              { persist: false }
            );
            publishLowerHand(participantId, { persist: false });
          }}
          className="text-white text-[10px] bg-green-600 px-1.5 py-0.5 rounded hover:bg-green-700 font-semibold"
          title="Approve as Co-host"
        >
          Approve
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            publishLowerHand(participantId, { persist: false });
          }}
          className="text-white text-[10px] bg-red-600 px-1.5 py-0.5 rounded hover:bg-red-700 font-semibold"
          title="Reject Hand Raise"
        >
          Reject
        </button>
      </div>
    );
  }

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <Popover.Button
            className={`
            ${open ? "" : "text-opacity-90"}
            group inline-flex items-center  m-1 p-1 text-base font-medium rounded-full hover:bg-gray-600 text-white hover:text-opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75`}
          >
            <AdjustmentsVerticalIcon
              className={`${open ? "" : "text-opacity-70"}
              h-5 w-5 text-white transition duration-150 ease-in-out group-hover:text-opacity-80`}
              aria-hidden="true"
            />
          </Popover.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel
              className={`absolute ${participantMode === Constants.modes.SEND_AND_RECV
                ? "w-48"
                : "w-40"
                } left-full z-10 mt-1 -translate-x-full shadow-xl transform py-2.5  sm:px-0  bg-gray-750 rounded-sm hover:cursor-pointer`}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  const newMode = participantMode === Constants.modes.SEND_AND_RECV
                    ? Constants.modes.RECV_ONLY
                    : Constants.modes.SEND_AND_RECV;

                  if (newMode === Constants.modes.SEND_AND_RECV && typeof onPromote === "function") {
                    onPromote();
                  }

                  publish(
                    JSON.stringify({
                      mode: newMode,
                    }),
                    { persist: false }
                  );
                  close();
                }}
                className=""
              >
                <div className="flex flex-row hover:bg-customGray-350 px-3 py-0.5">
                  <div className="flex items-center justify-center">
                    <ParticipantAddHostIcon
                      fill={
                        participantMode === Constants.modes.SEND_AND_RECV
                          ? "#fff"
                          : "#9E9EA7"
                      }
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flex: 1,
                      flexDirection: "column",
                      marginLeft: 8,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 14,
                        marginTop: 2,
                        color:
                          participantMode === Constants.modes.SEND_AND_RECV
                            ? "#fff"
                            : "#9E9EA7",
                      }}
                    >
                      {participantMode === Constants.modes.SEND_AND_RECV
                        ? "Remove from Co-host"
                        : "Add as a Co-host"}
                    </p>
                  </div>
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
};

export default ToggleModeContainer;
