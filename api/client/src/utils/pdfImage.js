// /src/utils/pdfImage.js
import { api } from "../api";

const CDN_ORIGIN = "https://cdn.imanodstock.es";

export const getApiOrigin = () => {
  try { return new URL(api?.defaults?.baseURL || "/api/src", window.location.origin).origin; }
  catch { return window.location.origin; }
};

export const normalizeCdnUrl = (src) => {
  if (!src) return null;
  const s = String(src).trim();

  if (/^https?:\/\//i.test(s)) return s;

  const p = s.replace(/^\/?images\//i, "/");

  if (/^\/?(prototipos|fuego_ya)\//i.test(p)) {
    return `${CDN_ORIGIN}/${p.replace(/^\//, "")}`;
  }

  return new URL(s, window.location.origin).href;
};

export const getProxyUrl = (absUrl) =>
  absUrl ? `${getApiOrigin()}/api/src/files/proxy?url=${encodeURIComponent(absUrl)}` : null;

export const fetchAsJpegDataUrl = async (url) => {
  if (!url) return null;
  if (url.startsWith("data:image/jpeg")) return url;

  const resp = await fetch(url, { credentials: "omit" });
  if (!resp.ok) throw new Error(`img fetch failed: ${resp.status}`);
  const blob = await resp.blob();

  const objUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("image decode error"));
      i.src = objUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.9);
  } finally {
    URL.revokeObjectURL(objUrl);
  }
};
