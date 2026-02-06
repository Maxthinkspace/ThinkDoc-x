import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";

export async function downloadTranslatedDocx(params: {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  fileName?: string;
}): Promise<void> {
  const { translatedText, sourceLanguage, targetLanguage } = params;

  const lines = translatedText
    .split(/\r?\n/)
    .map((l) => l.trimEnd());

  const children: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({
          text: `Translation (${sourceLanguage} → ${targetLanguage})`,
          bold: true,
          size: 28,
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 300 },
    }),
  ];

  for (const line of lines) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: line || " ", size: 24 })],
        spacing: { after: 160 },
      })
    );
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = params.fileName || `translated_${targetLanguage}.docx`;
  saveAs(blob, fileName);
}


