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

const mockProjects: Project[] = [
  {
    id: 'p1',
    name: 'Cozinha Planejada Silva',
    client: 'João Silva',
    stage: 'Produção',
    deadline: '2026-05-15',
    progress: 65,
    priority: 'Alta',
    tags: ['MDF', 'Laca'],
  },
  {
    id: 'p2',
    name: 'Guarda-roupa Master',
    client: 'Maria Oliveira',
    stage: 'Projeto',
    deadline: '2026-06-02',
    progress: 20,
    priority: 'Média',
    tags: ['Quarto'],
  },
  {
    id: 'p3',
    name: 'Painel TV Sala',
    client: 'Carlos Santos',
    stage: 'Montagem',
    deadline: '2026-05-05',
    progress: 90,
    priority: 'Urgente',
    tags: ['Freijó'],
  },
  {
    id: 'p4',
    name: 'Mesa Escritório Diretor',
    client: 'Empresa XPTO',
    stage: 'Medição',
    deadline: '2026-06-10',
    progress: 5,
    priority: 'Baixa',
    tags: ['Corporativo'],
  },
  {
    id: 'p5',
    name: 'Armários Banheiro',
    client: 'Ana Costa',
    stage: 'Finalizado',
    deadline: '2026-04-20',
    progress: 100,
    priority: 'Média',
    tags: ['Banheiro', 'MDF Naval'],
  },
  {
    id: 'p6',
    name: 'Recepção Clínica',
    client: 'Dra. Roberta',
    stage: 'Aprovação',
    deadline: '2026-05-25',
    progress: 40,
    priority: 'Alta',
    tags: ['Comercial', 'LED'],
  },
]

const mockClients: Client[] = [
  {
    id: 'c1',
    name: 'João Silva',
    email: 'joao.silva@email.com',
    phone: '(11) 98765-4321',
    totalProjects: 2,
    status: 'Ativo',
    createdAt: '2026-01-10',
  },
  {
    id: 'c2',
    name: 'Maria Oliveira',
    email: 'maria.oli@email.com',
    phone: '(11) 99999-1111',
    totalProjects: 1,
    status: 'Ativo',
    createdAt: '2026-02-15',
  },
  {
    id: 'c3',
    name: 'Carlos Santos',
    email: 'carlos.santos@email.com',
    phone: '(11) 91111-2222',
    totalProjects: 4,
    status: 'Ativo',
    createdAt: '2025-11-05',
  },
]

const mockInventory: InventoryItem[] = [
  {
    id: 'i1',
    name: 'MDF Branco Neve 15mm',
    category: 'Chapas',
    quantity: 12,
    unit: 'un',
    minStock: 20,
    price: 180.0,
  },
  {
    id: 'i2',
    name: 'Corrediça Telescópica 450mm',
    category: 'Ferragens',
    quantity: 150,
    unit: 'un',
    minStock: 50,
    price: 15.5,
  },
  {
    id: 'i3',
    name: 'Puxador Alumínio Perfil C',
    category: 'Ferragens',
    quantity: 45,
    unit: 'un',
    minStock: 30,
    price: 45.0,
  },
  {
    id: 'i4',
    name: 'Cola de Contato',
    category: 'Insumos',
    quantity: 3,
    unit: 'litro',
    minStock: 5,
    price: 55.0,
  },
  {
    id: 'i5',
    name: 'Fita de Borda Branca 22mm',
    category: 'Acabamentos',
    quantity: 300,
    unit: 'un',
    minStock: 100,
    price: 0.8,
  },
]

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
