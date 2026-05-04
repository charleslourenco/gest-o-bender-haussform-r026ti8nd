import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function DocumentacaoLead() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/clientes', { replace: true })
  }, [navigate])

  return (
    <div className="p-8 flex items-center justify-center h-full text-midnight-navy font-semibold">
      Redirecionando para a área de clientes...
    </div>
  )
}
