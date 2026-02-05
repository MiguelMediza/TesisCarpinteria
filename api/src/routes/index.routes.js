
import { Router } from "express";
const router = Router();


// Proxy de imágenes para PDF
router.get("/files/proxy", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send("Missing url");
    if (!/^https?:\/\//i.test(url)) return res.status(400).send("Invalid url");

    const r = await fetch(url, { redirect: "follow" });
    if (!r.ok) return res.status(r.status).send("Fetch failed");

    res.setHeader("Content-Type", r.headers.get("content-type") || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=86400");
    const buf = Buffer.from(await r.arrayBuffer());
    res.status(200).send(buf);
  } catch (e) {
    console.error("Image proxy error:", e);
    res.status(500).send("Proxy error");
  }
});

export default router;
