import { BrowserRouter, Route, Routes } from 'react-router'
import { HomePage } from './routes/HomePage'
import { RoomPage } from './routes/RoomPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/r/:slug" element={<RoomPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  )
}
