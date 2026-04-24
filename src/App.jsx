import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AdminProvider } from './context/AdminContext'
import Navbar from './components/Navbar'
import SchedulePage from './pages/SchedulePage'
import CalendarPage from './pages/CalendarPage'
import EmployeePage from './pages/EmployeePage'
import HistoryPage from './pages/HistoryPage'
import ChatWidget from './components/ChatWidget'
import './App.css'

export default function App() {
  return (
    <AdminProvider>
      <BrowserRouter>
        <Navbar />
        <div style={{ paddingTop: '60px', minHeight: '100vh' }}>
          <Routes>
            <Route path="/" element={<SchedulePage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/employees" element={<EmployeePage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </div>
        <ChatWidget />
      </BrowserRouter>
    </AdminProvider>
  )
}
