const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const instances = [
  "https://yewtu.be",
  "https://invidious.snopyta.org",
  "https://invidious.kavin.rocks"
];

function getId(url) {
  const m = url.match(/(youtu\.be\/|v=|shorts\/)([^&?/]+)/);
  return m ? m[2] : null;
}

async function fetchFromInvidious(id) {
  for (let base of instances) {
    try {
      const res = await axios.get(`${base}/api/v1/videos/${id}`, {
        timeout: 5000
      });

      const formats = res.data?.formatStreams || [];

      const audio =
        formats.find(f => f.mimeType.includes("audio")) ||
        formats[0];

      if (audio?.url) {
        return {
          audioUrl: audio.url,
          title: res.data.title
        };
      }
    } catch (e) {
      continue;
    }
  }

  throw new Error("all instances failed");
}

app.post("/audio", async (req, res) => {
  try {
    const { url } = req.body;

    const id = getId(url);
    if (!id) return res.status(400).json({ error: "invalid url" });

    const data = await fetchFromInvidious(id);

    res.json({
      ok: true,
      ...data
    });

  } catch (err) {
    res.status(500).json({
      error: "failed",
      details: err.message
    });
  }
});

app.listen(3001, () => {
  console.log("🚀 stable no-yt-dlp API running");
});
