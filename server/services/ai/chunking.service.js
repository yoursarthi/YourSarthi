'use strict';

const fs   = require('fs');
const path = require('path');

const CHUNK_SIZE    = 1800;
const CHUNK_OVERLAP = 200;

async function extractText(filePath, fileType) {
  const ext = (fileType || path.extname(filePath).slice(1)).toLowerCase();
  switch (ext) {
    case 'pdf':  return _extractPDF(filePath);
    case 'docx': return _extractDOCX(filePath);
    case 'pptx': return _extractPPTX(filePath);
    case 'txt':
    case 'md':   return fs.promises.readFile(filePath, 'utf8');
    default:     throw new Error(`Unsupported file type: ${ext}`);
  }
}

async function _extractPDF(filePath) {
  const { PDFParse } = require('pdf-parse');
  const buf    = await fs.promises.readFile(filePath);
  const parser = new PDFParse({ data: buf });
  const result = await parser.getText();
  await parser.destroy().catch(() => {});
  return result.text || '';
}

async function _extractDOCX(filePath) {
  const mammoth = require('mammoth');
  const result  = await mammoth.extractRawText({ path: filePath });
  return result.value || '';
}

async function _extractPPTX(filePath) {
  const JSZip = require('jszip');
  const buf   = await fs.promises.readFile(filePath);
  const zip   = await JSZip.loadAsync(buf);
  const slideFiles = Object.keys(zip.files)
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => parseInt(a.match(/\d+/)?.[0]) - parseInt(b.match(/\d+/)?.[0]));
  const texts = [];
  for (const name of slideFiles) {
    const xml = await zip.files[name].async('string');
    const matches = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || [];
    const slideText = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
    if (slideText.trim()) texts.push(slideText.trim());
  }
  return texts.join('\n\n');
}

function cleanText(text) {
  return text
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/[ \t]{3,}/g, '  ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E -￿]/g, ' ')
    .trim();
}

function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const cleaned = cleanText(text);
  if (!cleaned) return [];

  const paragraphs = cleaned.split(/\n\n+/).filter(p => p.trim().length > 20);
  const chunks = [];
  let current = '';

  for (const para of paragraphs) {
    if (current.length + para.length + 2 <= chunkSize) {
      current = current ? `${current}\n\n${para}` : para;
    } else {
      if (current.length >= 100) chunks.push(current.trim());
      if (para.length > chunkSize) {
        const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
        let sentChunk = '';
        for (const sent of sentences) {
          if (sentChunk.length + sent.length <= chunkSize) { sentChunk += sent; }
          else {
            if (sentChunk.length >= 100) chunks.push(sentChunk.trim());
            sentChunk = sent;
          }
        }
        if (sentChunk.length >= 100) chunks.push(sentChunk.trim());
        current = '';
      } else {
        current = para;
      }
    }
  }
  if (current.length >= 100) chunks.push(current.trim());

  return chunks.map((chunk, i) => {
    if (i === 0) return chunk;
    const overlapText  = chunks[i - 1].slice(-overlap);
    const sentEnd      = overlapText.search(/[.!?]\s/);
    const cleanOverlap = sentEnd >= 0 ? overlapText.slice(sentEnd + 2) : overlapText;
    return cleanOverlap ? `${cleanOverlap} ${chunk}` : chunk;
  }).filter(c => c.trim().length >= 50);
}

module.exports = { extractText, chunkText, cleanText, CHUNK_SIZE, CHUNK_OVERLAP };
