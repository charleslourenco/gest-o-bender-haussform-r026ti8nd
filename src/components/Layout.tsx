import { Outlet } from 'react-router-dom'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { Header } from './Header'
import { AIAssistant } from './AIAssistant'

export default function Layout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-off-white overflow-hidden">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden w-full transition-all">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-off-white relative">
            <div className="mx-auto max-w-7xl animate-fade-in-up">
              <Outlet />
            </div>
          </main>
        </div>
        <AIAssistant />
      </div>
    </SidebarProvider>
  )
}
