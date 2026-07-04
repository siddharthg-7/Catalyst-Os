import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
// @ts-ignore
import officeParser from 'officeparser';

/**
 * Extracts raw text content from various file formats.
 * Supports: PDF, DOCX, PPTX, CSV, TXT, MD
 */
export async function extractTextFromFile(buffer: Buffer, fileName: string, mimeType: string): Promise<string> {
  const extension = fileName.split('.').pop()?.toLowerCase();

  try {
    if (extension === 'pdf' || mimeType === 'application/pdf') {
      const parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();
      try {
        await parser.destroy();
      } catch (err) {
        // ignore destroy error
      }
      return textResult.text || '';
    }

    if (extension === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    }

    if (extension === 'pptx' || mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      // officeParser handles buffers natively
      const text = await new Promise<string>((resolve, reject) => {
        officeParser.parseOffice(buffer, (err: any, data: string) => {
          if (err) {
            reject(err);
          } else {
            resolve(data || '');
          }
        });
      });
      return text;
    }

    if (extension === 'csv' || mimeType === 'text/csv') {
      const csvContent = buffer.toString('utf-8');
      // Format nicely for analysis
      return `CSV Data (${fileName}):\n${csvContent}`;
    }

    // Default to plain text
    return buffer.toString('utf-8');
  } catch (error: any) {
    console.error(`[DocumentParser] Error parsing ${fileName}:`, error.message);
    throw new Error(`Failed to parse file content for ${fileName}: ${error.message}`);
  }
}
