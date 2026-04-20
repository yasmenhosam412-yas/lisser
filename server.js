const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// Extract video ID
function getVideoId(url) {
  const match = url.match(/(youtu\.be\/|v=)([^&]+)/);
  return match ? match[2] : null;
}

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

    // Invidious API
    const response = await axios.get(
      `https://yewtu.be/api/v1/videos/${videoId}`
    );

    const formats = response.data.formatStreams;

    if (!formats || formats.length === 0) {
      return res.status(404).json({ error: "No streams found" });
    }

    // نختار audio-only أو best available
    const audio = formats.find(f => f.mimeType.includes("audio")) || formats[0];

    return res.json({
      audioUrl: audio.url,
      ok: true,
    });

  } catch (err) {
    return res.status(500).json({
      error: "failed",
      details: err.message,
    });
  }
});

app.listen(3001, () => {
  console.log("🚀 Stable YouTube API running");
});
