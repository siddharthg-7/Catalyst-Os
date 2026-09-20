import 'dotenv/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListBucketsCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const endpoint = process.env.AWS_ENDPOINT_URL_S3;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION || 'us-east-2';
export const DEFAULT_BUCKET = process.env.AWS_S3_BUCKET || 'catalyst-documents';

let s3ClientInstance: S3Client | null = null;
let bucketVerified = false;

/**
 * Returns true if S3 environment variables are provided.
 */
export function isS3Configured(): boolean {
  return Boolean(endpoint && accessKeyId && secretAccessKey);
}

/**
 * Returns a singleton S3Client instance configured for Neon S3 Object Storage.
 */
export function getS3Client(): S3Client | null {
  if (!isS3Configured()) {
    return null;
  }

  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
      forcePathStyle: true,
    });
  }

  return s3ClientInstance;
}

/**
 * Ensures the target S3 bucket exists, creating it if necessary.
 */
export async function ensureBucketExists(bucketName: string = DEFAULT_BUCKET): Promise<boolean> {
  const client = getS3Client();
  if (!client) return false;
  if (bucketVerified) return true;

  try {
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucketName }));
      bucketVerified = true;
      return true;
    } catch (headErr: any) {
      if (headErr.name === 'NotFound' || headErr.$metadata?.httpStatusCode === 404) {
        console.log(`[s3Service] Bucket '${bucketName}' not found. Creating bucket...`);
        await client.send(new CreateBucketCommand({ Bucket: bucketName }));
        bucketVerified = true;
        console.log(`[s3Service] Bucket '${bucketName}' created successfully.`);
        return true;
      }
      throw headErr;
    }
  } catch (err: any) {
    console.warn(`[s3Service] Unable to verify/create bucket '${bucketName}':`, err.message);
    return false;
  }
}

export interface UploadOptions {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
  metadata?: Record<string, string>;
  bucket?: string;
}

/**
 * Uploads an object to Neon S3 storage.
 */
export async function uploadToS3(options: UploadOptions): Promise<{ key: string; bucket: string; url: string }> {
  const client = getS3Client();
  if (!client) {
    throw new Error('S3 client is not configured. Check AWS_ENDPOINT_URL_S3 and credentials in .env.');
  }

  const bucket = options.bucket || DEFAULT_BUCKET;
  await ensureBucketExists(bucket);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: options.key,
    Body: options.body,
    ContentType: options.contentType || 'application/octet-stream',
    Metadata: options.metadata,
  });

  await client.send(command);
  const url = `${endpoint}/${bucket}/${options.key}`;
  console.log(`[s3Service] Uploaded object successfully: ${url}`);
  return { key: options.key, bucket, url };
}

/**
 * Generates a presigned URL for downloading an object securely.
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresInSeconds: number = 3600,
  bucket: string = DEFAULT_BUCKET
): Promise<string> {
  const client = getS3Client();
  if (!client) {
    throw new Error('S3 client is not configured.');
  }

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Deletes an object from Neon S3 storage.
 */
export async function deleteFromS3(key: string, bucket: string = DEFAULT_BUCKET): Promise<boolean> {
  const client = getS3Client();
  if (!client) return false;

  try {
    await client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }));
    return true;
  } catch (err: any) {
    console.error(`[s3Service] Error deleting object '${key}':`, err.message);
    return false;
  }
}

/**
 * Health check for Neon S3 Object Storage.
 */
export async function checkS3Health(): Promise<{
  configured: boolean;
  connected: boolean;
  bucket: string;
  endpoint?: string;
  buckets?: string[];
  error?: string;
}> {
  if (!isS3Configured()) {
    return {
      configured: false,
      connected: false,
      bucket: DEFAULT_BUCKET,
    };
  }

  const client = getS3Client();
  if (!client) {
    return {
      configured: false,
      connected: false,
      bucket: DEFAULT_BUCKET,
      error: 'Failed to initialize S3 client.',
    };
  }

  try {
    const listRes = await client.send(new ListBucketsCommand({}));
    const bucketNames = (listRes.Buckets || []).map((b) => b.Name || '');
    return {
      configured: true,
      connected: true,
      bucket: DEFAULT_BUCKET,
      endpoint,
      buckets: bucketNames,
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      bucket: DEFAULT_BUCKET,
      endpoint,
      error: err.message,
    };
  }
}

export default {
  isS3Configured,
  getS3Client,
  ensureBucketExists,
  uploadToS3,
  getPresignedDownloadUrl,
  deleteFromS3,
  checkS3Health,
};
