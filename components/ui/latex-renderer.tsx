"use client"

import * as React from "react"
import { useMemo, useState } from "react"
import { MathText } from "./math-text"
import { Copy, Check, Code } from "lucide-react"

/**
 * Stack-based balanced brace parser for LaTeX inline formatting.
 * Recursively parses formatting tags (textbf, textit, texttt, textsf, underline, href, url)
 * and Katex inline/block math delimiters ($ and $$, \( and \[, \) and \]).
 */
export function parseLatexInline(text: string): React.ReactNode[] {
  if (!text) return []
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < text.length) {
    // 0. Handle escaped characters
    const escapes = [
      { prefix: "\\$", char: "$" },
      { prefix: "\\%", char: "%" },
      { prefix: "\\&", char: "&" },
      { prefix: "\\_", char: "_" },
      { prefix: "\\{", char: "{" },
      { prefix: "\\}", char: "}" },
      { prefix: "\\\\", char: "\\" },
    ]
    let matchedEscape = false
    for (const esc of escapes) {
      if (text.startsWith(esc.prefix, i)) {
        elements.push(<span key={`esc-${i}`}>{esc.char}</span>)
        i += esc.prefix.length
        matchedEscape = true
        break
      }
    }
    if (matchedEscape) continue

    // 1. Check for display math $$
    if (text.startsWith("$$", i)) {
      const j = text.indexOf("$$", i + 2)
      if (j !== -1) {
        const mathContent = text.slice(i, j + 2)
        elements.push(<MathText key={i}>{mathContent}</MathText>)
        i = j + 2
        continue
      }
    }

    // 2. Check for display math \[
    if (text.startsWith("\\[", i)) {
      const j = text.indexOf("\\]", i + 2)
      if (j !== -1) {
        const mathContent = text.slice(i, j + 2)
        elements.push(<MathText key={i}>{mathContent}</MathText>)
        i = j + 2
        continue
      }
    }

    // 3. Check for inline math $
    if (text.startsWith("$", i)) {
      const j = text.indexOf("$", i + 1)
      if (j !== -1) {
        const mathContent = text.slice(i, j + 1)
        elements.push(<MathText key={i}>{mathContent}</MathText>)
        i = j + 1
        continue
      }
    }

    // 4. Check for inline math \(
    if (text.startsWith("\\(", i)) {
      const j = text.indexOf("\\)", i + 2)
      if (j !== -1) {
        const mathContent = text.slice(i, j + 2)
        elements.push(<MathText key={i}>{mathContent}</MathText>)
        i = j + 2
        continue
      }
    }

    // Check for LaTeX macros
    let matchedMacro = false
    const macros = [
      { prefix: "\\textbf{", name: "textbf" },
      { prefix: "\\textit{", name: "textit" },
      { prefix: "\\texttt{", name: "texttt" },
      { prefix: "\\textsf{", name: "textsf" },
      { prefix: "\\underline{", name: "underline" },
      { prefix: "\\url{", name: "url" },
      { prefix: "\\href{", name: "href" },
    ]

    for (const macro of macros) {
      if (text.startsWith(macro.prefix, i)) {
        // Find matching closing brace
        let braceCount = 1
        let j = i + macro.prefix.length
        while (j < text.length && braceCount > 0) {
          if (text[j] === "{") braceCount++
          else if (text[j] === "}") braceCount--
          j++
        }

        if (braceCount === 0) {
          matchedMacro = true
          const contentWithBrace = text.slice(i + macro.prefix.length, j - 1)

          if (macro.name === "textbf") {
            elements.push(
              <strong key={i} className="font-bold text-foreground">
                {parseLatexInline(contentWithBrace)}
              </strong>
            )
          } else if (macro.name === "textit") {
            elements.push(
              <em key={i} className="italic text-foreground/95">
                {parseLatexInline(contentWithBrace)}
              </em>
            )
          } else if (macro.name === "texttt") {
            elements.push(
              <code key={i} className="bg-muted border px-1.5 py-0.5 rounded text-[12px] font-mono text-emerald-600 dark:text-emerald-400">
                {contentWithBrace}
              </code>
            )
          } else if (macro.name === "textsf") {
            elements.push(
              <span key={i} className="font-sans text-foreground">
                {parseLatexInline(contentWithBrace)}
              </span>
            )
          } else if (macro.name === "underline") {
            elements.push(
              <u key={i} className="underline text-foreground">
                {parseLatexInline(contentWithBrace)}
              </u>
            )
          } else if (macro.name === "url") {
            elements.push(
              <a key={i} href={contentWithBrace} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 transition-colors">
                {contentWithBrace}
              </a>
            )
          } else if (macro.name === "href") {
            // Check if followed by the label block {label}
            if (j < text.length && text[j] === "{") {
              let nextBraceCount = 1
              let k = j + 1
              while (k < text.length && nextBraceCount > 0) {
                if (text[k] === "{") nextBraceCount++
                else if (text[k] === "}") nextBraceCount--
                k++
              }
              if (nextBraceCount === 0) {
                const label = text.slice(j + 1, k - 1)
                elements.push(
                  <a key={i} href={contentWithBrace} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 transition-colors">
                    {parseLatexInline(label)}
                  </a>
                )
                j = k
              } else {
                elements.push(
                  <a key={i} href={contentWithBrace} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 transition-colors">
                    {contentWithBrace}
                  </a>
                )
              }
            } else {
              elements.push(
                <a key={i} href={contentWithBrace} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 transition-colors">
                  {contentWithBrace}
                </a>
              )
            }
          }
          i = j
          break
        }
      }
    }

    if (matchedMacro) continue

    // Read plain text until next display math, inline math, macro, or escape sequence
    let nextSpecial = i + 1
    while (nextSpecial < text.length) {
      const char = text[nextSpecial]
      if (char === "$" || char === "\\" || text.startsWith("$$", nextSpecial)) {
        break
      }
      nextSpecial++
    }

    let plainText = text.slice(i, nextSpecial)
    elements.push(<span key={i}>{plainText}</span>)
    i = nextSpecial
  }

  return elements
}

