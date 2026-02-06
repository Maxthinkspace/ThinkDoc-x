import React, { useState, useEffect } from 'react'
import { libraryApi, type Project } from '../../../../services/libraryApi'
import { Loader2, Folder, FileText, Database } from 'lucide-react'
import { useToast } from '../../../hooks/use-toast'
import { buildApiUrl } from '../../../../services/apiBaseUrl'

interface VaultProject {
  id: string
  name: string
  description?: string
  fileCount: number
  visibility?: 'private' | 'shared'
  clientMatter?: string
  createdAt: string
  updatedAt: string
}

export const ProjectsTab: React.FC = () => {
  const { toast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [vaultProjects, setVaultProjects] = useState<VaultProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch both library projects and vault projects
      const [libraryProjects, vaultProjectsData] = await Promise.all([
        libraryApi.getProjects().catch(() => []),
        fetchVaultProjects().catch(() => []),
      ])
      
      setProjects(libraryProjects || [])
      setVaultProjects(vaultProjectsData || [])
    } catch (err) {
      console.error('Failed to fetch projects:', err)
      setError(err instanceof Error ? err.message : 'Failed to load projects')
      setProjects([])
      setVaultProjects([])
    } finally {
      setLoading(false)
    }
  }

  const fetchVaultProjects = async (): Promise<VaultProject[]> => {
    try {
      // Try both token keys for compatibility
      const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token')
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch(buildApiUrl('/api/vault/projects'), { headers })
      if (!response.ok) throw new Error('Failed to fetch vault projects')
      const data = await response.json()
      return data.projects || []
    } catch (err) {
      console.error('Failed to fetch vault projects:', err)
      return []
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project?')) return

    try {
      await libraryApi.deleteProject(id)
      setProjects((prev) => prev.filter((p) => p.id !== id))
      toast({
        title: 'Project Deleted',
        description: 'Project has been deleted successfully',
      })
    } catch (err) {
      console.error('Failed to delete project:', err)
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete project',
      })
    }
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '200px',
        gap: '10px',
      }}>
        <Loader2
          style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }}
        />
        <span>Loading projects...</span>
      </div>
    )
  }

  return (
    <div style={{ padding: '12px' }}>
      {error && (
        <div style={{
          padding: '20px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626',
          marginBottom: '20px',
        }}>
          <p>Error: {error}</p>
        </div>
      )}

      {(projects.length === 0 && vaultProjects.length === 0) && !loading && !error && (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#6b7280',
        }}>
          <p>No projects found. Create your first project to get started!</p>
        </div>
      )}

      {/* Vault Projects Section */}
      {vaultProjects.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#374151',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <Database size={16} />
            Vault Projects
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}>
            {vaultProjects.map((project) => (
              <div
                key={`vault-${project.id}`}
                style={{
                  padding: '16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'start', gap: '12px', marginBottom: '12px' }}>
                  <Database size={24} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#374151',
                      margin: '0 0 4px 0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {project.name}
                    </h3>
                    {project.clientMatter && (
                      <p style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        margin: '0 0 4px 0',
                      }}>
                        {project.clientMatter}
                      </p>
                    )}
                    {project.visibility === 'shared' && (
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        borderRadius: '4px',
                        display: 'inline-block',
                        marginBottom: '4px',
                      }}>
                        Shared
                      </span>
                    )}
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: '#9ca3af',
                  marginTop: '12px',
                }}>
                  <span>
                    <FileText size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    {project.fileCount} files
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Library Projects Section */}
      {projects.length > 0 && (
        <div>
          <h3 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#374151',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <Folder size={16} />
            Library Projects
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}>
            {projects.map((project) => (
          <div
            key={project.id}
            style={{
              padding: '16px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: 'white',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'start', gap: '12px', marginBottom: '12px' }}>
              <Folder size={24} style={{ color: '#3b82f6', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#374151',
                  margin: '0 0 4px 0',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {project.name}
                </h3>
                {project.description && (
                  <p style={{
                    fontSize: '13px',
                    color: '#6b7280',
                    margin: '0 0 8px 0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {project.description}
                  </p>
                )}
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#9ca3af',
              marginTop: '12px',
            }}>
              <span>
                <FileText size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                {project.itemCount || 0} items
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(project.id)
                }}
                style={{
                  padding: '4px 8px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
          </div>
        </div>
      )}
    </div>
  )
}

