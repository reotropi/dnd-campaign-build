'use client';
import { ReactNode } from 'react';

interface MarkdownTextProps {
  content: string;
  style?: React.CSSProperties;
}

/**
 * Simple markdown parser for DM messages
 * Supports:
 * - **bold** text (even across multiple lines)
 * - *italic* text
 * - # Headers
 * - ## Subheaders
 */
export function MarkdownText({ content, style }: MarkdownTextProps) {
  const parseMarkdown = (text: string): ReactNode[] => {
    const parts: ReactNode[] = [];
    let key = 0;

    // First, parse inline markdown (bold/italic) across the entire text
    // This allows bold/italic to span multiple lines
    const combinedPattern = /(\*\*(.+?)\*\*|\*([^*]+?)\*)/gs; // 's' flag allows . to match newlines

    let match;
    let lastIndex = 0;

    while ((match = combinedPattern.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index);
        parts.push(
          <span key={`text-${key++}`}>{beforeText}</span>
        );
      }

      // Check if it's bold (**text**)
      if (match[2]) {
        parts.push(
          <strong key={`bold-${key++}`} style={{ fontWeight: 700 }}>
            {match[2]}
          </strong>
        );
      }
      // Check if it's italic (*text*)
      else if (match[3]) {
        parts.push(
          <em key={`italic-${key++}`} style={{ fontStyle: 'italic' }}>
            {match[3]}
          </em>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(<span key={`text-${key++}`}>{text.substring(lastIndex)}</span>);
    }

    return parts.length > 0 ? parts : [text];
  };

  return (
    <div style={{ whiteSpace: 'pre-wrap', ...style }}>
      {parseMarkdown(content)}
    </div>
  );
}