type TokenType =
  | "comment"
  | "string"
  | "keyword"
  | "number"
  | "function"
  | "type"
  | "builtin"
  | "operator"
  | "plain"

interface Token {
  type: TokenType
  text: string
}

function tokenize(code: string, lang: string): Token[] {
  const tokens: Token[] = []
  const lowerLang = lang ? lang.toLowerCase() : ""

  // Define keywords per language
  let keywords = new Set<string>()
  let builtins = new Set<string>()
  let types = new Set<string>()

  if (
    lowerLang === "js" ||
    lowerLang === "javascript" ||
    lowerLang === "ts" ||
    lowerLang === "typescript" ||
    lowerLang === "tsx" ||
    lowerLang === "jsx"
  ) {
    keywords = new Set([
      "const", "let", "var", "function", "class", "import", "export", "from",
      "default", "return", "if", "else", "for", "while", "switch", "case",
      "break", "continue", "try", "catch", "finally", "throw", "new", "typeof",
      "instanceof", "async", "await", "yield", "extends", "super", "this",
      "in", "of", "delete", "debugger", "as"
    ])
    builtins = new Set([
      "console", "window", "document", "process", "global", "Math", "Object",
      "Array", "String", "Number", "Boolean", "Promise", "JSON", "Map", "Set",
      "Error"
    ])
    types = new Set(["string", "number", "boolean", "any", "void", "unknown", "never", "null", "undefined", "true", "false"])
  } else if (lowerLang === "python" || lowerLang === "py") {
    keywords = new Set([
      "def", "class", "import", "from", "as", "return", "if", "elif", "else",
      "for", "while", "break", "continue", "try", "except", "finally", "raise",
      "assert", "pass", "in", "is", "and", "or", "not", "lambda", "with",
      "yield", "global", "nonlocal", "del"
    ])
    builtins = new Set([
      "print", "len", "range", "str", "int", "float", "list", "dict", "set",
      "tuple", "bool", "type", "dir", "help", "input", "open", "sum", "max",
      "min", "abs", "enumerate", "zip", "map", "filter", "any", "all"
    ])
    types = new Set(["self", "cls", "None", "True", "False"])
  } else if (
    lowerLang === "cpp" ||
    lowerLang === "c++" ||
    lowerLang === "c" ||
    lowerLang === "cs" ||
    lowerLang === "csharp" ||
    lowerLang === "java"
  ) {
    keywords = new Set([
      "class", "struct", "public", "private", "protected", "static", "const",
      "virtual", "override", "final", "return", "if", "else", "for", "while",
      "do", "switch", "case", "break", "continue", "new", "delete", "this",
      "throw", "try", "catch", "namespace", "using", "include", "import",
      "package", "interface", "extends", "implements", "operator", "template",
      "typename", "friend", "inline"
    ])
    builtins = new Set([
      "std", "cout", "cin", "endl", "vector", "string", "map", "set", "list",
      "pair", "System", "out", "println", "print", "Console", "WriteLine"
    ])
    types = new Set(["int", "float", "double", "char", "bool", "void", "long", "short", "unsigned", "signed", "true", "false", "null", "nullptr", "String"])
  } else if (lowerLang === "sql") {
    keywords = new Set([
      "select", "from", "where", "insert", "update", "delete", "into", "values",
      "join", "left", "right", "inner", "outer", "on", "group", "by", "having",
      "order", "create", "table", "alter", "drop", "index", "primary", "key",
      "foreign", "references", "as", "in", "like", "between", "exists", "and",
      "or", "not"
    ])
    builtins = new Set(["count", "sum", "avg", "min", "max", "coalesce", "now", "concat", "lower", "upper", "substring"])
    types = new Set(["null", "true", "false", "int", "integer", "varchar", "char", "text", "boolean", "date", "timestamp", "numeric", "decimal", "float", "real"])
  } else {
    // Default fallback keywords
    keywords = new Set([
      "class", "function", "return", "if", "else", "for", "while", "break",
      "continue", "try", "catch", "new", "this", "import", "export", "from"
    ])
    types = new Set(["true", "false", "null", "undefined"])
  }

  // Regexes
  const commentPattern = /^(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*|--[^\n]*)/
  const stringPattern = /^(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/
  const numberPattern = /^(?:0x[a-fA-F0-9]+|\b\d+(?:\.\d+)?\b)/
  const identifierPattern = /^[a-zA-Z_]\w*/
  const operatorPattern = /^(?:===|==|!==|!=|<=|>=|=>|\+\+|--|&&|\|\||[+\-*/%=!<>^&|~?:])/
  const punctuationPattern = /^[{}()\[\],.;]+/
  const whitespacePattern = /^\s+/

  let index = 0
  while (index < code.length) {
    const remaining = code.substring(index)

    // 1. Whitespace
    const wsMatch = remaining.match(whitespacePattern)
    if (wsMatch) {
      tokens.push({ type: "plain", text: wsMatch[0] })
      index += wsMatch[0].length
      continue
    }

    // 2. Comment
    const commentMatch = remaining.match(commentPattern)
    if (commentMatch) {
      tokens.push({ type: "comment", text: commentMatch[0] })
      index += commentMatch[0].length
      continue
    }

    // 3. String
    const stringMatch = remaining.match(stringPattern)
    if (stringMatch) {
      tokens.push({ type: "string", text: stringMatch[0] })
      index += stringMatch[0].length
      continue
    }

    // 4. Number
    const numberMatch = remaining.match(numberPattern)
    if (numberMatch) {
      tokens.push({ type: "number", text: numberMatch[0] })
      index += numberMatch[0].length
      continue
    }

    // 5. Identifier
    const idMatch = remaining.match(identifierPattern)
    if (idMatch) {
      const text = idMatch[0]
      const lowerText = text.toLowerCase()
      let type: TokenType = "plain"

      if (keywords.has(text) || keywords.has(lowerText)) {
        type = "keyword"
      } else if (types.has(text) || types.has(lowerText)) {
        type = "type"
      } else if (builtins.has(text) || builtins.has(lowerText)) {
        type = "builtin"
      } else {
        // Peek at next character to see if it's a function call
        const nextCharIndex = index + text.length
        let k = nextCharIndex
        while (k < code.length && /\s/.test(code[k])) {
          k++
        }
        if (k < code.length && code[k] === "(") {
          type = "function"
        }
      }

      tokens.push({ type, text })
      index += text.length
      continue
    }

    // 6. Operator
    const opMatch = remaining.match(operatorPattern)
    if (opMatch) {
      tokens.push({ type: "operator", text: opMatch[0] })
      index += opMatch[0].length
      continue
    }

    // 7. Punctuation
    const puncMatch = remaining.match(punctuationPattern)
    if (puncMatch) {
      tokens.push({ type: "plain", text: puncMatch[0] })
      index += puncMatch[0].length
      continue
    }

    // 8. Fallback
    tokens.push({ type: "plain", text: remaining[0] })
    index += 1
  }

  return tokens
}

interface CodeBlockProps {
  code: string
  language?: string
  caption?: string
}

function CodeBlock({ code, language, caption }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy code: ", err)
    }
  }

  const tokens = useMemo(() => tokenize(code, language || ""), [code, language])

  return (
    <div className="bg-muted/40 border border-border/50 rounded-xl shadow-xs overflow-hidden my-5 font-mono text-xs relative group/code">
      <div className="flex items-center justify-between border-b border-border/40 bg-muted/50 px-3.5 py-2 text-[11px] text-muted-foreground font-sans select-none">
        <div className="flex items-center gap-1.5 font-medium text-foreground/75">
          <Code className="size-3.5 text-muted-foreground/60" />
          <span>{caption || "Code Listing"}</span>
        </div>
        <div className="flex items-center gap-3">
          {language && (
            <span className="bg-foreground/5 dark:bg-foreground/10 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider text-foreground/60">
              {language}
            </span>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all hover:bg-foreground/5 active:scale-95 text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check className="size-3 text-emerald-500" />
                <span className="text-emerald-500 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
      <pre className="p-3.5 overflow-x-auto text-foreground/90 whitespace-pre scrollbar-thin max-h-[500px]">
        <code>
          {tokens.map((token, index) => {
            let className = ""
            switch (token.type) {
              case "comment":
                className = "text-slate-400 dark:text-slate-500 italic"
                break
              case "string":
                className = "text-amber-600 dark:text-amber-400"
                break
              case "keyword":
                className = "text-pink-600 dark:text-pink-400 font-semibold"
                break
              case "number":
                className = "text-indigo-600 dark:text-indigo-400"
                break
              case "function":
                className = "text-sky-600 dark:text-sky-400"
                break
              case "type":
                className = "text-emerald-600 dark:text-emerald-400"
                break
              case "builtin":
                className = "text-violet-600 dark:text-violet-400"
                break
              case "operator":
                className = "text-rose-500 dark:text-rose-400"
                break
            }
            return (
              <span key={index} className={className}>
                {token.text}
              </span>
            )
          })}
        </code>
      </pre>
    </div>
  )
}

interface Block {
  type:
    | 'paragraph'
    | 'heading'
    | 'itemize'
    | 'enumerate'
    | 'item'
    | 'verbatim'
    | 'lstlisting'
    | 'equation'
    | 'align'
    | 'figure'
    | 'image'
    | 'center'
    | 'empty'
  level?: number // section=1, subsection=2, subsubsection=3
  content?: string
  children?: Block[]
  options?: Record<string, string>
  caption?: string
  imageUrl?: string
}

function parseLatexDocument(content: string): Block[] {
  const lines = content.split('\n')
  const rootBlocks: Block[] = []
  const stack: { block: Block; endTag?: string }[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // 1. Check if the active container is a code block or equation block
    const activeTop = stack[stack.length - 1]
    if (
      activeTop &&
      (activeTop.block.type === 'verbatim' ||
        activeTop.block.type === 'lstlisting' ||
        activeTop.block.type === 'equation' ||
        activeTop.block.type === 'align')
    ) {
      if (activeTop.endTag && trimmed.startsWith(activeTop.endTag)) {
        stack.pop()
        i++
        continue
      }
      activeTop.block.content = (activeTop.block.content || '') + line + '\n'
      i++
      continue
    }

    // 2. Handle empty line
    if (!trimmed) {
      const currentContainer = stack[stack.length - 1]
      if (!currentContainer) {
        rootBlocks.push({ type: 'empty' })
      }
      i++
      continue
    }

    // 3. Handle list environments
    if (trimmed.startsWith('\\begin{itemize}')) {
      const block: Block = { type: 'itemize', children: [] }
      addBlock(block)
      stack.push({ block, endTag: '\\end{itemize}' })
      i++
      continue
    }
    if (trimmed.startsWith('\\begin{enumerate}')) {
      const block: Block = { type: 'enumerate', children: [] }
      addBlock(block)
      stack.push({ block, endTag: '\\end{enumerate}' })
      i++
      continue
    }

    // 4. Handle center environment
    if (trimmed.startsWith('\\begin{center}')) {
      const block: Block = { type: 'center', children: [] }
      addBlock(block)
      stack.push({ block, endTag: '\\end{center}' })
      i++
      continue
    }

    // 5. Handle figure environment
    if (trimmed.startsWith('\\begin{figure}')) {
      const block: Block = { type: 'figure', children: [] }
      addBlock(block)
      stack.push({ block, endTag: '\\end{figure}' })
      i++
      continue
    }

    // 6. Handle verbatim & listings code block environment
    if (trimmed.startsWith('\\begin{verbatim}')) {
      const block: Block = { type: 'verbatim', content: '' }
      addBlock(block)
      stack.push({ block, endTag: '\\end{verbatim}' })
      i++
      continue
    }
    if (trimmed.startsWith('\\begin{lstlisting}')) {
      let language = ''
      let caption = ''
      const optionsMatch = trimmed.match(/\\begin\{lstlisting\}\s*\[([\s\S]*?)\]/)
      if (optionsMatch) {
        const optionsStr = optionsMatch[1]
        const pairRegex = /(\w+)\s*=\s*(?:\{([^}]*)\}|"([^"]*)"|([^,\s}]+))/g
        let match
        while ((match = pairRegex.exec(optionsStr)) !== null) {
          const key = match[1].toLowerCase()
          const val = match[2] ?? match[3] ?? match[4]
          if (key === 'language') language = val
          else if (key === 'caption') caption = val
        }
      }
      const block: Block = { type: 'lstlisting', content: '', options: { language, caption } }
      addBlock(block)
      stack.push({ block, endTag: '\\end{lstlisting}' })
      i++
      continue
    }

    // 7. Handle math equation & align block environment
    if (trimmed.startsWith('\\begin{equation}') || trimmed.startsWith('\\begin{align}')) {
      const isAlign = trimmed.includes('align')
      const block: Block = { type: isAlign ? 'align' : 'equation', content: '' }
      addBlock(block)
      stack.push({ block, endTag: isAlign ? '\\end{align}' : '\\end{equation}' })
      i++
      continue
    }

    // 8. Handle list item
    if (trimmed.startsWith('\\item')) {
      // Pop current item block if we are in one, so we start a new item in the parent list container
      const currentContainer = stack[stack.length - 1]
      if (currentContainer && currentContainer.block.type === 'item') {
        stack.pop()
      }

      const parentContainer = stack[stack.length - 1]
      if (
        parentContainer &&
        (parentContainer.block.type === 'itemize' || parentContainer.block.type === 'enumerate')
      ) {
        const itemBlock: Block = { type: 'item', children: [] }
        parentContainer.block.children!.push(itemBlock)
        stack.push({ block: itemBlock })

        const itemContent = trimmed.slice(5).trim()
        if (itemContent) {
          itemBlock.children!.push({ type: 'paragraph', content: itemContent })
        }
      } else {
        // loose item outside list
        const itemContent = trimmed.slice(5).trim()
        addBlock({ type: 'paragraph', content: `• ${itemContent}` })
      }
      i++
      continue
    }

    // 9. Handle environment endings
    if (trimmed.startsWith('\\end{')) {
      const envNameMatch = trimmed.match(/\\end\{([^}]+)\}/)
      if (envNameMatch) {
        const envName = envNameMatch[1]
        // Pop stack until we close the corresponding environment
        while (stack.length > 0) {
          const popped = stack.pop()
          if (popped && popped.block.type === envName) {
            break
          }
        }
      }
      i++
      continue
    }

    // 10. Headings
    const sectionMatch = trimmed.match(/^\\section\{([\s\S]+?)\}/)
    if (sectionMatch) {
      addBlock({ type: 'heading', level: 1, content: sectionMatch[1] })
      i++
      continue
    }
    const subsectionMatch = trimmed.match(/^\\subsection\{([\s\S]+?)\}/)
    if (subsectionMatch) {
      addBlock({ type: 'heading', level: 2, content: subsectionMatch[1] })
      i++
      continue
    }
    const subsubsectionMatch = trimmed.match(/^\\subsubsection\{([\s\S]+?)\}/)
    if (subsubsectionMatch) {
      addBlock({ type: 'heading', level: 3, content: subsubsectionMatch[1] })
      i++
      continue
    }

    // 11. Figure specific commands (inside figure block)
    const currentContainer = stack[stack.length - 1]
    if (currentContainer && currentContainer.block.type === 'figure') {
      const captionMatch = trimmed.match(/\\caption\{([\s\S]+?)\}/)
      if (captionMatch) {
        currentContainer.block.caption = captionMatch[1]
        i++
        continue
      }

      const graphicsMatch = trimmed.match(/\\includegraphics(?:\[.*?\])?\{([^}]+)\}/)
      if (graphicsMatch) {
        const imgBlock: Block = { type: 'image', imageUrl: graphicsMatch[1] }
        currentContainer.block.children!.push(imgBlock)
        i++
        continue
      }

      // Ignore figure positioning/label flags during layout parsing
      if (trimmed.startsWith('\\centering') || trimmed.startsWith('\\label{')) {
        i++
        continue
      }
    }

    // 12. Loose graphics (outside figure environment)
    const looseGraphicsMatch = trimmed.match(/\\includegraphics(?:\[.*?\])?\{([^}]+)\}/)
    if (looseGraphicsMatch) {
      addBlock({ type: 'image', imageUrl: looseGraphicsMatch[1] })
      i++
      continue
    }

    // 13. Markdown-style image tags
    if (trimmed.startsWith('![') && trimmed.endsWith(')')) {
      const match = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/)
      if (match) {
        addBlock({ type: 'image', imageUrl: match[2], caption: match[1] })
        i++
        continue
      }
    }

    // 14. Block math $$ ... $$
    if (trimmed.startsWith('$$')) {
      let blockContent = trimmed
      const hasClosingDoubleDollar = trimmed.length > 2 && trimmed.endsWith('$$')

      if (!hasClosingDoubleDollar) {
        let j = i + 1
        while (j < lines.length) {
          const nextTrimmed = lines[j].trim()
          blockContent += '\n' + lines[j]
          if (nextTrimmed.endsWith('$$') || nextTrimmed.includes('$$')) {
            break
          }
          j++
        }
        i = j
      }
      addBlock({ type: 'equation', content: blockContent })
      i++
      continue
    }

    // 15. Default paragraph
    if (currentContainer && currentContainer.block.type === 'item') {
      const lastChild =
        currentContainer.block.children![currentContainer.block.children!.length - 1]
      if (lastChild && lastChild.type === 'paragraph') {
        lastChild.content += '\n' + line
      } else {
        currentContainer.block.children!.push({ type: 'paragraph', content: line })
      }
    } else {
      addBlock({ type: 'paragraph', content: line })
    }

    i++
  }

  function addBlock(block: Block) {
    if (stack.length > 0) {
      const active = stack[stack.length - 1]
      if (
        (active.block.type === 'itemize' || active.block.type === 'enumerate') &&
        block.type !== 'item'
      ) {
        let lastItem = active.block.children![active.block.children!.length - 1]
        if (!lastItem || lastItem.type !== 'item') {
          lastItem = { type: 'item', children: [] }
          active.block.children!.push(lastItem)
        }
        lastItem.children!.push(block)
      } else {
        if (!active.block.children) active.block.children = []
        active.block.children.push(block)
      }
    } else {
      rootBlocks.push(block)
    }
  }

  return rootBlocks
}

