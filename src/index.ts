import fs from 'fs';
import path from 'path';

// Load the HTML entity references
const namedReferences = JSON.parse(fs.readFileSync(path.join(__dirname, './references.json'), 'utf8'));

const selfClosingTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 
  'link', 'meta', 'param', 'source', 'track', 'wbr'];

const selfClosingTagsObsolete = ['command', 'keygen', 'menuitem', 'frame'];

/**
 * Extracts readable text content from an HTML string
 * @param htmlString - The HTML string to extract text from. Can be a regular HTML string or a base64 encoded HTML string
 * @param isBase64 - Whether the input is base64 encoded (default: false)
 * @returns The extracted text content
 */
export function extractTextFromHtml(htmlString: string, isBase64: boolean = false): string {
  try {
    // Decode base64 input if needed
    const html = isBase64 
      ? Buffer.from(htmlString, 'base64').toString('utf8')
      : htmlString;
    
    let processedHtml = html.trim();
    
    processedHtml = preprocessHtml(processedHtml);
    processedHtml = processedHtml.replace(/<!--[\s\S]*?-->/g, '');
    processedHtml = processedHtml.replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, '');
    processedHtml = removeHiddenElements(processedHtml);
    processedHtml = processedHtml.replace(/<br\s*\/?>/gi, ' ');
    
    const textContent = extractVisibleText(processedHtml);
    const decodedText = decodeHtmlEntities(textContent);
    
    return decodedText.replace(/\s+/g, ' ')
      .replace(/\s*\n\s*/g, '\n')
      .replace(/^\s+|\s+$/g, '')
      .replace(/\n{3,}/g, '\n\n');
    
  } catch (error) {
    console.error("Error during extraction, using fallback:", error);
    try {
      // Try to decode base64 first for the fallback if needed
      const decodedHtml = isBase64 
        ? Buffer.from(htmlString, 'base64').toString('utf8')
        : htmlString;
        
      return decodedHtml.replace(/<[^>]*>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
    } catch (decodeError) {
      console.error("Base64 decoding failed:", decodeError);
      return "Error: Invalid input";
    }
  }
}

/**
 * Preprocesses HTML to fix common issues like unclosed tags
 */
function preprocessHtml(html: string): string {
  const openTagsStack: string[] = [];
  
  html = html.replace(/<\/?([a-z][a-z0-9]*)[^>]*>/gi, (match, tagName) => {
    const tagLower = tagName.toLowerCase();
    
    if (match.endsWith('/>') || selfClosingTags.includes(tagLower) || selfClosingTagsObsolete.includes(tagLower)) {
      return match;
    }
    
    if (match.startsWith('</')) {
      const index = openTagsStack.lastIndexOf(tagLower);
      if (index !== -1) {
        openTagsStack.splice(index, 1);
      } else {
        return '';
      }
    } else {
      openTagsStack.push(tagLower);
    }
    return match;
  });
  
  for (let i = openTagsStack.length - 1; i >= 0; i--) {
    html += `</${openTagsStack[i]}>`;
  }
  
  return html;
}

/**
 * Removes hidden elements from HTML
 */
function removeHiddenElements(html: string): string {
  const hiddenPattern = /<([a-z][a-z0-9]*)\b[^>]*(?:style\s*=\s*["'][^"']*?display\s*:\s*none[^"']*?["']|style\s*=\s*["'][^"']*?visibility\s*:\s*hidden[^"']*?["']|style\s*=\s*["'][^"']*?opacity\s*:\s*0[^"']*?["']|aria-hidden\s*=\s*["']true["']|hidden(?:=["'][^"']*["']|(?=[\s>])))[^>]*>[\s\S]*?<\/\1>/gi;
  
  let previousHtml = '';
  let currentHtml = html;
  
  while (previousHtml !== currentHtml) {
    previousHtml = currentHtml;
    currentHtml = currentHtml.replace(hiddenPattern, '');
  }
  
  return currentHtml;
}

/**
 * Extracts visible text from HTML while keeping proper block formatting
 */
function extractVisibleText(html: string): string {
  const blockTags = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th', 'blockquote', 'pre', 'tr'];
  const preserveTags = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'table', 'tr', 'th', 'td',
    'b', 'strong',
    'i', 'em',
    'u',
    's', 'del',
    'ins',
    'sub',
    'sup',
    'mark',
    'small',
    'blockquote', 'q',
    'code', 'pre', 'kbd', 'samp', 'var',
    'a',
    'cite', 'abbr', 'dfn',
    'span', 'div',
    'address',
    'time',
    'meter',
    'progress',
    'button',
    'select',
    'option',
    'label',
    'text', 'textPath', 'tspan'
  ];
  
  const preserveTagsPattern = new RegExp(`<(${preserveTags.join('|')})(?:\\s[^>]*)?>(.*?)<\\/\\1>`, 'gi');
  
  html = html.replace(/<img\s+[^>]*alt\s*=\s*["']([^"']*)["'][^>]*>/gi, (match, alt) => {
    return alt ? `[Image: ${alt}] ` : '';
  });
  
  html = html.replace(/<iframe\s+[^>]*title\s*=\s*["']([^"']*)["'][^>]*>/gi, (match, title) => {
    return title ? `[Iframe: ${title}] ` : '';
  });
  
  function extractFromTag(content: string, depth = 0): string {
    if (depth > 500) {
      return content.replace(/<[^>]*>/g, '');
    }
    
    return content.replace(preserveTagsPattern, (match, tagName, content) => {
      const extractedContent = extractFromTag(content, depth + 1);
      const tagNameLower = tagName.toLowerCase();
      
      if (blockTags.includes(tagNameLower)) {
        return extractedContent + '\n';
      }
      
      return extractedContent;
    });
  }
  
  const extractedText = extractFromTag(html);
  
  return extractedText
    .replace(/<[^>]*>/g, '')
    .trim();
}

/**
 * Decodes HTML entities to their corresponding characters
 */
function decodeHtmlEntities(text: string): string {
  return text.replace(/&([^;]+);/g, (match, entity) => {
    if (namedReferences[match]) {
      return namedReferences[match].characters;
    }
    
    if (entity.match(/^#x[0-9a-f]+$/i)) {
      const hex = entity.substring(2);
      return String.fromCodePoint(parseInt(hex, 16));
    } else if (entity.match(/^#\d+$/)) {
      const decimal = entity.substring(1);
      return String.fromCodePoint(parseInt(decimal, 10));
    }
    
    return match;
  });
}

// For CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
HTML Text Extractor

Usage:
  node index.js <input-file> [output-file]

Arguments:
  input-file    Path to the HTML file to process
  output-file   (Optional) Path to save the extracted text
                If not provided, output is printed to console

Examples:
  node index.js examples/1.html
  node index.js examples/1.html extracted.txt
  `);
    process.exit(0);
  }

  const inputFile = args[0];
  const outputFile = args[1];

  try {    
    if (!fs.existsSync(inputFile)) {
      console.error(`Error: Input file "${inputFile}" does not exist.`);
      process.exit(1);
    }

    const htmlContent = fs.readFileSync(inputFile, 'utf8');
    
    console.error(`Extracting text from ${inputFile}...`);
    const extractedText = extractTextFromHtml(htmlContent, false);
    
    if (outputFile) {
      fs.writeFileSync(outputFile, extractedText);
      console.error(`Text extracted and saved to ${outputFile}`);
    } else {
      console.log(extractedText);
    }
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

// Export the main function
export default extractTextFromHtml; 