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
  res.send("🚀 Production YouTube Gateway API Running");
});

// ============================
// 🧠 SIMPLE CACHE (RAM)
// ============================
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 30; // 30 min

function setCache(key, value) {
  cache.set(key, {
    value,
    expire: Date.now() + CACHE_TTL,
  });
}

function getCache(key) {
  const data = cache.get(key);
  if (!data) return null;

  if (Date.now() > data.expire) {
    cache.delete(key);
    return null;
  }

  return data.value;
}

// ============================
// 🔧 extract video id
// ============================
function getVideoId(url) {
  const match = url.match(/(youtu\.be\/|v=|shorts\/)([^&?/]+)/);
  return match ? match[2] : null;
}

// ============================
// 🌐 Invidious Instances (Fallback)
// ============================
const INSTANCES = [
  "https://yewtu.be",
  "https://invidious.projectsegfau.lt",
  "https://vid.puffyan.us",
  "https://invidious.privacydev.net"
];

// ============================
// 🔥 FETCH FROM INSTANCES
// ============================
async function fetchFromInstances(videoId) {
  for (const base of INSTANCES) {
    try {
      const url = `${base}/api/v1/videos/${videoId}`;

      const res = await axios.get(url, {
        timeout: 5000,
      });

      if (res.data && res.data.formatStreams) {
        return res.data;
      }
    } catch (err) {
      // try next instance
      continue;
    }
  }

  return null;
}

// ============================
// 🎧 AUDIO ENDPOINT (PRODUCTION)
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
    // ⚡ CACHE CHECK
    // ============================
    const cached = getCache(videoId);
    if (cached) {
      return res.json({
        ...cached,
        cached: true,
      });
    }

    // ============================
    // 🔥 FETCH DATA
    // ============================
    const data = await fetchFromInstances(videoId);

    if (!data) {
      return res.status(500).json({
        error: "All instances failed",
      });
    }

    const formats = data.formatStreams || [];

    if (!formats.length) {
      return res.status(404).json({
        error: "No streams found",
      });
    }

    // ============================
    // 🎯 PICK BEST AUDIO
    // ============================
    const audio =
      formats.find(f => f.mimeType.includes("audio")) ||
      formats[formats.length - 1];

    const result = {
      audioUrl: audio.url,
      title: data.title,
      duration: data.lengthSeconds,
      ok: true,
    };

    // ============================
    // 💾 SAVE CACHE
    // ============================
    setCache(videoId, result);

    return res.json(result);

  } catch (err) {
    console.error("ERROR:", err.message);

    return res.status(500).json({
      error: "server_error",
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
