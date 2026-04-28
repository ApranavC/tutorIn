import { usePubSub, useMeeting } from "@videosdk.live/react-sdk";
import React, { useEffect, useRef, useState } from "react";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { nameTructed, formatAMPM } from "@/components/live-class/utils/helper";
import { useMeetingAppContext } from "@/components/live-class/MeetingAppContextDef";
import { sideBarModes } from "@/components/live-class/utils/common";

const MAX_VISIBLE = 6;

/* ── Single message bubble ── */
const ChatMessage = ({ senderId, senderName, text, timestamp }) => {
  const mMeeting = useMeeting();
  const isLocal = mMeeting?.localParticipant?.id === senderId;
  return (
    <div className={`flex ${isLocal ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] px-3 py-2 rounded-2xl text-sm leading-snug ${
          isLocal
            ? "bg-purple-600/80 text-white rounded-br-sm"
            : "bg-black/50 text-white rounded-bl-sm"
        } backdrop-blur-sm shadow`}
      >
        {!isLocal && (
          <span className="block text-xs font-bold text-purple-300 mb-0.5">
            {nameTructed(senderName, 14)}
          </span>
        )}
        <p className="break-words whitespace-pre-wrap">{text}</p>
        <p className="text-right text-[10px] mt-0.5 opacity-50">
          {formatAMPM(new Date(timestamp))}
        </p>
      </div>
    </div>
  );
};

/* ── Message list ── */
const MessageList = ({ messages, localId }) => {
  const listRef = useRef();
  useEffect(() => {
    if (listRef.current)
      listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const visible = messages ? messages.slice(-MAX_VISIBLE) : [];

  return (
    <div
      ref={listRef}
      className="flex-1 overflow-y-auto flex flex-col gap-2 px-3 py-3 min-h-0"
    >
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-white/30 gap-1 select-none">
          <p className="text-sm">No messages yet</p>
          <p className="text-xs">Say something 👋</p>
        </div>
      ) : (
        visible.map((msg, i) => (
          <ChatMessage
            key={i}
            senderId={msg.senderId}
            senderName={msg.senderName}
            text={msg.message}
            timestamp={msg.timestamp}
            localId={localId}
          />
        ))
      )}
    </div>
  );
};

/* ── Chat input ── */
const CHAT_COOLDOWN_MS = 5000;

const ChatInput = ({ onSend }) => {
  const [text, setText] = useState("");
  const [cooldown, setCooldown] = useState(false);
  const cooldownRef = useRef(null);
  const ref = useRef();

  useEffect(() => { ref.current?.focus(); }, []);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, []);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed || cooldown) return;
    onSend(trimmed);
    setText("");
    ref.current?.focus();
    setCooldown(true);
    cooldownRef.current = setTimeout(() => {
      setCooldown(false);
    }, CHAT_COOLDOWN_MS);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-white/10 bg-black/30 backdrop-blur-sm">
      <input
        ref={ref}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
        }}
        placeholder={cooldown ? "Wait a moment…" : "Type a message…"}
        autoComplete="off"
        className="flex-1 bg-white/10 text-sm text-white placeholder-white/30 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-purple-500 border-none"
      />
      <button
        onClick={send}
        disabled={text.length < 1 || cooldown}
        className={`p-2 rounded-xl transition-colors ${
          text.length < 1 || cooldown
            ? "text-white/20 cursor-not-allowed"
            : "text-purple-400 hover:text-purple-300"
        }`}
      >
        <PaperAirplaneIcon className="w-4 h-4 -rotate-90" />
      </button>
    </div>
  );
};

/* ── Main overlay — right side, toggle by chat button ── */
export default function FloatingChatOverlay() {
  const { publish, messages } = usePubSub("CHAT");
  const mMeeting = useMeeting();
  const localId = mMeeting?.localParticipant?.id;
  const { sideBarMode, setSideBarMode } = useMeetingAppContext();

  const isOpen = sideBarMode === sideBarModes.CHAT;

  const close = () => setSideBarMode(null);

  if (!isOpen) return null;

  return (
    /* Positioned inside the video area div (which is position:relative) */
    <div
      className="absolute top-0 right-0 bottom-0 z-30 flex flex-col"
      style={{ width: "min(320px, 44vw)" }}
    >
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md rounded-l-2xl" />

      {/* Content */}
      <div className="relative flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-sm font-semibold text-white">💬 Chat</span>
          <button
            onClick={close}
            className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <MessageList messages={messages} localId={localId} />

        {/* Input */}
        <ChatInput onSend={(text) => publish(text, { persist: true })} />
      </div>
    </div>
  );
}
