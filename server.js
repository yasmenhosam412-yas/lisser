const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
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

// ============================
// 🔧 extract video id
// ============================
function getVideoId(url) {
  const match = url.match(/(youtu\.be\/|v=|shorts\/)([^&?/]+)/);
  return match ? match[2] : null;
}

// ============================
// ⚡ yt-dlp method (PRIMARY)
// ============================
function getAudioFromYtDlp(url) {
  return new Promise((resolve, reject) => {
    const cmd = `
      yt-dlp -f "bestaudio" \
      --no-playlist \
      --geo-bypass \
      -g "${url}"
    `;

    exec(cmd, { timeout: 20000 }, (err, stdout, stderr) => {
      if (err) return reject(err);
      const result = stdout.trim();
      if (!result) return reject(new Error("No yt-dlp result"));
      resolve(result);
    });
  });
}

// ============================
// 🌐 fallback (Invidious)
// ============================
async function getAudioFromInvidious(videoId) {
  const instances = [
    "https://yewtu.be",
    "https://inv.nadeko.net",
    "https://invidious.io.lol"
  ];

  for (const base of instances) {
    try {
      const url = `${base}/api/v1/videos/${videoId}`;

      const res = await axios.get(url, { timeout: 10000 });

      const formats = res.data?.adaptiveFormats || res.data?.formatStreams;

      if (!formats) continue;

      const audio =
        formats.find(f => f.mimeType?.includes("audio")) ||
        formats[0];

      if (audio?.url) {
        return {
          audioUrl: audio.url,
          title: res.data.title,
        };
      }
    } catch (e) {
      continue;
    }
  }

  throw new Error("All Invidious instances failed");
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
    // 1️⃣ Try yt-dlp FIRST
    // ============================
    try {
      const audioUrl = await getAudioFromYtDlp(url);

      return res.json({
        ok: true,
        source: "yt-dlp",
        audioUrl,
      });
    } catch (e) {
      console.log("yt-dlp failed → fallback");
    }

    // ============================
    // 2️⃣ fallback Invidious
    // ============================
    const fallback = await getAudioFromInvidious(videoId);

    return res.json({
      ok: true,
      source: "invidious",
      ...fallback,
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "internal_error",
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
