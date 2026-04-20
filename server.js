const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

// ============================
// 🏠 HEALTH CHECK
// ============================
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "🚀 Stable YouTube Gateway API Running",
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ============================
// 🔧 extract video id
// ============================
function getVideoId(url) {
  if (!url) return null;

  const match = url.match(
    /(?:youtu\.be\/|youtube\.com.*v=|youtube\.com\/shorts\/)([^&?/]+)/
  );

  return match ? match[1] : null;
}

// ============================
// 🎧 AUDIO ENDPOINT (STABLE)
// ============================
app.post("/audio", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Missing URL" });
    }

    const videoId = getVideoId(url);

    if (!videoId) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    // ============================
    // 🔥 Invidious fallback API
    // ============================
    const apiUrl = `https://yewtu.be/api/v1/videos/${videoId}`;

    const response = await axios.get(apiUrl, {
      timeout: 10000,
    });

    const formats = response.data?.formatStreams || [];

    if (!formats.length) {
      return res.status(404).json({
        error: "No streams found",
      });
    }

    // 🎯 pick best audio or fallback
    const audio =
      formats.find((f) => f.mimeType?.includes("audio")) ||
      formats[0];

    if (!audio?.url) {
      return res.status(500).json({
        error: "No valid audio url",
      });
    }

    return res.json({
      ok: true,
      videoId,
      title: response.data.title,
      audioUrl: audio.url,
    });
  } catch (err) {
    console.error("API ERROR:", err.message);

    return res.status(500).json({
      error: "internal_error",
      details: err.message,
    });
  }
});

// ============================
// 🚀 START SERVER
// ============================
const PORT = process.env.PORT || 3001;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Production YouTube API running on port ${PORT}`);
});
