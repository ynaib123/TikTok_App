import fs from 'node:fs'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

export interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  publicBaseUrl: string
}

export interface R2UploadInput {
  filePath: string
  key: string
  contentType: string
  cacheControl?: string
}

export interface R2UploadResult {
  key: string
  url: string
}

let cachedClient: S3Client | null = null
let cachedConfig: R2Config | null = null

export function readR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucketName = process.env.R2_BUCKET_NAME
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicBaseUrl) {
    return null
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicBaseUrl: publicBaseUrl.replace(/\/+$/, ''),
  }
}

export function isR2Enabled(): boolean {
  return readR2Config() !== null
}

function getClient(config: R2Config): S3Client {
  if (cachedClient && cachedConfig
      && cachedConfig.accountId === config.accountId
      && cachedConfig.accessKeyId === config.accessKeyId) {
    return cachedClient
  }
  cachedConfig = config
  cachedClient = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
  return cachedClient
}

export async function uploadToR2(input: R2UploadInput, configOverride?: R2Config | null): Promise<R2UploadResult> {
  const config = configOverride ?? readR2Config()
  if (!config) {
    throw new Error('R2 is not configured (set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_BASE_URL)')
  }

  const client = getClient(config)
  const body = fs.readFileSync(input.filePath)

  await client.send(new PutObjectCommand({
    Bucket: config.bucketName,
    Key: input.key,
    Body: body,
    ContentType: input.contentType,
    CacheControl: input.cacheControl || 'public, max-age=31536000, immutable',
  }))

  return {
    key: input.key,
    url: `${config.publicBaseUrl}/${input.key}`,
  }
}
