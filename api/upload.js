/**
 * /api/upload — File upload handler for architecture diagrams
 *
 * Accepts: multipart/form-data with fields:
 *   file     — the uploaded file (PDF, PNG, JPG, PPTX)
 *   org_id   — organization UUID
 *
 * On upload: stores metadata in Neon, runs AI analysis,
 * returns the asset record.
 *
 * NOTE: For production file storage, integrate Vercel Blob,
 * Cloudflare R2, or AWS S3. This implementation stores metadata
 * in Neon and performs AI analysis on supported text-extractable files.
 * Binary storage URL is set as a placeholder until storage is wired.
 */

import { neon } from "@neondatabase/serverless";
import formidable from "formidable";
import fs from "fs";
import path from "path";

export const config = {
  api: { bodyParser: false },
};

const ALLOWED_TYPES = new Set([
  "image/png", "image/jpeg", "image/jpg",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const MAX_SIZE_MB = 10;

async function analyzeWithAI(filename, fileType, fileContent) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return "AI analysis unavailable.";

  let userPrompt;
  if (fileType.startsWith("image/")) {
    // For images, use vision API
    const base64 = fileContent.toString("base64");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 800,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: fileType,
                data: base64,
              },
            },
            {
              type: "text",
              text: "This is an architecture diagram. Extract and list: 1) All system components and services you can identify, 2) APIs or integrations visible, 3) Data flows, 4) External dependencies. Format as structured bullet points under those 4 headers.",
            },
          ],
        }],
      }),
    });
    const data = await response.json();
    return data.content?.[0]?.text || "Could not analyze image.";
  }

  // For non-image files, provide a placeholder analysis
  return `Architecture asset uploaded: ${filename}\n\nFile type: ${fileType}\n\nTo extract components from PDF or PPTX files, integrate a document parsing service (e.g., AWS Textract, Azure Document Intelligence) and re-run analysis. For PNG/JPG diagrams, re-upload as an image format for AI vision analysis.`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ error: "DATABASE_URL not configured" });

  return new Promise((resolve) => {
    const form = formidable({
      maxFileSize: MAX_SIZE_MB * 1024 * 1024,
      keepExtensions: true,
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        res.status(400).json({ error: `Upload error: ${err.message}` });
        return resolve();
      }

      const org_id = Array.isArray(fields.org_id) ? fields.org_id[0] : fields.org_id;
      const file = Array.isArray(files.file) ? files.file[0] : files.file;

      if (!org_id) {
        res.status(400).json({ error: "org_id is required" });
        return resolve();
      }
      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return resolve();
      }

      const fileType = file.mimetype || "application/octet-stream";
      if (!ALLOWED_TYPES.has(fileType)) {
        res.status(400).json({ error: `File type not allowed: ${fileType}. Allowed: PNG, JPG, PDF, PPTX` });
        return resolve();
      }

      try {
        // Read file content for AI analysis
        const fileContent = fs.readFileSync(file.filepath);
        const filename = file.originalFilename || path.basename(file.filepath);

        // Run AI analysis
        const ai_analysis = await analyzeWithAI(filename, fileType, fileContent);

        // Extract components as structured array (simplified — production would parse AI output)
        const components = [];

        // Store in DB
        const sql = neon(dbUrl);
        const rows = await sql`
          INSERT INTO architecture_assets (org_id, filename, file_type, file_size, ai_analysis, components)
          VALUES (${org_id}, ${filename}, ${fileType}, ${file.size}, ${ai_analysis}, ${JSON.stringify(components)})
          RETURNING *
        `;

        // Clean up temp file
        try { fs.unlinkSync(file.filepath); } catch (_) {}

        res.status(200).json({ data: rows[0] });
        resolve();
      } catch (error) {
        console.error("Upload handler error:", error);
        res.status(500).json({ error: error.message });
        resolve();
      }
    });
  });
}
