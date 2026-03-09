const API_BASE_URL = "https://api.videosdk.live";

export const getToken = async () => {
  try {
    const res = await fetch("/api/generate-token");
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to generate VideoSDK token");
    }
    const data = await res.json();
    return data.token;
  } catch (err) {
    console.error("Error generating token:", err);
    throw err;
  }
};

export const createMeeting = async ({ token }) => {
  const url = `${API_BASE_URL}/v2/rooms`;
  const options = {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json" },
  };

  const { roomId } = await fetch(url, options)
    .then((response) => response.json())
    .catch((error) => console.error("error", error));

  return roomId;
};

export const validateMeeting = async ({ roomId, token }) => {
  const url = `${API_BASE_URL}/v2/rooms/validate/${roomId}`;

  const options = {
    method: "GET",
    headers: { Authorization: token, "Content-Type": "application/json" },
  };

  const result = await fetch(url, options)
    .then((response) => response.json()) //result will have meeting id
    .catch((error) => console.error("error", error));

  return result ? result.roomId === roomId : false;
};
