import LogoutButton from '@/components/LogoutButton'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header className="flex items-center justify-between border-b p-4">
        <span className="font-semibold">Written</span>
        <LogoutButton />
      </header>
      {children}
    </div>
  )
}
