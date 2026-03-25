export const metadata = {
  title: {
    template: '%s | Nanku Admin',
    default: 'Dashboard | Nanku Admin',
  },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
