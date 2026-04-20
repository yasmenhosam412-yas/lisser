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
  res.send("🚀 Stable YouTube Gateway API Running");
});

// ============================
// 🔧 extract video id
// ============================
function getVideoId(url) {
  const match = url.match(/(youtu\.be\/|v=)([^&]+)/);
  return match ? match[2] : null;
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
    // 🔥 PRIMARY SOURCE (Invidious)
    // ============================
    const apiUrl = `https://yewtu.be/api/v1/videos/${videoId}`;

    const response = await axios.get(apiUrl, {
      timeout: 10000,
    });

    const formats = response.data?.formatStreams || [];

    if (!formats.length) {
      return res.status(404).json({ error: "No streams found" });
    }

    // 🎯 pick best audio OR fallback
    const audio =
      formats.find(f => f.mimeType.includes("audio")) ||
      formats[0];

    return res.json({
      audioUrl: audio.url,
      title: response.data.title,
      ok: true,
    });

  } catch (err) {
    console.error(err.message);

    return res.status(500).json({
      error: "failed",
      details: err.message,
    });
  }
});

// ============================
// 🚀 START SERVER
// ============================
const PORT = 3001;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Production YouTube API running on port", PORT);
});
