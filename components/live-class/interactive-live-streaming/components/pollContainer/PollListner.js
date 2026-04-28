import { usePubSub } from "@videosdk.live/react-sdk";
import { toast } from "react-toastify";
import { useMeetingAppContext } from "@/components/live-class/MeetingAppContextDef";
import { sideBarModes } from "@/components/live-class/utils/common";

const safeParse = (msg) => {
  if (typeof msg === "string") {
    try { return JSON.parse(msg); } catch { return msg; }
  }
  return msg;
};

const PollListner = ({ pollId, setCreatedPolls }) => {
  usePubSub(`SUBMIT_A_POLL_${pollId}`, {
    onMessageReceived: ({ message: raw, senderId: participantId, timestamp }) => {
      const message = safeParse(raw);
      setCreatedPolls((s) =>
        s.map((_poll) =>
          pollId === _poll.id
            ? {
              ..._poll,
              submissions: [
                ..._poll.submissions,
                { optionId: message.optionId, participantId, timestamp },
              ],
            }
            : _poll
        )
      );
    },
    onOldMessagesReceived: (messages) => {
      const sortedMappedMessages = messages.map(
        ({ senderId: participantId, timestamp, message: raw }) => {
          const message = safeParse(raw);
          const { optionId } = message;

          return {
            optionId,
            participantId,
            timestamp,
          };
        }
      );

      setCreatedPolls((s) => {
        return s.map((_poll) => {
          if (pollId === _poll.id) {
            return { ..._poll, submissions: sortedMappedMessages };
          } else {
            return _poll;
          }
        });
      });
    },
  });

  return <></>;
};

const PollsListner = () => {
  const {
    polls,
    setDraftPolls,
    setCreatedPolls,
    setEndedPolls,
    setSideBarMode,
  } = useMeetingAppContext();

  usePubSub(`CREATE_POLL`, {
    onMessageReceived: ({ message: raw, timestamp }) => {
      const message = safeParse(raw);
      setCreatedPolls((s) => {
        if (s.some((p) => p.id === message.id)) return s;
        return [{ ...message, createdAt: timestamp, submissions: [] }, ...s];
      });

      try {
        new Audio("/handraise.mp3").play().catch(() => { });
      } catch { }
      toast("New Poll Asked 📊", {
        position: "bottom-left",
        autoClose: 4000,
        hideProgressBar: true,
        closeButton: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
      setSideBarMode(sideBarModes.POLLS);
    },
    onOldMessagesReceived: (messages) => {
      setCreatedPolls((s) => {
        const existingIds = new Set(s.map((p) => p.id));
        const newPolls = messages
          .sort((a, b) =>
            a.timestamp > b.timestamp ? -1 : a.timestamp < b.timestamp ? 1 : 0
          )
          .map(({ message: raw, timestamp }) => ({
            ...safeParse(raw),
            createdAt: timestamp,
            submissions: [],
          }))
          .filter((p) => !existingIds.has(p.id));
        return [...s, ...newPolls];
      });
    },
  });

  usePubSub(`END_POLL`, {
    onMessageReceived: ({ message: raw }) => {
      const message = safeParse(raw);
      setEndedPolls((s) => [...s, { pollId: message.pollId }]);
    },
    onOldMessagesReceived: (messages) => {
      setEndedPolls((s) => [
        ...s,
        ...messages.map(({ message: raw }) => {
          const message = safeParse(raw);
          return { pollId: message.pollId };
        }),
      ]);
    },
  });

  usePubSub(`DRAFT_A_POLL`, {
    onMessageReceived: ({ message: raw }) => {
      const message = safeParse(raw);
      setDraftPolls((s) => {
        if (s.some((p) => p.id === message.id)) return s;
        return [...s, message];
      });
    },
    onOldMessagesReceived: (messages) => {
      const sortedMessage = messages.sort((a, b) => {
        if (a.timestamp > b.timestamp) {
          return -1;
        }
        if (a.timestamp < b.timestamp) {
          return 1;
        }
        return 0;
      });
      const newPolls = sortedMessage.map(({ message: raw }) => {
        return { ...safeParse(raw) };
      });
      setDraftPolls(newPolls);
    },
  });

  usePubSub(`REMOVE_POLL_FROM_DRAFT`, {
    onMessageReceived: ({ message: raw }) => {
      const message = safeParse(raw);
      setDraftPolls((s) => {
        return s.filter((_poll) => {
          if (message.pollId === _poll.id) {
            return false;
          } else {
            return true;
          }
        });
      });
    },
    onOldMessagesReceived: (messages) => {
      setDraftPolls((s) =>
        s.filter(
          (_poll) =>
            messages.findIndex(({ message: raw }) => {
              const message = safeParse(raw);
              return message.pollId === _poll.id;
            }) === -1
        )
      );
    },
  });

  return (
    <>
      {polls?.map((poll) => (
        <PollListner
          key={`poll_listner_${poll.id}`}
          pollId={poll.id}
          setCreatedPolls={setCreatedPolls}
        />
      ))}
    </>
  );
};

export default PollsListner;
