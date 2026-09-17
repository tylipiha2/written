import ReactMarkdown from 'react-markdown'
import type { Note } from '@/lib/types'

export default function NoteFeed({ notes }: { notes: Note[] }) {
  if (notes.length === 0) {
    return <p className="text-gray-600">No notes yet — add the first one above.</p>
  }

  return (
    <ul className="space-y-4">
      {notes.map((note) => (
        <li key={note.id} className="rounded border p-4">
          <div className="prose prose-sm">
            <ReactMarkdown>{note.content}</ReactMarkdown>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            {new Date(note.created_at).toLocaleString()}
          </p>
        </li>
      ))}
    </ul>
  )
}
