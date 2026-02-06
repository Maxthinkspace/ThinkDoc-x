import PDFDocument from 'pdfkit'
import { logger } from '@/config/logger'

interface DiffSegment {
  type: 'unchanged' | 'added' | 'removed'
  text: string
}

interface ChangeSummary {
  index: number
  changeType: 'Deleted' | 'Added' | 'Modified'
  originalText: string
  newText: string
  location: string
}

interface RedlinePdfOptions {
  documentName: string
  versionA: {
    label: string
    content: string
    date: Date
    editor: string
  }
  versionB: {
    label: string
    content: string
    date: Date
    editor: string
  }
}

/**
 * Word-level diff algorithm (LCS-based)
 */
function computeWordDiff(oldText: string, newText: string): DiffSegment[] {
  const oldWords = oldText.split(/(\s+)/)
  const newWords = newText.split(/(\s+)/)

  // LCS (Longest Common Subsequence) approach
  const lcsMatrix: number[][] = []
  for (let i = 0; i <= oldWords.length; i++) {
    lcsMatrix[i] = []
    for (let j = 0; j <= newWords.length; j++) {
      if (i === 0 || j === 0) {
        lcsMatrix[i][j] = 0
      } else if (oldWords[i - 1] === newWords[j - 1]) {
        lcsMatrix[i][j] = lcsMatrix[i - 1][j - 1] + 1
      } else {
        lcsMatrix[i][j] = Math.max(lcsMatrix[i - 1][j], lcsMatrix[i][j - 1])
      }
    }
  }

  // Backtrack to find the diff
  const result: DiffSegment[] = []
  let i = oldWords.length
  let j = newWords.length
  const tempResult: DiffSegment[] = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      tempResult.unshift({ type: 'unchanged', text: oldWords[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || lcsMatrix[i][j - 1] >= lcsMatrix[i - 1][j])) {
      tempResult.unshift({ type: 'added', text: newWords[j - 1] })
      j--
    } else if (i > 0) {
      tempResult.unshift({ type: 'removed', text: oldWords[i - 1] })
      i--
    }
  }

  // Merge consecutive segments of the same type
  for (const segment of tempResult) {
    if (result.length > 0 && result[result.length - 1].type === segment.type) {
      result[result.length - 1].text += segment.text
    } else {
      result.push({ ...segment })
    }
  }

  return result
}

/**
 * Extract change summary from diff segments
 */
function extractChangeSummary(diffSegments: DiffSegment[]): ChangeSummary[] {
  const changes: ChangeSummary[] = []
  let changeIndex = 1
  let paragraphIndex = 1
  let currentParagraph: DiffSegment[] = []
  let inParagraph = false

  for (let i = 0; i < diffSegments.length; i++) {
    const segment = diffSegments[i]
    const isParagraphBreak = segment.text.includes('\n\n') || segment.text.includes('\r\n\r\n')

    if (isParagraphBreak || i === diffSegments.length - 1) {
      if (currentParagraph.length > 0) {
        // Analyze paragraph for changes
        const removedTexts: string[] = []
        const addedTexts: string[] = []
        let hasRemoved = false
        let hasAdded = false

        for (const seg of currentParagraph) {
          if (seg.type === 'removed') {
            removedTexts.push(seg.text.trim())
            hasRemoved = true
          } else if (seg.type === 'added') {
            addedTexts.push(seg.text.trim())
            hasAdded = true
          }
        }

        if (hasRemoved && hasAdded) {
          // Modified
          changes.push({
            index: changeIndex++,
            changeType: 'Modified',
            originalText: removedTexts.join(' ').substring(0, 100) + (removedTexts.join(' ').length > 100 ? '...' : ''),
            newText: addedTexts.join(' ').substring(0, 100) + (addedTexts.join(' ').length > 100 ? '...' : ''),
            location: `Para ${paragraphIndex}`,
          })
        } else if (hasRemoved) {
          // Deleted
          changes.push({
            index: changeIndex++,
            changeType: 'Deleted',
            originalText: removedTexts.join(' ').substring(0, 100) + (removedTexts.join(' ').length > 100 ? '...' : ''),
            newText: '-',
            location: `Para ${paragraphIndex}`,
          })
        } else if (hasAdded) {
          // Added
          changes.push({
            index: changeIndex++,
            changeType: 'Added',
            originalText: '-',
            newText: addedTexts.join(' ').substring(0, 100) + (addedTexts.join(' ').length > 100 ? '...' : ''),
            location: `Para ${paragraphIndex}`,
          })
        }

        paragraphIndex++
        currentParagraph = []
      }
    } else {
      currentParagraph.push(segment)
    }
  }

  return changes
}

/**
 * Generate PDF with redline track changes
 */
