const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());

const CACHE = "./cache";
if (!fs.existsSync(CACHE)) fs.mkdirSync(CACHE);

// =====================
// HEALTH
// =====================
app.get("/", (req, res) => {
  res.json({ ok: true, message: "YouTube to MP3 API running" });
});

// =====================
// VIDEO ID
// =====================
function getId(url) {
  const m = url.match(/(youtu\.be\/|v=|shorts\/)([^&?/]+)/);
  return m ? m[2] : null;
}

// =====================
// MAIN CONVERT
// =====================
app.post("/audio", (req, res) => {
  const { url } = req.body;

  if (!url) return res.status(400).json({ error: "missing url" });

  const id = getId(url);
  if (!id) return res.status(400).json({ error: "invalid url" });

  const output = `${CACHE}/${id}.mp3`;

  // cache
  if (fs.existsSync(output)) {
    return res.json({
      ok: true,
      cached: true,
      url: `/cache/${id}.mp3`,
    });
  }

  // download audio ONLY
  const cmd = `
yt-dlp -f bestaudio \
--extract-audio \
--audio-format mp3 \
--no-playlist \
--geo-bypass \
-o "${output}" \
"${url}"
`;

  exec(cmd, { maxBuffer: 1024 * 1024 * 50 }, (err) => {
    if (err) {
      return res.status(500).json({
        error: "download_failed",
        details: err.message,
      });
    }

    res.json({
      ok: true,
      cached: false,
      url: `/cache/${id}.mp3`,
    });
  });
});

// serve files
app.use("/cache", express.static("cache"));

app.listen(3001, "0.0.0.0", () => {
  console.log("🚀 YouTube MP3 API running on 3001");
});
