#!/usr/bin/env node

import fs from 'fs';
import { extractTextFromHtml } from './index';

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
HTML Text Extractor

Usage:
  html-text-extractor <input-file> [output-file]

Arguments:
  input-file    Path to the HTML file to process
  output-file   (Optional) Path to save the extracted text
                If not provided, output is printed to console

Examples:
  html-text-extractor example.html
  html-text-extractor example.html extracted.txt
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