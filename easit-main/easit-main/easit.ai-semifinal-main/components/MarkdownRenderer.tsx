/**
 * EASIT.ai — Zero-Dependency Markdown Renderer v2.1
 * 
 * Renders Markdown to React elements without any external libraries.
 * Supports: headings, bold, italic, strikethrough, inline code, fenced code blocks,
 * unordered/ordered lists, task lists, blockquotes, tables, links, horizontal rules.
 * 
 * v2.1 Changes:
 * - Fixed nested bold+italic parsing (sequential passes)
 * - Added ~~strikethrough~~ support
 * - Added task list checkbox support (- [ ] / - [x])
 * - Added copy fallback for non-secure contexts
 * - Performance: memoized inline parsing
 */

import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// ─── COPY TO CLIPBOARD UTILITY ─────────────────────

async function copyToClipboard(text: string): Promise<boolean> {
  // Modern API (requires secure context)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to fallback
    }
  }
  
  // Fallback for non-secure contexts
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}

// ─── INLINE PARSER ─────────────────────────────────

function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Pattern: bold, italic, strikethrough, inline code, links
  // Using sequential matching to handle nesting correctly
  const pattern = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(~~(.+?)~~)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    // Push text before match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // **bold** — recursively parse inner content for nested italic
      const innerContent = match[2];
      const hasInnerItalic = /\*(.+?)\*/.test(innerContent);
      if (hasInnerItalic) {
        nodes.push(
          <strong key={`b-${key++}`} className="text-white font-semibold">
            {parseInline(innerContent)}
          </strong>
        );
      } else {
        nodes.push(<strong key={`b-${key++}`} className="text-white font-semibold">{innerContent}</strong>);
      }
    } else if (match[3]) {
      // *italic*
      nodes.push(<em key={`i-${key++}`} className="italic text-gray-300">{match[4]}</em>);
    } else if (match[5]) {
      // `inline code`
      nodes.push(
        <code key={`c-${key++}`} className="px-1.5 py-0.5 rounded bg-white/10 text-neon-cyan font-mono text-[0.85em]">
          {match[6]}
        </code>
      );
    } else if (match[7]) {
      // ~~strikethrough~~
      nodes.push(
        <del key={`s-${key++}`} className="text-gray-500 line-through">
          {match[8]}
        </del>
      );
    } else if (match[9]) {
      // [link](url)
      nodes.push(
        <a
          key={`a-${key++}`}
          href={match[11]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-blue hover:text-brand-blue/80 underline underline-offset-2 transition-colors"
        >
          {match[10]}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

// ─── BLOCK PARSER ──────────────────────────────────

interface ParsedBlock {
  type: 'heading' | 'code' | 'blockquote' | 'ul' | 'ol' | 'tasklist' | 'table' | 'hr' | 'paragraph';
  content: string;
  level?: number;        // heading level
  language?: string;     // code block language
  rows?: string[][];     // table rows
  items?: string[];      // list items
  taskItems?: { checked: boolean; text: string }[]; // task list items
}

function parseBlocks(markdown: string): ParsedBlock[] {
  const lines = markdown.split('\n');
  const blocks: ParsedBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Fenced code block ──
    const codeMatch = line.match(/^```(\w*)/);
    if (codeMatch) {
      const language = codeMatch[1] || 'text';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'code', content: codeLines.join('\n'), language });
      i++; // skip closing ```
      continue;
    }

    // ── Horizontal rule ──
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ type: 'hr', content: '' });
      i++;
      continue;
    }

    // ── Heading ──
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      blocks.push({ type: 'heading', content: headingMatch[2], level: headingMatch[1].length });
      i++;
      continue;
    }

    // ── Blockquote ──
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push({ type: 'blockquote', content: quoteLines.join('\n') });
      continue;
    }

    // ── Table ──
    if (line.includes('|') && i + 1 < lines.length && /^\|?\s*[-:]+/.test(lines[i + 1])) {
      const tableRows: string[][] = [];
      // Header row
      tableRows.push(line.split('|').map(c => c.trim()).filter(Boolean));
      i++; // skip separator
      i++;
      while (i < lines.length && lines[i].includes('|')) {
        tableRows.push(lines[i].split('|').map(c => c.trim()).filter(Boolean));
        i++;
      }
      blocks.push({ type: 'table', content: '', rows: tableRows });
      continue;
    }

    // ── Task list (- [ ] or - [x]) ──
    if (/^[\s]*[-*+]\s+\[([ xX])\]\s+/.test(line)) {
      const taskItems: { checked: boolean; text: string }[] = [];
      while (i < lines.length && /^[\s]*[-*+]\s+\[([ xX])\]\s+/.test(lines[i])) {
        const taskMatch = lines[i].match(/^[\s]*[-*+]\s+\[([ xX])\]\s+(.*)/);
        if (taskMatch) {
          taskItems.push({
            checked: taskMatch[1].toLowerCase() === 'x',
            text: taskMatch[2]
          });
        }
        i++;
      }
      blocks.push({ type: 'tasklist', content: '', taskItems });
      continue;
    }

    // ── Unordered list ──
    if (/^[\s]*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\s]*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*[-*+]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ul', content: '', items });
      continue;
    }

    // ── Ordered list ──
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ol', content: '', items });
      continue;
    }

    // ── Empty line ──
    if (line.trim() === '') {
      i++;
      continue;
    }

    // ── Paragraph (collect consecutive non-empty lines) ──
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].startsWith('#') && !lines[i].startsWith('```') && !lines[i].startsWith('> ') && !/^[-*+]\s+/.test(lines[i]) && !/^\d+[.)]\s+/.test(lines[i]) && !/^(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', content: paraLines.join(' ') });
    }
  }

  return blocks;
}

