// lib/r2.js
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import path from "path";

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_BASE_URL,
} = process.env;

// Validaciones tempranas y claras (evita “No value provided for input HTTP label: Bucket”)
if (!R2_ACCOUNT_ID) throw new Error("R2_ACCOUNT_ID is not set");
if (!R2_ACCESS_KEY_ID) throw new Error("R2_ACCESS_KEY_ID is not set");
if (!R2_SECRET_ACCESS_KEY) throw new Error("R2_SECRET_ACCESS_KEY is not set");
if (!R2_BUCKET) throw new Error("R2_BUCKET is not set");

const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

export const r2 = new S3Client({
  region: "auto",
  endpoint,
  forcePathStyle: true, // importante para R2 con endpoint de cuenta
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function r2Put({ folder = "", file }) {
  if (!file) throw new Error("r2Put: missing file");

  const ext = path.extname(file.originalname || "");
  const base = path.basename(file.originalname || "file", ext);
  const safeBase = base.replace(/\s+/g, "_").replace(/[^\w.-]/g, "");
  const key = `${folder ? folder + "/" : ""}${Date.now()}_${safeBase}${ext}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,               // <- si esto fuera undefined, verías tu error
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype || "application/octet-stream",
    })
  );

  const publicBase = (R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  const url = publicBase
    ? `${publicBase}/${key}`                             // p. ej. https://cdn.imanodstock.es/carpeta/archivo.jpg
    : `${endpoint}/${R2_BUCKET}/${key}`;                // fallback

  return { key, url };
}

export async function r2Delete(key) {
  if (!key) return;
  await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}



