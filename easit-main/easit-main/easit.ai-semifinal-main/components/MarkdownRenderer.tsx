import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import mermaid from 'mermaid';
import { Check, Copy } from 'lucide-react';

// Register common languages to save bundle size
SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('bash', bash);

mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: 'Inter, sans-serif'
});

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// ─── COPY TO CLIPBOARD UTILITY ─────────────────────

async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through
    }
  }
  
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

// ─── MERMAID RENDERER COMPONENT ─────────────────────

const MermaidDiagram = ({ code }: { code: string }) => {
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string>('');
    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

    useEffect(() => {
        const renderDiagram = async () => {
            try {
                const { svg: renderedSvg } = await mermaid.render(id, code);
                setSvg(renderedSvg);
                setError('');
            } catch (err: any) {
                console.error("Mermaid parsing error:", err);
                setError(err.message || 'Failed to render diagram');
            }
        };
        renderDiagram();
    }, [code, id]);

    if (error) {
        return (
            <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-xs font-mono overflow-auto my-4">
                <p className="font-bold mb-2">Mermaid Syntax Error:</p>
                {error}
            </div>
        );
    }

    if (!svg) {
        return <div className="animate-pulse h-32 bg-white/5 rounded-lg my-4 flex items-center justify-center text-gray-500 text-sm">Rendering Diagram...</div>;
    }

    return (
        <div 
            className="my-6 p-6 bg-white flex justify-center items-center rounded-xl overflow-x-auto border border-gray-200 shadow-sm mermaid-container"
            dangerouslySetInnerHTML={{ __html: svg }} 
        />
    );
};

// ─── MAIN COMPONENT ────────────────────────────────

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  return (
    <div className={`markdown-rendered ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
            // Typography
            h1: ({node, ...props}) => <h1 className="text-xl font-bold text-gray-800 dark:text-white mt-6 mb-3 pb-2 border-b border-gray-200 dark:border-white/10" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-lg font-bold text-gray-800 dark:text-white mt-5 mb-2" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mt-4 mb-2" {...props} />,
            h4: ({node, ...props}) => <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mt-3 mb-1" {...props} />,
            p: ({node, ...props}) => <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3" {...props} />,
            
            // Inline elements
            a: ({node, ...props}) => <a className="text-brand-blue hover:text-brand-blue/80 underline underline-offset-2 transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
            strong: ({node, ...props}) => <strong className="font-semibold text-gray-900 dark:text-white" {...props} />,
            em: ({node, ...props}) => <em className="italic text-gray-600 dark:text-gray-400" {...props} />,
            del: ({node, ...props}) => <del className="text-gray-500 line-through" {...props} />,
            
            // Lists
            ul: ({node, ...props}) => <ul className="my-3 space-y-1.5 pl-5 list-disc marker:text-brand-blue text-gray-700 dark:text-gray-300 leading-relaxed" {...props} />,
            ol: ({node, ...props}) => <ol className="my-3 space-y-1.5 pl-5 list-decimal marker:text-brand-blue marker:font-bold text-gray-700 dark:text-gray-300 leading-relaxed" {...props} />,
            li: ({node, ...props}) => <li className="pl-1" {...props} />,
            
            // Blockquotes & HR
            blockquote: ({node, ...props}) => <blockquote className="my-4 pl-4 border-l-4 border-brand-purple/50 bg-brand-purple/5 py-3 pr-4 rounded-r-lg text-gray-600 dark:text-gray-300 italic" {...props} />,
            hr: ({node, ...props}) => <hr className="my-6 border-gray-200 dark:border-white/10" {...props} />,

            // Tables
            table: ({node, ...props}) => <div className="my-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10"><table className="w-full text-sm" {...props} /></div>,
            thead: ({node, ...props}) => <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10" {...props} />,
            th: ({node, ...props}) => <th className="px-4 py-2.5 text-left font-bold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider" {...props} />,
            tbody: ({node, ...props}) => <tbody {...props} />,
            tr: ({node, ...props}) => <tr className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors" {...props} />,
            td: ({node, ...props}) => <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400" {...props} />,

            // Code Blocks & Mermaid
            code({node, inline, className, children, ...props}: any) {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : '';
                const codeString = String(children).replace(/\n$/, '');

                if (inline) {
                    return (
                        <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-brand-blue dark:text-neon-cyan font-mono text-[0.85em]" {...props}>
                            {children}
                        </code>
                    );
                }

                if (language === 'mermaid') {
                    return <MermaidDiagram code={codeString} />;
                }

                const CodeBlockWrapper = () => {
                    const [copied, setCopied] = useState(false);
                    return (
                        <div className="my-4 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-lg group">
                            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500">
                                    {language || 'text'}
                                </span>
                                <button
                                    onClick={async () => {
                                        const success = await copyToClipboard(codeString);
                                        if (success) {
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }
                                    }}
                                    className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors uppercase tracking-wider"
                                >
                                    {copied ? (
                                        <><Check size={12} className="text-green-500" /> Copied</>
                                    ) : (
                                        <><Copy size={12} /> Copy</>
                                    )}
                                </button>
                            </div>
                            <div className="text-sm">
                                <SyntaxHighlighter
                                    style={oneDark}
                                    language={language || 'text'}
                                    PreTag="div"
                                    customStyle={{ margin: 0, padding: '1rem', background: '#0a0a12' }}
                                    {...props}
                                >
                                    {codeString}
                                </SyntaxHighlighter>
                            </div>
                        </div>
                    );
                };

                return <CodeBlockWrapper />;
            }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
