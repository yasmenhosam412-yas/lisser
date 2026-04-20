const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());

// ============================
// HEALTH
// ============================
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Audio API running" });
});

// ============================
// DOWNLOAD + STREAM AUDIO
// ============================
app.post("/audio", (req, res) => {
  const { url } = req.body;

  if (!url) return res.status(400).json({ error: "Missing URL" });

  const fileId = Date.now();
  const output = `/tmp/${fileId}.mp3`;

  const yt = spawn("yt-dlp", [
    "-f", "bestaudio",
    "--no-playlist",
    "--extract-audio",
    "--audio-format", "mp3",
    "-o", output,
    url
  ]);

  yt.on("close", (code) => {
    if (code !== 0) {
      return res.status(500).json({ error: "download_failed" });
    }

    // return streaming URL
    const audioUrl = `/stream/${fileId}`;
    res.json({ ok: true, audioUrl });
  });
});

// ============================
// STREAM AUDIO FILE
// ============================
app.get("/stream/:id", (req, res) => {
  const filePath = `/tmp/${req.params.id}.mp3`;

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Not found");
  }

  res.setHeader("Content-Type", "audio/mpeg");

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

// ============================
// START
// ============================
app.listen(3001, "0.0.0.0", () => {
  console.log("🚀 Audio server running on 3001");
});
