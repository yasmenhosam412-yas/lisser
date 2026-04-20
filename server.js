const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

// ============================
// HEALTH
// ============================
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Simple YouTube Audio API 🚀" });
});

// ============================
// GET VIDEO ID
// ============================
function getVideoId(url) {
  const match = url.match(/(youtu\.be\/|v=|shorts\/)([^&?/]+)/);
  return match ? match[2] : null;
}

// ============================
// AUDIO ENDPOINT
// ============================
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

    // ============================
    // 🔥 PIPED API (stable fallback)
    // ============================
    const api = `https://pipedapi.kavin.rocks/streams/${videoId}`;

    const response = await axios.get(api, { timeout: 10000 });

    const audioStreams = response.data?.audioStreams;

    if (!audioStreams || audioStreams.length === 0) {
      return res.status(404).json({ error: "no_audio_found" });
    }

    // أعلى جودة
    const bestAudio = audioStreams[0];

    return res.json({
      ok: true,
      audioUrl: bestAudio.url,
      title: response.data.title,
    });

  } catch (err) {
    return res.status(500).json({
      error: "failed",
      details: err.message,
    });
  }
});

// ============================
app.listen(3001, "0.0.0.0", () => {
  console.log("🚀 Simple Audio API running on 3001");
});
