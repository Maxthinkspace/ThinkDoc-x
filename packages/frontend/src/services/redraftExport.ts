import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import type { DraftedSection } from '@/src/types/redraft';

export async function downloadRedraftedDocument(
  draftedSections: DraftedSection[]
): Promise<void> {
  const children: Paragraph[] = [];

  for (const section of draftedSections) {
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

    for (const clause of section.clauses) {
      // Clause heading if present
      if (clause.clauseHeading) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${clause.clauseNumber} ${clause.clauseHeading}`,
                bold: true,
                size: 24, // 12pt
              }),
            ],
            spacing: { before: 200, after: 100 },
            heading: HeadingLevel.HEADING_2,
          })
        );
      }

      // Sentences (without footnotes)
      const sentenceTexts = clause.sentences.map(s => s.text);
      const clauseText = clause.clauseHeading
        ? sentenceTexts.join(' ')
        : `${clause.clauseNumber} ${sentenceTexts.join(' ')}`;

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: clauseText,
              size: 24, // 12pt
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
  saveAs(blob, 'redrafted-agreement.docx');
}