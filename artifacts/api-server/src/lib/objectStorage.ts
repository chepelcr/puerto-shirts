import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Uploads go directly to a private-but-public-read S3 bucket that sits behind
// CloudFront (uploads.shirts.jcampos.dev). The client asks the API for a
// presigned PUT URL, uploads the file straight to S3, then references the file
// by its public CloudFront URL. Reads are served by CloudFront, not the API.

const region = process.env.AWS_REGION || "us-east-1";
const s3 = new S3Client({ region });

const UPLOAD_URL_TTL_SEC = 900;

function getUploadsBucket(): string {
  const bucket = process.env.UPLOADS_BUCKET;
  if (!bucket) {
    throw new Error(
      "UPLOADS_BUCKET env var is required (the S3 bucket created by cloudformation/s3-uploads.yaml).",
    );
  }
  return bucket;
}

function getPublicAssetBaseUrl(): string {
  const url = process.env.PUBLIC_ASSET_BASE_URL;
  if (!url) {
    throw new Error(
      "PUBLIC_ASSET_BASE_URL env var is required (e.g. https://uploads.shirts.jcampos.dev).",
    );
  }
  return url.replace(/\/+$/, "");
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export interface UploadTarget {
  /** Presigned S3 URL the client PUTs the file to. */
  uploadURL: string;
  /** S3 object key, e.g. `uploads/<uuid>`. */
  key: string;
  /** Public CloudFront URL to store/display, e.g. `https://uploads.shirts.jcampos.dev/uploads/<uuid>`. */
  publicUrl: string;
}

export class ObjectStorageService {
  constructor() {}

  /**
   * Create a presigned PUT URL for a new object plus the public URL it will be
   * served from once uploaded. Content-Type is left unsigned so the client's
   * upload header sets the stored content type.
   */
  async createUploadTarget(): Promise<UploadTarget> {
    const key = `uploads/${randomUUID()}`;
    const command = new PutObjectCommand({
      Bucket: getUploadsBucket(),
      Key: key,
    });
    const uploadURL = await getSignedUrl(s3, command, {
      expiresIn: UPLOAD_URL_TTL_SEC,
    });
    return { uploadURL, key, publicUrl: this.publicUrlForKey(key) };
  }

  /** Build the public CloudFront URL for an object key. */
  publicUrlForKey(key: string): string {
    return `${getPublicAssetBaseUrl()}/${key.replace(/^\/+/, "")}`;
  }
}
