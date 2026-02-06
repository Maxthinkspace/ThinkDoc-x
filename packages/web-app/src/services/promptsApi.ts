// ============================================
// PROMPTS API SERVICE
// Manages user prompts using localStorage (can be migrated to backend later)
// ============================================

export interface Prompt {
  id: string
  userId: string
  name: string
  description?: string
  content: string
  category: 'draft' | 'assist' | 'review' | 'research' | 'custom'
  tags?: string[]
  isStarred: boolean
  useCount: number
  lastUsedAt?: string
  createdAt: string
  updatedAt: string
}

export interface CreatePromptRequest {
  name: string
  description?: string
  content: string
  category?: 'draft' | 'assist' | 'review' | 'research' | 'custom'
  tags?: string[]
}

export interface UpdatePromptRequest {
  name?: string
  description?: string
  content?: string
  category?: 'draft' | 'assist' | 'review' | 'research' | 'custom'
  tags?: string[]
  isStarred?: boolean
}

const STORAGE_KEY = 'thinkdoc_prompts'

// Helper to get current user ID from localStorage
const getCurrentUserId = (): string => {
  const authData = localStorage.getItem('auth_user')
  if (authData) {
    try {
      const user = JSON.parse(authData)
      return user.id || 'anonymous'
    } catch {
      return 'anonymous'
    }
  }
  return 'anonymous'
}

// Helper to generate UUID
const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Get all prompts from localStorage
const getAllPrompts = (): Prompt[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

// Save all prompts to localStorage
const saveAllPrompts = (prompts: Prompt[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts))
}

export class PromptsApiService {
  // ============================================
  // PROMPTS CRUD
  // ============================================

  async getPrompts(params?: {
    category?: string
    isStarred?: boolean
    search?: string
    limit?: number
    offset?: number
  }): Promise<Prompt[]> {
    const userId = getCurrentUserId()
    let prompts = getAllPrompts().filter(p => p.userId === userId)

    // Apply filters
    if (params?.category) {
      prompts = prompts.filter(p => p.category === params.category)
    }
    if (params?.isStarred !== undefined) {
      prompts = prompts.filter(p => p.isStarred === params.isStarred)
    }
    if (params?.search) {
      const search = params.search.toLowerCase()
      prompts = prompts.filter(p => 
        p.name.toLowerCase().includes(search) ||
        p.description?.toLowerCase().includes(search) ||
        p.content.toLowerCase().includes(search) ||
        p.tags?.some(t => t.toLowerCase().includes(search))
      )
    }

    // Sort by starred first, then by last used/created
    prompts.sort((a, b) => {
      if (a.isStarred !== b.isStarred) return b.isStarred ? 1 : -1
      const aDate = a.lastUsedAt || a.createdAt
      const bDate = b.lastUsedAt || b.createdAt
      return new Date(bDate).getTime() - new Date(aDate).getTime()
    })

    // Apply pagination
    const offset = params?.offset || 0
    const limit = params?.limit || 100
    return prompts.slice(offset, offset + limit)
  }

  async getPrompt(id: string): Promise<Prompt | null> {
    const userId = getCurrentUserId()
    const prompts = getAllPrompts()
    return prompts.find(p => p.id === id && p.userId === userId) || null
  }

  async createPrompt(request: CreatePromptRequest): Promise<Prompt> {
    const userId = getCurrentUserId()
    const now = new Date().toISOString()
    
    const newPrompt: Prompt = {
      id: generateId(),
      userId,
      name: request.name,
      description: request.description,
      content: request.content,
      category: request.category || 'custom',
      tags: request.tags || [],
      isStarred: false,
      useCount: 0,
      createdAt: now,
      updatedAt: now,
    }

    const prompts = getAllPrompts()
    prompts.push(newPrompt)
    saveAllPrompts(prompts)

    return newPrompt
  }

  async updatePrompt(id: string, request: UpdatePromptRequest): Promise<Prompt | null> {
    const userId = getCurrentUserId()
    const prompts = getAllPrompts()
    const index = prompts.findIndex(p => p.id === id && p.userId === userId)
    
    if (index === -1) return null

    const updatedPrompt: Prompt = {
      ...prompts[index],
      ...request,
      updatedAt: new Date().toISOString(),
    }

    prompts[index] = updatedPrompt
    saveAllPrompts(prompts)

    return updatedPrompt
  }

  async deletePrompt(id: string): Promise<boolean> {
    const userId = getCurrentUserId()
    const prompts = getAllPrompts()
    const filteredPrompts = prompts.filter(p => !(p.id === id && p.userId === userId))
    
    if (filteredPrompts.length === prompts.length) return false

    saveAllPrompts(filteredPrompts)
    return true
  }

  async toggleStar(id: string): Promise<Prompt | null> {
    const userId = getCurrentUserId()
    const prompts = getAllPrompts()
    const index = prompts.findIndex(p => p.id === id && p.userId === userId)
    
    if (index === -1) return null

    prompts[index] = {
      ...prompts[index],
      isStarred: !prompts[index].isStarred,
      updatedAt: new Date().toISOString(),
    }

    saveAllPrompts(prompts)
    return prompts[index]
  }

  async incrementUseCount(id: string): Promise<Prompt | null> {
    const userId = getCurrentUserId()
    const prompts = getAllPrompts()
    const index = prompts.findIndex(p => p.id === id && p.userId === userId)
    
    if (index === -1) return null

    prompts[index] = {
      ...prompts[index],
      useCount: prompts[index].useCount + 1,
      lastUsedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    saveAllPrompts(prompts)
    return prompts[index]
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================

  async getStarredPrompts(): Promise<Prompt[]> {
    return this.getPrompts({ isStarred: true })
  }

  async getRecentPrompts(limit: number = 5): Promise<Prompt[]> {
    const prompts = await this.getPrompts()
    return prompts
      .filter(p => p.lastUsedAt)
      .sort((a, b) => new Date(b.lastUsedAt!).getTime() - new Date(a.lastUsedAt!).getTime())
      .slice(0, limit)
  }

  async getPromptsByCategory(category: Prompt['category']): Promise<Prompt[]> {
    return this.getPrompts({ category })
  }

  // ============================================
  // SEARCH
  // ============================================

  async searchPrompts(query: string): Promise<Prompt[]> {
    return this.getPrompts({ search: query })
  }
}

// Export singleton instance
export const promptsApi = new PromptsApiService()


