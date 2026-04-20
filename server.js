const express = require("express");
const cors = require("cors");
const { Innertube } = require("youtubei.js");

const app = express();
app.use(cors());
app.use(express.json());

// =========================
// HEALTH
// =========================
app.get("/", (req, res) => {
  res.json({ ok: true, message: "YouTube Audio API (youtubei.js) 🚀" });
});

// =========================
// VIDEO ID
// =========================
function getVideoId(url) {
  const match = url.match(/(youtu\.be\/|v=|shorts\/)([^&?/]+)/);
  return match ? match[2] : null;
}

// =========================
// AUDIO API
// =========================
app.post("/audio", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "missing_url" });
    }

    const videoId = getVideoId(url);

    if (!videoId) {
      return res.status(400).json({ error: "invalid_url" });
    }

    const youtube = await Innertube.create();

    const video = await youtube.getInfo(videoId);

    const formats = video.streaming_data?.adaptive_formats || [];

    const audio = formats
      .filter(f => f.mime_type.includes("audio"))
      .sort((a, b) => b.bitrate - a.bitrate)[0];

    if (!audio) {
      return res.status(404).json({ error: "no_audio_found" });
    }

    return res.json({
      ok: true,
      audioUrl: audio.url,
      title: video.basic_info?.title,
    });

  } catch (err) {
    return res.status(500).json({
      error: "failed",
      details: err.message,
    });
  }
});

// =========================
app.listen(3001, "0.0.0.0", () => {
  console.log("🚀 youtubei.js API running");
});
