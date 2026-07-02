import { Router, type IRouter, type Request, type Response } from "express";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * @swagger
 * /api/storage/uploads/request-url:
 *   post:
 *     summary: Request a presigned S3 URL for a file upload
 *     description: >
 *       The client sends JSON metadata (name, size, contentType) — NOT the file —
 *       then PUTs the file directly to the returned presigned URL. `objectPath` is
 *       the public CloudFront URL to store / display the asset.
 *     tags: [Storage]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { type: object } } }
 *     responses:
 *       200: { description: Presigned upload URL + public object path }
 *       400: { description: Missing or invalid fields }
 *       500: { description: Failed to generate upload URL }
 */
router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  try {
    const { name, size, contentType } = parsed.data;

    const { uploadURL, publicUrl } = await objectStorageService.createUploadTarget();

    res.json(
      RequestUploadUrlResponse.parse({
        uploadURL,
        objectPath: publicUrl,
        metadata: { name, size, contentType },
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

export default router;
