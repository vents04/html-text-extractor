const fs = require('fs');
const namedReferences = JSON.parse(fs.readFileSync('./references.json', 'utf8'));

const selfClosingTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 
  'link', 'meta', 'param', 'source', 'track', 'wbr'];

function extractTextFromHtml(base64HtmlString) {
  console.time('extractTextFromHtml');
  try {
    // Decode base64 input
    const htmlString = Buffer.from(base64HtmlString, 'base64').toString('utf8');
    
    let html = htmlString.trim();
    
    html = preprocessHtml(html);
    html = html.replace(/<!--[\s\S]*?-->/g, '');
    html = html.replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, '');
    html = removeHiddenElements(html);
    html = html.replace(/<br\s*\/?>/gi, ' ');
    
    const textContent = extractVisibleText(html);
    const decodedText = decodeHtmlEntities(textContent);
    
    const result = decodedText.replace(/\s+/g, ' ')
      .replace(/\s*\n\s*/g, '\n')
      .replace(/^\s+|\s+$/g, '')
      .replace(/\n{3,}/g, '\n\n');
    
    console.timeEnd('extractTextFromHtml');
    return result;
  } catch (error) {
    console.error("Error during extraction, using fallback:", error.message);
    try {
      // Try to decode base64 first for the fallback
      const htmlString = Buffer.from(base64HtmlString, 'base64').toString('utf8');
      const result = htmlString.replace(/<[^>]*>/g, ' ')
                      .replace(/\s+/g, ' ')
                      .trim();
      console.timeEnd('extractTextFromHtml');
      return result;
    } catch (decodeError) {
      console.error("Base64 decoding failed:", decodeError.message);
      console.timeEnd('extractTextFromHtml');
      return "Error: Invalid base64 input";
    }
  }
}

function preprocessHtml(html) {
  const openTagsStack = [];
  
  html = html.replace(/<\/?([a-z][a-z0-9]*)[^>]*>/gi, (match, tagName) => {
    const tagLower = tagName.toLowerCase();
    
    if (match.endsWith('/>') || selfClosingTags.includes(tagLower)) {
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

function removeHiddenElements(html) {
  const hiddenPattern = /<([a-z][a-z0-9]*)\b[^>]*(?:style\s*=\s*["'][^"']*?display\s*:\s*none[^"']*?["']|style\s*=\s*["'][^"']*?visibility\s*:\s*hidden[^"']*?["']|style\s*=\s*["'][^"']*?opacity\s*:\s*0[^"']*?["']|aria-hidden\s*=\s*["']true["']|hidden(?:=["'][^"']*["']|(?=[\s>])))[^>]*>[\s\S]*?<\/\1>/gi;
  
  let previousHtml = '';
  let currentHtml = html;
  
  while (previousHtml !== currentHtml) {
    previousHtml = currentHtml;
    currentHtml = currentHtml.replace(hiddenPattern, '');
  }
  
  return currentHtml;
}

function extractVisibleText(html) {
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
  
  function extractFromTag(content, depth = 0) {
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

function decodeHtmlEntities(text) {
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
    
    const base64HtmlContent = Buffer.from(htmlContent).toString('base64');
    
    console.error(`Extracting text from ${inputFile}...`);
    const extractedText = extractTextFromHtml(base64HtmlContent);
    
    if (outputFile) {
      fs.writeFileSync(outputFile, extractedText);
      console.error(`Text extracted and saved to ${outputFile}`);
    } else {
      console.log(extractedText);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
} else {
  module.exports = extractTextFromHtml;
}