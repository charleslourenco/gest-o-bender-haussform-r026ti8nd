import React, { createContext, useContext, useState, ReactNode } from 'react'
import { Project, Client, InventoryItem, Stage } from '@/types'

interface AppState {
  projects: Project[]
  clients: Client[]
  inventory: InventoryItem[]
  moveProject: (id: string, newStage: Stage) => void
  addProject: (project: Omit<Project, 'id'>) => void
  addClient: (client: Omit<Client, 'id' | 'totalProjects' | 'createdAt'>) => void
}

const mockProjects: Project[] = []
const mockClients: Client[] = []
const mockInventory: InventoryItem[] = []

const AppContext = createContext<AppState | undefined>(undefined)

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>(mockProjects)
  const [clients, setClients] = useState<Client[]>(mockClients)
  const [inventory, setInventory] = useState<InventoryItem[]>(mockInventory)

  const moveProject = (id: string, newStage: Stage) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          let progress = p.progress
          if (newStage === 'Medição') progress = 10
          if (newStage === 'Projeto') progress = 30
          if (newStage === 'Aprovação') progress = 50
          if (newStage === 'Produção') progress = 70
          if (newStage === 'Montagem') progress = 90
          if (newStage === 'Finalizado') progress = 100
          return { ...p, stage: newStage, progress }
        }
        return p
      }),
    )
  }

  const addProject = (project: Omit<Project, 'id'>) => {
    const newProject = { ...project, id: `p${Date.now()}` }
    setProjects((prev) => [...prev, newProject])
  }

  const addClient = (client: Omit<Client, 'id' | 'totalProjects' | 'createdAt'>) => {
    const newClient: Client = {
      ...client,
      id: `c${Date.now()}`,
      totalProjects: 0,
      createdAt: new Date().toISOString().split('T')[0],
    }
    setClients((prev) => [...prev, newClient])
  }

  return React.createElement(
    AppContext.Provider,
    { value: { projects, clients, inventory, moveProject, addProject, addClient } },
    children,
  )
}

export const useAppStore = () => {
  const context = useContext(AppContext)
  if (!context) throw new Error('useAppStore must be used within AppProvider')
  return context
}
