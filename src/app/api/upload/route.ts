import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getAuthSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getAuthSession(request);
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided for upload" },
        { status: 400 }
      );
    }

    // Validate mime type
    const validMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
      "image/avif",
    ];

    if (!validMimeTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file type. Only JPEG, PNG, WEBP, GIF, SVG, and AVIF images are allowed.",
        },
        { status: 400 }
      );
    }

    // Limit file size to 5MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "File size exceeds the 5MB limit." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate safe unique filename
    const ext = path.extname(file.name) || `.${file.type.split("/")[1] || "png"}`;
    const cleanExt = ext.replace(/[^a-zA-Z0-9.]/g, "").toLowerCase();
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const filename = `prod_${uniqueSuffix}${cleanExt}`;

    // 1. Primary Strategy: Supabase Storage (Persistent Cloud Storage for Vercel, Production & Multi-Device)
    try {
      if (supabaseAdmin) {
        // Ensure products bucket exists as a public bucket
        try {
          await supabaseAdmin.storage.createBucket("products", { public: true });
        } catch {
          // Ignore error if bucket already exists
        }

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from("products")
          .upload(filename, buffer, {
            contentType: file.type,
            upsert: true,
          });

        if (!uploadError && uploadData) {
          const { data: publicUrlData } = supabaseAdmin.storage
            .from("products")
            .getPublicUrl(uploadData.path || filename);

          if (publicUrlData?.publicUrl) {
            return NextResponse.json({
              success: true,
              url: publicUrlData.publicUrl,
              filename,
              size: file.size,
              storage: "supabase",
            });
          }
        } else if (uploadError) {
          console.warn("Supabase Storage upload warning, attempting fallback:", uploadError.message);
        }
      }
    } catch (sErr: any) {
      console.warn("Supabase Storage exception, attempting fallback:", sErr.message);
    }

    // 2. Secondary Strategy: Local filesystem (for local dev, Docker, Electron where filesystem is writable)
    try {
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "products");
      await mkdir(uploadsDir, { recursive: true });
      const filePath = path.join(uploadsDir, filename);
      await writeFile(filePath, buffer);

      return NextResponse.json({
        success: true,
        url: `/uploads/products/${filename}`,
        filename,
        size: file.size,
        storage: "local",
      });
    } catch (fsErr: any) {
      // Vercel serverless has a read-only filesystem (EROFS), so this branch will catch on Vercel if cloud storage failed
      console.warn("Local filesystem write skipped (serverless read-only environment):", fsErr.message);
    }

    // 3. Tertiary Strategy: Inline Base64 Data URL (guarantees images under 2MB work even on serverless without cloud configuration)
    if (file.size <= 2 * 1024 * 1024) {
      const base64 = buffer.toString("base64");
      const dataUrl = `data:${file.type};base64,${base64}`;
      return NextResponse.json({
        success: true,
        url: dataUrl,
        filename,
        size: file.size,
        storage: "inline-data",
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unable to upload image. Please check Supabase Storage settings or enter an image URL directly.",
      },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to upload image" },
      { status: 500 }
    );
  }
}
