import { PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { useMeeting, usePubSub } from "@videosdk.live/react-sdk";
import React, { useEffect, useRef, useState } from "react";
import { formatAMPM, nameTructed } from "@/components/live-class/utils/helper";

const ChatMessage = ({ senderId, senderName, text, timestamp }) => {
  const mMeeting = useMeeting();
  const localParticipantId = mMeeting?.localParticipant?.id;
  const localSender = localParticipantId === senderId;

  return (
    <div className={`flex ${localSender ? "justify-end" : "justify-start"} mt-3 px-1`}>
      <div
        className={`max-w-[80%] flex ${
          localSender ? "items-end" : "items-start"
        } flex-col py-2 px-3 rounded-xl ${
          localSender ? "bg-purple-700" : "bg-gray-700"
        }`}
      >
        <p className="text-xs font-semibold mb-1" style={{ color: "#ffffff90" }}>
          {localSender ? "You" : nameTructed(senderName, 15)}
        </p>
        <p className="text-sm text-white whitespace-pre-wrap break-words leading-snug">
          {text}
        </p>
        <p className="text-xs mt-1 self-end" style={{ color: "#ffffff60" }}>
          {formatAMPM(new Date(timestamp))}
        </p>
      </div>
    </div>
  );
};

const CHAT_COOLDOWN_MS = 5000;

const ChatInput = ({ inputHeight }) => {
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(false);
  const cooldownRef = useRef(null);
  const { publish } = usePubSub("CHAT");
  const input = useRef();

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, []);

  const sendMessage = () => {
    const messageText = message.trim();
    if (messageText.length > 0 && !cooldown) {
      publish(messageText, { persist: true });
      setTimeout(() => setMessage(""), 100);
      input.current?.focus();
      setCooldown(true);
      cooldownRef.current = setTimeout(() => {
        setCooldown(false);
      }, CHAT_COOLDOWN_MS);
    }
  };

  return (
    <div
      className="w-full flex items-center gap-2 px-3 py-2 bg-gray-900 border-t border-gray-700"
      style={{ minHeight: inputHeight }}
    >
      <input
        type="text"
        className="flex-1 text-sm text-white bg-gray-700 border border-gray-600 rounded-xl py-2.5 px-3 focus:outline-none focus:border-purple-500 placeholder-gray-400"
        placeholder={cooldown ? "Wait a moment…" : "Write a message…"}
        autoComplete="off"
        ref={input}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
          }
        }}
      />
      <button
        disabled={message.length < 1 || cooldown}
        onClick={sendMessage}
        className={`p-2.5 rounded-xl transition-colors flex-shrink-0 ${
          message.length < 1 || cooldown
            ? "bg-gray-700 text-gray-500 cursor-not-allowed"
            : "bg-purple-600 hover:bg-purple-700 text-white"
        }`}
      >
        <PaperAirplaneIcon className="w-4 h-4 -rotate-90" />
      </button>
    </div>
  );
};

const ChatMessages = ({ listHeight }) => {
  const listRef = useRef();
  const { messages } = usePubSub("CHAT");

  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div
      ref={listRef}
      className="overflow-y-auto flex flex-col"
      style={{ height: listHeight }}
    >
      {messages && messages.length > 0 ? (
        <div className="p-3 flex flex-col gap-1">
          {messages.map((msg, i) => {
            const { senderId, senderName, message, timestamp } = msg;
            return (
              <ChatMessage
                key={`chat_item_${i}`}
                {...{ senderId, senderName, text: message, timestamp }}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2 py-8">
          <p className="text-sm">No messages yet</p>
          <p className="text-xs">Be the first to say something! 👋</p>
        </div>
      )}
    </div>
  );
};

export function ChatPanel({ panelHeight }) {
  const inputHeight = 64;
  const listHeight = panelHeight - inputHeight;

  return (
    <div className="flex flex-col bg-gray-800 h-full" style={{ height: panelHeight }}>
      <ChatMessages listHeight={listHeight} />
      <ChatInput inputHeight={inputHeight} />
    </div>
  );
}
