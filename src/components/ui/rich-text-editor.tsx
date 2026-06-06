import { useState, useRef, useEffect } from 'react'
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Code,
  Type,
} from 'lucide-react'
import { Toggle } from '@/components/ui/toggle'
import { Textarea } from '@/components/ui/textarea'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function RichTextEditor({ value, onChange, className }: RichTextEditorProps) {
  const [isHtmlMode, setIsHtmlMode] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isHtmlMode && editorRef.current && editorRef.current.innerHTML !== value) {
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value
      }
    }
  }, [value, isHtmlMode])

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const format = (command: string, val?: string) => {
    if (isHtmlMode) return
    document.execCommand(command, false, val)
    editorRef.current?.focus()
    handleInput()
  }

  return (
    <div
      className={`flex flex-col border border-steel-blue/30 rounded-md bg-white overflow-hidden ${className}`}
    >
      <div className="flex flex-wrap gap-1 p-1.5 bg-slate-50 border-b border-steel-blue/20 shrink-0">
        <Toggle
          size="sm"
          pressed={!isHtmlMode}
          onClick={() => setIsHtmlMode(false)}
          aria-label="Modo Visual"
        >
          <Type className="h-4 w-4 mr-2" /> Visual
        </Toggle>
        <Toggle
          size="sm"
          pressed={isHtmlMode}
          onClick={() => setIsHtmlMode(true)}
          aria-label="Modo HTML"
        >
          <Code className="h-4 w-4 mr-2" /> Código
        </Toggle>

        {!isHtmlMode && (
          <>
            <div className="w-px h-6 bg-slate-200 mx-2 my-auto" />
            <Toggle size="sm" onClick={() => format('bold')} aria-label="Negrito">
              <Bold className="h-4 w-4" />
            </Toggle>
            <Toggle size="sm" onClick={() => format('italic')} aria-label="Itálico">
              <Italic className="h-4 w-4" />
            </Toggle>
            <Toggle size="sm" onClick={() => format('underline')} aria-label="Sublinhado">
              <Underline className="h-4 w-4" />
            </Toggle>
            <div className="w-px h-6 bg-slate-200 mx-2 my-auto" />
            <Toggle size="sm" onClick={() => format('insertUnorderedList')} aria-label="Lista">
              <List className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              onClick={() => format('insertOrderedList')}
              aria-label="Lista Numerada"
            >
              <ListOrdered className="h-4 w-4" />
            </Toggle>
            <div className="w-px h-6 bg-slate-200 mx-2 my-auto" />
            <Toggle size="sm" onClick={() => format('justifyLeft')} aria-label="Alinhar à Esquerda">
              <AlignLeft className="h-4 w-4" />
            </Toggle>
            <Toggle size="sm" onClick={() => format('justifyCenter')} aria-label="Centralizar">
              <AlignCenter className="h-4 w-4" />
            </Toggle>
            <Toggle size="sm" onClick={() => format('justifyRight')} aria-label="Alinhar à Direita">
              <AlignRight className="h-4 w-4" />
            </Toggle>
          </>
        )}
      </div>

      {isHtmlMode ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 p-4 resize-none font-mono text-sm border-0 focus-visible:ring-0 rounded-none h-full min-h-[300px]"
        />
      ) : (
        <div
          ref={editorRef}
          className="flex-1 p-6 sm:p-10 overflow-y-auto bg-white prose prose-sm max-w-none focus:outline-none shadow-inner h-full min-h-[300px]"
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
        />
      )}
    </div>
  )
}
