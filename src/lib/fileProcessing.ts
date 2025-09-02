import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function extractPdfText(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      let pageText = '';
      let lastY = 0;
      
      for (const item of textContent.items) {
        if (!item || typeof (item as any).str !== 'string') continue;
        
        const textItem = item as any;
        const text = textItem.str.trim();
        if (!text) continue;
        
        // Check for line breaks based on Y position
        if (textItem.transform && textItem.transform[5] !== lastY) {
          if (pageText && !pageText.endsWith(' ')) {
            pageText += '\n';
          }
          lastY = textItem.transform[5];
        }
        
        pageText += text + ' ';
      }
      
      fullText += pageText.trim() + '\n\n';
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

export async function extractImageText(file: File): Promise<string> {
  try {
    const result = await Tesseract.recognize(file, 'eng', {
      logger: m => console.log(m)
    });
    
    return result.data.text.trim();
  } catch (error) {
    console.error('OCR error:', error);
    throw new Error('Failed to extract text from image');
  }
}

export async function extractDocxText(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  } catch (error) {
    console.error('DOCX extraction error:', error);
    throw new Error('Failed to extract text from Word document');
  }
}

export async function transcribeAudio(file: File): Promise<string> {
  // For now, return a placeholder since audio transcription requires more complex setup
  return `Audio transcription is not yet implemented. Please convert your audio to text manually or use the text input option.`;
}

export function getFileIcon(fileType: string) {
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('image')) return '🖼️';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType.includes('audio')) return '🎵';
  return '📎';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}