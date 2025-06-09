import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: 'auto',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,
})

const BUCKET_NAME = process.env.S3_BUCKET!

export async function uploadReport(
  scanId: string, 
  companyName: string, 
  content: string, 
  format: 'html' | 'pdf' | 'json' = 'html'
): Promise<string> {
  const timestamp = Date.now()
  const sanitizedCompany = companyName.replace(/[^a-zA-Z0-9]/g, '_')
  const key = `reports/${sanitizedCompany}/${scanId}_${timestamp}.${format}`
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: content,
    ContentType: format === 'html' ? 'text/html' : 
                 format === 'pdf' ? 'application/pdf' : 
                 'application/json',
    Metadata: {
      scanId,
      companyName,
      generatedAt: new Date().toISOString(),
    }
  })
  
  await s3Client.send(command)
  return key
}

export async function getReportUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })
  
  return await getSignedUrl(s3Client, command, { expiresIn })
}

export async function listReports(prefix: string = 'reports/'): Promise<any[]> {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
  })
  
  const response = await s3Client.send(command)
  return response.Contents || []
}