// ─── REACT RENDERER ────────────────────────────────

function renderBlock(block: ParsedBlock, index: number): React.ReactNode {
  switch (block.type) {
    case 'heading': {
      const headingClasses: Record<number, string> = {
        1: 'text-xl font-bold text-white mt-6 mb-3 pb-2 border-b border-white/10',
        2: 'text-lg font-bold text-white mt-5 mb-2',
        3: 'text-base font-semibold text-gray-200 mt-4 mb-2',
        4: 'text-sm font-semibold text-gray-300 mt-3 mb-1',
      };
      const Tag = `h${block.level || 2}` as any;
      return (
        <Tag key={index} className={headingClasses[block.level || 2]}>
          {parseInline(block.content)}
        </Tag>
      );
    }

    case 'code':
      return (
        <div key={index} className="my-4 rounded-xl overflow-hidden border border-white/10 shadow-lg">
          <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500">
              {block.language || 'code'}
            </span>
            <button
              onClick={() => copyToClipboard(block.content)}
              className="text-[10px] font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-wider"
            >
              Copy
            </button>
          </div>
          <pre className="p-4 overflow-x-auto bg-[#0a0a12] text-sm leading-relaxed">
            <code className="font-mono text-gray-300">{block.content}</code>
          </pre>
        </div>
      );

    case 'blockquote':
      return (
        <blockquote
          key={index}
          className="my-4 pl-4 border-l-4 border-brand-purple/50 bg-brand-purple/5 py-3 pr-4 rounded-r-lg text-gray-300 italic"
        >
          {parseInline(block.content)}
        </blockquote>
      );

    case 'tasklist':
      return (
        <ul key={index} className="my-3 space-y-1.5 pl-2">
          {block.taskItems?.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-gray-300 leading-relaxed">
              <span className={`inline-flex items-center justify-center w-4 h-4 mt-1 rounded border flex-shrink-0 ${
                item.checked 
                  ? 'bg-brand-blue border-brand-blue text-white' 
                  : 'border-gray-500 bg-transparent'
              }`}>
                {item.checked && (
                  <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2,6 5,9 10,3" />
                  </svg>
                )}
              </span>
              <span className={item.checked ? 'line-through text-gray-500' : ''}>
                {parseInline(item.text)}
              </span>
            </li>
          ))}
        </ul>
      );

    case 'ul':
      return (
        <ul key={index} className="my-3 space-y-1.5 pl-5">
          {block.items?.map((item, i) => (
            <li key={i} className="text-gray-300 leading-relaxed list-disc marker:text-brand-blue">
              {parseInline(item)}
            </li>
          ))}
        </ul>
      );

    case 'ol':
      return (
        <ol key={index} className="my-3 space-y-1.5 pl-5 list-decimal marker:text-brand-blue marker:font-bold">
          {block.items?.map((item, i) => (
            <li key={i} className="text-gray-300 leading-relaxed">
              {parseInline(item)}
            </li>
          ))}
        </ol>
      );

    case 'table':
      return (
        <div key={index} className="my-4 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            {block.rows && block.rows.length > 0 && (
              <>
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    {block.rows[0].map((cell, ci) => (
                      <th key={ci} className="px-4 py-2.5 text-left font-bold text-gray-300 text-xs uppercase tracking-wider">
                        {parseInline(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.slice(1).map((row, ri) => (
                    <tr key={ri} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-4 py-2.5 text-gray-400">
                          {parseInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
        </div>
      );

    case 'hr':
      return <hr key={index} className="my-6 border-white/10" />;

    case 'paragraph':
      return (
        <p key={index} className="text-gray-300 leading-relaxed mb-3">
          {parseInline(block.content)}
        </p>
      );

    default:
      return null;
  }
}

// ─── MAIN COMPONENT ────────────────────────────────

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const blocks = React.useMemo(() => parseBlocks(content), [content]);

  return (
    <div className={`markdown-rendered ${className}`}>
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
};
