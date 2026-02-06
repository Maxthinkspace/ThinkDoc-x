import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Folder, Book, LayoutDashboard, MessageSquare } from 'lucide-react'
import { ClausesView } from './library/ClausesView'
import { ProjectsView } from './library/ProjectsView'
import { PlaybooksView } from './library/PlaybooksView'
import { PromptsView } from './library/PromptsView'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type LibraryTab = 'prompts' | 'clauses' | 'projects' | 'playbooks'

export const LibraryDashboard = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<LibraryTab>('prompts')

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-muted/30 p-4">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <LayoutDashboard size={20} />
            Library
          </h2>
        </div>
        <nav className="space-y-2">
          <button
            onClick={() => setActiveTab('prompts')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'prompts'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <MessageSquare size={18} />
            Prompts
          </button>
          <button
            onClick={() => setActiveTab('clauses')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'clauses'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <FileText size={18} />
            Clauses
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'projects'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Folder size={18} />
            Projects
          </button>
          <button
            onClick={() => setActiveTab('playbooks')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'playbooks'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Book size={18} />
            Playbooks
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'prompts' && <PromptsView />}
        {activeTab === 'clauses' && <ClausesView />}
        {activeTab === 'projects' && <ProjectsView />}
        {activeTab === 'playbooks' && <PlaybooksView />}
      </div>
    </div>
  )
}