function renderBlock(block: Block, index: number, figureNumber?: number): React.ReactNode {
  switch (block.type) {
    case 'empty':
      return <div key={`empty-${index}`} className="h-3" />

    case 'paragraph': {
      if (!block.content?.trim()) return null
      return (
        <p key={`p-${index}`} className="text-foreground/85 leading-relaxed text-sm my-2">
          {parseLatexInline(block.content)}
        </p>
      )
    }

    case 'heading': {
      const headingContent = parseLatexInline(block.content || '')
      if (block.level === 1) {
        return (
          <h1
            key={`h1-${index}`}
            className="text-base font-bold text-foreground mt-4 mb-3 border-b pb-1 border-border/45"
          >
            {headingContent}
          </h1>
        )
      } else if (block.level === 2) {
        return (
          <h2 key={`h2-${index}`} className="text-sm font-semibold text-foreground mt-5 mb-2">
            {headingContent}
          </h2>
        )
      } else {
        return (
          <h3 key={`h3-${index}`} className="text-xs font-medium text-foreground mt-4 mb-1.5">
            {headingContent}
          </h3>
        )
      }
    }

    case 'itemize':
      return (
        <ul
          key={`ul-${index}`}
          className="list-disc pl-6 space-y-1.5 my-3 text-muted-foreground text-sm"
        >
          {block.children?.map((child, idx) => renderBlock(child, idx, figureNumber))}
        </ul>
      )

    case 'enumerate':
      return (
        <ol
          key={`ol-${index}`}
          className="list-decimal pl-6 space-y-1.5 my-3 text-muted-foreground text-sm"
        >
          {block.children?.map((child, idx) => renderBlock(child, idx, figureNumber))}
        </ol>
      )

    case 'item': {
      if (!block.children || block.children.length === 0) return <li key={`li-${index}`} />

      const firstChild = block.children[0]
      const remainingChildren = block.children.slice(1)

      if (firstChild.type === 'paragraph') {
        return (
          <li key={`li-${index}`} className="text-foreground/85 leading-relaxed text-sm my-1">
            <span>{parseLatexInline(firstChild.content || '')}</span>
            {remainingChildren.map((child, idx) => renderBlock(child, idx, figureNumber))}
          </li>
        )
      }

      return (
        <li key={`li-${index}`} className="text-foreground/85 leading-relaxed text-sm my-1">
          {block.children.map((child, idx) => renderBlock(child, idx, figureNumber))}
        </li>
      )
    }

    case 'center':
      return (
        <div key={`center-${index}`} className="text-center my-4">
          {block.children?.map((child, idx) => renderBlock(child, idx, figureNumber))}
        </div>
      )

    case 'figure': {
      const caption = block.caption
      return (
        <figure key={`fig-${index}`} className="my-6 w-full flex flex-col items-center">
          <div className="w-full flex flex-col items-center gap-4">
            {block.children?.map((child, idx) => renderBlock(child, idx, figureNumber))}
          </div>
          {caption && (
            <figcaption className="mt-2 text-center text-[11px] text-muted-foreground/80 italic font-sans select-none max-w-[90%]">
              <span className="font-semibold not-italic text-foreground/80">Figure {figureNumber}: </span>
              {parseLatexInline(caption)}
            </figcaption>
          )}
        </figure>
      )
    }

    case 'image': {
      const url = block.imageUrl
      if (!url) return null
      return (
        <div key={`img-${index}`} className="my-4 w-full flex justify-center">
          <img
            src={url}
            alt={block.caption || 'Image'}
            className="max-h-[350px] w-auto max-w-full object-contain rounded-md select-none"
          />
        </div>
      )
    }

    case 'verbatim':
      return (
        <div
          key={`verbatim-${index}`}
          className="bg-muted/50 border border-border/50 rounded-lg overflow-hidden my-3 font-mono text-xs"
        >
          <pre className="p-3 overflow-x-auto text-foreground/80 whitespace-pre scrollbar-thin">
            <code>{block.content?.trim()}</code>
          </pre>
        </div>
      )

    case 'lstlisting': {
      const language = block.options?.language
      const caption = block.options?.caption
      return (
        <CodeBlock
          key={`lstlisting-${index}`}
          code={block.content?.trim() || ''}
          language={language}
          caption={caption}
        />
      )
    }

    case 'equation':
    case 'align': {
      const isAlign = block.type === 'align'
      const content = block.content?.trim() || ''
      let rawFormula = content
      if (!content.startsWith('$$')) {
        rawFormula = isAlign
          ? `$$ \\begin{aligned} ${content} \\end{aligned} $$`
          : `$$ ${content} $$`
      }

      return (
        <div
          key={`eq-${index}`}
          className="my-4 block text-center overflow-x-auto max-w-full"
        >
          <MathText>{rawFormula}</MathText>
        </div>
      )
    }

    default:
      return null
  }
}

interface LatexRendererProps {
  content?: string
  className?: string
}

export function LatexRenderer({ content = '', className }: LatexRendererProps) {
  const elements = useMemo(() => {
    if (!content) {
      return [
        <p key="empty" className="text-xs italic text-muted-foreground/60">
          No content provided.
        </p>,
      ]
    }

    const blocks = parseLatexDocument(content)

    // Pre-calculate sequential figure numbers for proper LaTeX floats numbering
    let figureCounter = 0
    const blockFigureNumbers: Record<number, number> = {}
    blocks.forEach((block, idx) => {
      if (block.type === 'figure') {
        figureCounter++
        blockFigureNumbers[idx] = figureCounter
      }
    })

    return blocks.map((block, idx) => renderBlock(block, idx, blockFigureNumbers[idx]))
  }, [content])

  return <div className={className}>{elements}</div>
}