export async function generateRedlinePdf(options: RedlinePdfOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 72, bottom: 72, left: 72, right: 72 },
      })

      const buffers: Buffer[] = []
      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(pdfBuffer)
      })
      doc.on('error', reject)

      // Compute diff
      const diffSegments = computeWordDiff(options.versionA.content, options.versionB.content)
      const changeSummary = extractChangeSummary(diffSegments)

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text(options.documentName, { align: 'center' })
      doc.moveDown(0.5)

      doc.fontSize(12).font('Helvetica')
      doc.text(`Version Comparison: ${options.versionA.label} vs ${options.versionB.label}`, { align: 'center' })
      doc.moveDown(0.5)

      // Version info table
      const versionInfoY = doc.y
      doc.fontSize(10)
      doc.text(`Previous Version (${options.versionA.label}):`, 72, versionInfoY)
      doc.text(`  Date: ${options.versionA.date.toLocaleDateString()}`, 72, doc.y)
      doc.text(`  Editor: ${options.versionA.editor}`, 72, doc.y)
      doc.moveDown(0.5)

      doc.text(`Current Version (${options.versionB.label}):`, 72, doc.y)
      doc.text(`  Date: ${options.versionB.date.toLocaleDateString()}`, 72, doc.y)
      doc.text(`  Editor: ${options.versionB.editor}`, 72, doc.y)
      doc.moveDown(1)

      // Legend
      doc.fontSize(10).font('Helvetica-Bold').text('Legend:', 72, doc.y)
      doc.moveDown(0.3)
      doc.font('Helvetica')
      doc.fillColor('#DC2626').text('Red strikethrough', { continued: true })
      doc.fillColor('#000000').text(' = Deleted text')
      doc.moveDown(0.2)
      doc.fillColor('#2563EB').text('Blue underline', { continued: true })
      doc.fillColor('#000000').text(' = Added text')
      doc.moveDown(1)

      // Redline content
      doc.fontSize(11).font('Helvetica').fillColor('#000000')
      doc.moveDown(0.5)
      
      const pageWidth = doc.page.width - 144 // margins
      const lineHeight = 14

      // Render each segment with appropriate formatting
      for (const segment of diffSegments) {
        // Check if we need a new page
        if (doc.y > doc.page.height - 100) {
          doc.addPage()
        }

        const text = segment.text
        
        if (segment.type === 'removed') {
          // Red strikethrough text
          doc.fillColor('#DC2626')
          
          // Split into lines for proper strikethrough rendering
          const lines = text.split('\n')
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            
            if (line.trim() === '') {
              doc.moveDown(0.3)
              continue
            }
            
            // Store Y position before rendering
            const startY = doc.y
            
            // Render text with wrapping
            doc.text(line, {
              width: pageWidth,
              align: 'left',
            })
            
            // Draw strikethrough on all rendered lines
            // Calculate how many lines were rendered
            const words = line.split(' ')
            let currentLine = ''
            let yPos = startY
            
            for (const word of words) {
              const testLine = currentLine ? `${currentLine} ${word}` : word
              const testWidth = doc.widthOfString(testLine)
              
              if (testWidth > pageWidth && currentLine) {
                // Draw strikethrough for this wrapped line
                const lineWidth = doc.widthOfString(currentLine)
                doc.moveTo(72, yPos + 3)
                  .lineTo(72 + lineWidth, yPos + 3)
                  .strokeColor('#DC2626')
                  .lineWidth(1)
                  .stroke()
                
                yPos += lineHeight
                currentLine = word
              } else {
                currentLine = testLine
              }
            }
            
            // Draw strikethrough for last/final line
            if (currentLine) {
              const lineWidth = doc.widthOfString(currentLine)
              doc.moveTo(72, yPos + 3)
                .lineTo(72 + lineWidth, yPos + 3)
                .strokeColor('#DC2626')
                .lineWidth(1)
                .stroke()
            }
            
            if (i < lines.length - 1) {
              doc.moveDown(0.2)
            }
          }
        } else if (segment.type === 'added') {
          // Blue underlined text
          doc.fillColor('#2563EB')
          doc.text(text, {
            width: pageWidth,
            align: 'left',
            underline: true,
          })
        } else {
          // Unchanged - black text
          doc.fillColor('#000000')
          doc.text(text, {
            width: pageWidth,
            align: 'left',
          })
        }
      }

      // Move to next page for summary table
      doc.addPage()
      y = 72

      // Summary table header
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000')
      doc.text('Changes Summary', 72, y, { align: 'center' })
      doc.moveDown(1)

      // Table headers
      y = doc.y
      const colWidths = [30, 60, 180, 180, 80]
      const colX = [72, 102, 162, 342, 522]

      doc.fontSize(10).font('Helvetica-Bold')
      doc.text('#', colX[0], y)
      doc.text('Type', colX[1], y)
      doc.text('Original Text', colX[2], y)
      doc.text('New Text', colX[3], y)
      doc.text('Location', colX[4], y)

      // Draw header underline
      y += 15
      doc.moveTo(72, y).lineTo(602, y).strokeColor('#000000').lineWidth(0.5).stroke()
      y += 5

      // Table rows
      doc.font('Helvetica').fontSize(9)
      for (const change of changeSummary) {
        if (y > doc.page.height - 50) {
          doc.addPage()
          y = 72
        }

        doc.text(String(change.index), colX[0], y)
        doc.text(change.changeType, colX[1], y)

        // Wrap text for Original Text column
        const originalText = doc.heightOfString(change.originalText, { width: colWidths[2] - 5 })
        doc.text(change.originalText, colX[2], y, { width: colWidths[2] - 5 })

        // Wrap text for New Text column
        doc.text(change.newText, colX[3], y, { width: colWidths[3] - 5 })

        doc.text(change.location, colX[4], y)

        y += Math.max(originalText, 15) + 5

        // Draw row separator
        doc.moveTo(72, y - 2).lineTo(602, y - 2).strokeColor('#CCCCCC').lineWidth(0.3).stroke()
      }

      // Footer
      doc.fontSize(8).font('Helvetica').fillColor('#666666')
      doc.text(
        `Generated on ${new Date().toLocaleString()}`,
        72,
        doc.page.height - 50,
        { align: 'center' }
      )

      doc.end()
    } catch (error) {
      logger.error({ error }, 'Failed to generate redline PDF')
      reject(error)
    }
  })
}

