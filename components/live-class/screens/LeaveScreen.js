export function LeaveScreen({ setIsMeetingLeft, leaveReason, role }) {
  const isClassEnded = leaveReason && [1006, 1008, 1009].includes(leaveReason.code);

  return (
    <div className="bg-gray-800 h-screen flex flex-col flex-1 items-center justify-center">
      <h1 className="text-white text-4xl">
        {isClassEnded ? "The class has ended." : "You left the meeting!"}
      </h1>
      <div className="mt-12 flex flex-col gap-4">
        {isClassEnded ? (
          <button
            className="w-full bg-indigo-600 text-white px-16 py-3 rounded-lg text-sm hover:bg-indigo-700"
            onClick={() => {
              const dashUrl = role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";
              window.location.href = dashUrl;
            }}
          >
            Return to Dashboard
          </button>
        ) : (
          <button
            className="w-full bg-purple-350 text-white px-16 py-3 rounded-lg text-sm"
            onClick={() => {
              setIsMeetingLeft(false);
            }}
          >
            Rejoin the Meeting
          </button>
        )}
      </div>
    </div>
  );
}
