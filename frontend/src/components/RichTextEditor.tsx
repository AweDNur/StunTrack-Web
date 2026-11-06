import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Bold, Heading1, Heading2, Image as ImageIcon, Italic, Link2, List, ListOrdered, Quote, Redo2, RemoveFormatting, Undo2 } from "lucide-react";

type Props = { value: string; onChange: (value: string) => void; placeholder?: string; rows?: number };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

// Older CMS records can contain plain text instead of separate HTML blocks.
// Convert each line into its own paragraph so block formatting affects only
// the paragraph where the cursor is placed, like a normal word processor.
function normalizeEditorContent(value: string) {
  if (!value.trim() || /<\/?[a-z][^>]*>/i.test(value)) return value;
  return value
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

export default function RichTextEditor({ value, onChange, placeholder = "Tulis konten...", rows = 7 }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2] } }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content: normalizeEditorContent(value),
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
  });

  useEffect(() => {
    const normalizedValue = normalizeEditorContent(value);
    if (editor && normalizedValue !== editor.getHTML()) editor.commands.setContent(normalizedValue || "", { emitUpdate: false });
  }, [editor, value]);

  if (!editor) return <div className="h-48 animate-pulse rounded-xl bg-[#f8fafc]" />;

  function addLink() {
    const previousUrl = editor.getAttributes("link").href || "https://";
    const url = window.prompt("Masukkan URL link:", previousUrl);
    if (url === null) return;
    if (url === "") editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url, target: "_blank" }).run();
  }

  function addImage() {
    const url = window.prompt("Masukkan URL gambar:", "https://");
    if (url && url !== "https://") editor.chain().focus().setImage({ src: url, alt: "Gambar About" }).run();
  }

  const buttons = [
    { label: "Bold", icon: <Bold size={17} />, active: editor.isActive("bold"), action: () => editor.chain().focus().toggleBold().run() },
    { label: "Italic", icon: <Italic size={17} />, active: editor.isActive("italic"), action: () => editor.chain().focus().toggleItalic().run() },
    { label: "Link", icon: <Link2 size={17} />, active: editor.isActive("link"), action: addLink },
    { label: "Heading 1", icon: <Heading1 size={17} />, active: editor.isActive("heading", { level: 1 }), action: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: "Heading 2", icon: <Heading2 size={17} />, active: editor.isActive("heading", { level: 2 }), action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Quote", icon: <Quote size={17} />, active: editor.isActive("blockquote"), action: () => editor.chain().focus().toggleBlockquote().run() },
    { label: "Bullet list", icon: <List size={17} />, active: editor.isActive("bulletList"), action: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Numbered list", icon: <ListOrdered size={17} />, active: editor.isActive("orderedList"), action: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Image URL", icon: <ImageIcon size={17} />, active: false, action: addImage },
    { label: "Clear formatting", icon: <RemoveFormatting size={17} />, active: false, action: () => editor.chain().focus().clearNodes().unsetAllMarks().run() },
  ];

  return <div data-rich-editor className="overflow-hidden rounded-xl border border-[#d1dbe5] bg-white focus-within:border-[#1c5fbd] focus-within:ring-4 focus-within:ring-[#1c5fbd]/10"><div className="flex flex-wrap items-center gap-1 border-b border-[#e3eaf2] bg-[#f8fafc] px-2 py-2">{buttons.map((button) => <button key={button.label} type="button" title={button.label} aria-label={button.label} onMouseDown={(event) => { event.preventDefault(); button.action(); }} className={`grid h-8 min-w-8 place-items-center rounded-md transition ${button.active ? "bg-[#d9e8ff] text-[#1c5fbd] shadow-inner" : "text-[#405155] hover:bg-[#eaf2ff] hover:text-[#1c5fbd]"}`}>{button.icon}</button>)}<span className="mx-1 h-6 w-px bg-[#d1dbe5]" /><button type="button" title="Undo" aria-label="Undo" disabled={!editor.can().undo()} onMouseDown={(event) => { event.preventDefault(); editor.chain().focus().undo().run(); }} className={`grid h-8 min-w-8 place-items-center rounded-md ${editor.can().undo() ? "text-[#1c5fbd] hover:bg-[#eaf2ff]" : "cursor-not-allowed text-[#c0c9d1]"}`}><Undo2 size={17} /></button><button type="button" title="Redo" aria-label="Redo" disabled={!editor.can().redo()} onMouseDown={(event) => { event.preventDefault(); editor.chain().focus().redo().run(); }} className={`grid h-8 min-w-8 place-items-center rounded-md ${editor.can().redo() ? "text-[#1c5fbd] hover:bg-[#eaf2ff]" : "cursor-not-allowed text-[#c0c9d1]"}`}><Redo2 size={17} /></button></div><EditorContent editor={editor} className="rich-text-content overflow-y-auto p-4 text-sm leading-relaxed text-[#303b45] [&_.tiptap]:min-h-0 [&_.tiptap]:outline-none" style={{ minHeight: `${rows * 24}px` }} /><span className="sr-only">{placeholder}</span></div>;
}
