import { Outlet } from 'react-router-dom'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { Header } from './Header'
import { ErrorBoundary } from './ErrorBoundary'
import { AIAssistant } from './AIAssistant'

export default function Layout() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-col flex-1 w-full pl-12 min-h-screen overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-background relative">
            <div className="mx-auto max-w-7xl animate-fade-in-up">
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </div>
          </main>
        </div>
        <AIAssistant />
      </div>
    </SidebarProvider>
  )
}
