'use client'

export default function NoteTimestamp({ createdAt }: { createdAt: string }) {
  return (
    <time dateTime={createdAt} suppressHydrationWarning>
      {new Date(createdAt).toLocaleString()}
    </time>
  )
}
