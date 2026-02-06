import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import type { RedomiciledSection } from '@/src/types/redomicile';

export async function downloadRedomiciledDocument(
  redomiciledSections: RedomiciledSection[]
): Promise<void> {
  const children: Paragraph[] = [];

  for (const section of redomiciledSections) {
    // Section heading
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${section.sectionNumber}. ${section.sectionHeading}`,
            bold: true,
            size: 28, // 14pt
          }),
        ],
        spacing: { before: 400, after: 200 },
        heading: HeadingLevel.HEADING_1,
      })
    );

    // Section content
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: section.content,
            size: 24, // 12pt
          }),
        ],
        spacing: { after: 200 },
      })
    );

    // Notes if present
    if (section.notes) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Note: ${section.notes}`,
              italics: true,
              size: 22, // 11pt
              color: "666666",
            }),
          ],
          spacing: { after: 200 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, 'redomiciled-document.docx');
}

