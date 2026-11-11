import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type R2Configuration = {
  accountId: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  endpoint: string;
};

const requiredR2Variables = [
  "R2_ACCOUNT_ID",
  "R2_BUCKET_NAME",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY"
] as const;

export function getR2Configuration():
  | { configured: true; config: R2Configuration }
  | { configured: false; missingVariables: string[] } {
  const values = {
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID?.trim(),
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME?.trim(),
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID?.trim(),
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY?.trim()
  };

  const missingVariables = requiredR2Variables.filter((name) => !values[name]);

  if (missingVariables.length > 0) {
    return { configured: false, missingVariables };
  }

  return {
    configured: true,
    config: {
      accountId: values.R2_ACCOUNT_ID!,
      bucketName: values.R2_BUCKET_NAME!,
      accessKeyId: values.R2_ACCESS_KEY_ID!,
      secretAccessKey: values.R2_SECRET_ACCESS_KEY!,
      region: process.env.R2_REGION?.trim() || "auto",
      endpoint:
        process.env.R2_ENDPOINT?.trim() ||
        `https://${values.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    }
  };
}

export function createR2Client(config: R2Configuration): S3Client {
  const endpoint = new URL(config.endpoint);
  const expectedHost = `${config.accountId}.r2.cloudflarestorage.com`;

  if (endpoint.protocol !== "https:" || endpoint.hostname !== expectedHost) {
    throw new Error("R2_ENDPOINT must be the HTTPS S3 endpoint for the configured account.");
  }

  return new S3Client({
    region: config.region,
    endpoint: endpoint.toString(),
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    },
    maxAttempts: 2
  });
}

export async function checkR2BucketAccess(config: R2Configuration): Promise<void> {
  const client = createR2Client(config);
  try {
    await client.send(new HeadBucketCommand({ Bucket: config.bucketName }));
  } finally {
    client.destroy();
  }
}

export async function createR2UploadUrl(
  config: R2Configuration,
  key: string,
  contentType: string
): Promise<string> {
  const client = createR2Client(config);
  try {
    return await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: config.bucketName,
        Key: key,
        ContentType: contentType
      }),
      { expiresIn: 300 }
    );
  } finally {
    client.destroy();
  }
}

export async function inspectR2Object(
  config: R2Configuration,
  key: string
): Promise<{ contentLength: number; contentType: string | undefined }> {
  const client = createR2Client(config);
  try {
    const result = await client.send(
      new HeadObjectCommand({ Bucket: config.bucketName, Key: key })
    );
    return {
      contentLength: result.ContentLength ?? 0,
      contentType: result.ContentType
    };
  } finally {
    client.destroy();
  }
}

export async function deleteR2Object(config: R2Configuration, key: string): Promise<void> {
  const client = createR2Client(config);
  try {
    await client.send(new DeleteObjectCommand({ Bucket: config.bucketName, Key: key }));
  } finally {
    client.destroy();
  }
}

export async function createR2ReadUrl(
  config: R2Configuration,
  key: string,
  expiresIn = 3600
): Promise<string> {
  const client = createR2Client(config);
  try {
    return await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: config.bucketName, Key: key }),
      { expiresIn }
    );
  } finally {
    client.destroy();
  }
}
