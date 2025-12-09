'use client';

import { Text } from '@mantine/core';
import { ReactNode } from 'react';

interface MarkdownTextProps {
  content: string;
  style?: React.CSSProperties;
}

/**
 * Simple markdown parser for DM messages
 * Supports:
 * - **bold** text
 * - *italic* text
 * - # Headers
 * - ## Subheaders
 */
export function MarkdownText({ content, style }: MarkdownTextProps) {
  const parseMarkdown = (text: string): ReactNode[] => {
    const parts: ReactNode[] = [];

    // Split by lines to handle headers
    const lines = text.split('\n');

    lines.forEach((line, lineIndex) => {
      // Check for headers
      const headerMatch = line.match(/^(#{1,3})\s+(.+)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const headerText = headerMatch[2];
        const size = level === 1 ? 'xl' : level === 2 ? 'lg' : 'md';
        parts.push(
          <Text key={`header-${lineIndex}`} size={size} fw={700} mt="md" mb="xs">
            {parseInlineMarkdown(headerText)}
          </Text>
        );
        return;
      }

      // Parse inline markdown for regular lines
      parts.push(
        <span key={`line-${lineIndex}`}>
          {parseInlineMarkdown(line)}
          {lineIndex < lines.length - 1 && '\n'}
        </span>
      );
    });

    return parts;
  };

  const parseInlineMarkdown = (text: string): ReactNode[] => {
    const parts: ReactNode[] = [];
    let key = 0;

    // Combined pattern to match both bold and italic
    const combinedPattern = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;

    let match;
    let lastIndex = 0;

    while ((match = combinedPattern.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${key++}`}>{text.substring(lastIndex, match.index)}</span>
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
