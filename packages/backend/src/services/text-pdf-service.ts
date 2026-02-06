import PDFDocument from 'pdfkit'

export async function generateTextPdf(options: {
  title?: string
  text: string
}): Promise<Buffer> {
  const { title, text } = options

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 54, left: 54, right: 54, bottom: 54 },
      })

      const buffers: Buffer[] = []
      doc.on('data', (b) => buffers.push(Buffer.isBuffer(b) ? b : Buffer.from(b)))
      doc.on('end', () => resolve(Buffer.concat(buffers)))

      if (title) {
        doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'left' })
        doc.moveDown(0.75)
      }

      doc.fontSize(11).font('Helvetica').text(text, {
        align: 'left',
      })

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}


