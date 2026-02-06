import React, { useState, useEffect } from 'react'
import { Divider, Button as FButton, makeStyles } from '@fluentui/react-components'
import { FaArrowLeft } from 'react-icons/fa6'
import { Button, Tooltip } from '@fluentui/react-components'
import { useNavigation } from '../../hooks/use-navigation'
import { UnifiedSearchBar } from '../../components/library/UnifiedSearchBar'
import { CreateDropdown } from './components/CreateDropdown'
import { ClausesTab } from './tabs/ClausesTab'
import { ProjectsTab } from './tabs/ProjectsTab'
import { PlaybooksTab } from './tabs/PlaybooksTab'
import './styles/UnifiedLibrary.css'
import { CombinePlaybooksDialog } from './components/playbooks/CombinePlaybooksDialog'
import type { Playbook } from '../../../services/api'

const useStyles = makeStyles({
  root: {},
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '5px 19px 5px 19px',
  },
  headerTitle: {
    margin: '9px',
    fontWeight: 600,
    color: '#333333',
    fontSize: '15px',
  },
  headerIcon: {
    color: '#999999',
    border: 'none',
    backgroundColor: 'transparent',
    '&:hover': {
      color: '#999999',
      border: 'none',
      backgroundColor: 'transparent',
    },
  },
})

type LibraryTab = 'clauses' | 'projects' | 'playbooks'

interface UnifiedLibraryPageProps {
  initialTab?: LibraryTab
}

export const UnifiedLibraryPage: React.FC<UnifiedLibraryPageProps> = ({ initialTab }) => {
  const styles = useStyles()
  const { navigateTo, navigationState } = useNavigation()
  const [activeTab, setActiveTab] = useState<LibraryTab>(
    initialTab || (navigationState.tab || 'clauses')
  )

  // Playbook combination state
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedPlaybookIds, setSelectedPlaybookIds] = useState<Set<string>>(new Set())
  const [allPlaybooks, setAllPlaybooks] = useState<Playbook[]>([])
  const [combineDialogOpen, setCombineDialogOpen] = useState(false)

  const selectedPlaybooks = React.useMemo(() => {
    return allPlaybooks.filter((p) => selectedPlaybookIds.has(p.id))
  }, [allPlaybooks, selectedPlaybookIds])

  const handleCombinePlaybooks = () => {
    setActiveTab('playbooks')
    setSelectionMode(true)
  }

  const handleSelectionChange = (id: string, selected: boolean) => {
    setSelectedPlaybookIds((prev) => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(id)
      } else {
        newSet.delete(id)
      }
      return newSet
    })
  }

  const handleCancelSelection = () => {
    setSelectionMode(false)
    setSelectedPlaybookIds(new Set())
  }

  const handleCombineClick = () => {
    if (selectedPlaybookIds.size >= 2) {
      setCombineDialogOpen(true)
    }
  }

  const handlePlaybookCombined = (newPlaybook: Playbook) => {
    setAllPlaybooks((prev) => [newPlaybook, ...prev])
    handleCancelSelection()
  }

  // Handle navigation with tab parameter from navigation state
  useEffect(() => {
    // Check if there's a tab in the navigation state
    const navTab = navigationState?.tab as LibraryTab | undefined
    if (navTab && ['clauses', 'projects', 'playbooks'].includes(navTab)) {
      setActiveTab(navTab)
    } else if (initialTab && ['clauses', 'projects', 'playbooks'].includes(initialTab)) {
      setActiveTab(initialTab)
    }
  }, [navigationState, initialTab])

  const handleTabChange = (tab: LibraryTab) => {
    setActiveTab(tab)
    // In Word Add-in, we don't update URL - just update state
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Tooltip
          appearance="inverted"
          content="Back to menu"
          positioning="below"
          withArrow
          relationship="label"
        >
          <FButton
            icon={<FaArrowLeft style={{ fontSize: '12px' }} />}
            onClick={() => navigateTo('menu')}
            className={styles.headerIcon}
            style={{
              minWidth: '28px',
              maxWidth: '28px',
              height: '28px',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
        </Tooltip>
        <p className={styles.headerTitle}>Library</p>
        <div style={{ display: 'flex', gap: '4px' }}>
          <CreateDropdown activeTab={activeTab} onCombinePlaybooks={handleCombinePlaybooks} />
        </div>
      </div>
      <Divider />

      {/* Unified Search Bar */}
      <div style={{ padding: '12px' }}>
        <UnifiedSearchBar
          placeholder="Search clauses, projects, and playbooks..."
          onResultSelect={(result) => {
            // Navigate to appropriate tab and item
            const tabMap: Record<string, LibraryTab> = {
              clause: 'clauses',
              project: 'projects',
              playbook: 'playbooks',
            }
            const tab = tabMap[result.type] || 'clauses'
            handleTabChange(tab)
            // TODO: Scroll to or highlight the item
          }}
        />
      </div>

      {/* Tabs */}
      <div className="library-tabs-container">
        <div className="library-tabs">
          <button
            className={`library-tab ${activeTab === 'clauses' ? 'active' : ''}`}
            onClick={() => handleTabChange('clauses')}
          >
            Clauses
          </button>
          <button
            className={`library-tab ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => handleTabChange('projects')}
          >
            Projects
          </button>
          <button
            className={`library-tab ${activeTab === 'playbooks' ? 'active' : ''}`}
            onClick={() => handleTabChange('playbooks')}
          >
            Playbooks
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="library-tab-content">
        {activeTab === 'clauses' && <ClausesTab />}
        {activeTab === 'projects' && <ProjectsTab />}
        {activeTab === 'playbooks' && (
          <PlaybooksTab
            selectionMode={selectionMode}
            selectedIds={selectedPlaybookIds}
            onSelectionChange={handleSelectionChange}
            onPlaybooksLoaded={setAllPlaybooks}
            onCancelSelection={handleCancelSelection}
            onCombineClick={handleCombineClick}
          />
        )}
      </div>
      {/* Combine Playbooks Dialog */}
        <CombinePlaybooksDialog
          open={combineDialogOpen}
          playbooks={selectedPlaybooks}
          onClose={() => setCombineDialogOpen(false)}
          onCombined={handlePlaybookCombined}
        />
      </div>
    )
  }

