import { createContext, useContext, useState } from 'react'

const AdminContext = createContext(null)
const ADMIN_PW = '0000'

export function AdminProvider({ children }) {
  const [adminMode, setAdminMode] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [adminInput, setAdminInput] = useState('')
  const [adminErr, setAdminErr] = useState(false)

  const openModal = () => setShowAdminModal(true)
  const exitAdmin = () => setAdminMode(false)

  const handleAdminConfirm = () => {
    if (adminInput === ADMIN_PW) {
      setAdminMode(true)
      setShowAdminModal(false)
      setAdminInput('')
      setAdminErr(false)
    } else {
      setAdminErr(true)
    }
  }

  return (
    <AdminContext.Provider value={{ adminMode, openModal, exitAdmin, showAdminModal, setShowAdminModal, adminInput, setAdminInput, adminErr, setAdminErr, handleAdminConfirm }}>
      {children}
    </AdminContext.Provider>
  )
}

export const useAdmin = () => useContext(AdminContext)
