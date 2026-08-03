import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

interface MarkdownValueProps {
  children: string;
}

/** Render a card value while treating every source newline as a visible break. */
export default function MarkdownValue({ children }: MarkdownValueProps) {
  return <ReactMarkdown remarkPlugins={[remarkBreaks]}>{children}</ReactMarkdown>;
}
