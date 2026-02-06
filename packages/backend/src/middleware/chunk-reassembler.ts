import { Context, Hono } from 'hono'
import fs from 'node:fs'
import path from 'node:path'

export const chunkReassembler = (app: Hono<any, any, any>) => {
    return async (c: Context) => {
        const body = await c.req.parseBody();

        const uploadId = body['uploadId'] as string
        const index = body['index'] as string
        const isLast = body['isLast'] === 'true'
        const originalPath = body['originalPath'] as string
        const chunk = body['chunk'] as Blob // Hono parses files as Blobs/Files

        if (!uploadId || !chunk) {
            return c.json({error: 'Missing chunk data'}, 400)
        }

        const tempDir = path.join(process.cwd(), 'temp_uploads')
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir)

        const tempFilePath = path.join(tempDir, `${uploadId}.json.tmp`)

        // Convert Blob to Buffer and append to file
        const arrayBuffer = await chunk.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        fs.appendFileSync(tempFilePath, buffer)

        if (isLast) {
            try {
                const fullContent = fs.readFileSync(tempFilePath, 'utf8')
                const finalObject = JSON.parse(fullContent)
                fs.unlinkSync(tempFilePath) // Cleanup

                // --- THE REDISPATCH ---
                // We create a NEW Request object and tell Hono to process it
                // as if it were a fresh call to the original API path.
                const newRequest = new Request(new URL(originalPath, c.req.url).toString(), {
                    method: 'POST',
                    headers: {
                        ...c.req.header(),
                        'content-type': 'application/json',
                    },
                    body: JSON.stringify(finalObject),
                })

                // Hono's app.fetch allows us to re-inject this request into the system
                return app.fetch(newRequest)
            } catch (err) {
                if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath)
                return c.json({error: 'Failed to reassemble JSON'}, 500)
            }
        }

        // Not the last chunk
        return c.json({status: 'chunk_received', index}, 202)
    }
}