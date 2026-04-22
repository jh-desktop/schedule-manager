import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import SchedulePage from './pages/SchedulePage'
import CalendarPage from './pages/CalendarPage'
import EmployeePage from './pages/EmployeePage'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <div style={{ paddingTop: '60px', minHeight: '100vh' }}>
        <Routes>
          <Route path="/" element={<SchedulePage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/employees" element={<EmployeePage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
