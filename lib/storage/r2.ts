import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";

export type R2Configuration = {
  accountId: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
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
      secretAccessKey: values.R2_SECRET_ACCESS_KEY!
    }
  };
}

export function createR2Client(config: R2Configuration): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
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
