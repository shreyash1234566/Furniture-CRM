import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID
  if (!accountId) {
    throw new Error('R2_ACCOUNT_ID is not set')
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
  })
}

const BUCKET = process.env.R2_BUCKET_NAME || 'furniture-crm'

export async function uploadFile(
  file: Buffer,
  fileName: string,
  contentType: string,
  folder: string
): Promise<string> {
  const client = getR2Client()
  const ext = fileName.split('.').pop() || 'bin'
  const key = `${folder}/${randomUUID()}.${ext}`

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  )

  const publicUrl = process.env.R2_PUBLIC_URL
  if (publicUrl) {
    return `${publicUrl}/${key}`
  }

  return key
}

export async function getPresignedUploadUrl(
  folder: string,
  fileName: string,
  contentType: string
): Promise<{ url: string; key: string }> {
  const client = getR2Client()
  const ext = fileName.split('.').pop() || 'bin'
  const key = `${folder}/${randomUUID()}.${ext}`

  const url = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 600 }
  )

  return { url, key }
}

export async function deleteFile(key: string): Promise<void> {
  const client = getR2Client()
  await client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  )
}
