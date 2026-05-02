import { useContext } from 'react'
import { SportControlContext } from './SportControlContext'

export const useSportControl = () => {
  const ctx = useContext(SportControlContext)
  if (!ctx) throw new Error('useSportControl must be used within SportControlProvider')
  return ctx
}
