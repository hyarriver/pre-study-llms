import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import ChapterList from './pages/ChapterList'
import ChapterDetail from './pages/ChapterDetail'
import Login from './pages/Login'
import MaterialUpload from './pages/MaterialUpload'
import AdminMaterialReview from './pages/AdminMaterialReview'
import { useAuthStore } from './store/authStore'

function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe)

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chapters" element={<ChapterList />} />
          <Route path="/chapters/:id" element={<ChapterDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/materials/upload" element={<MaterialUpload />} />
          <Route path="/admin/materials" element={<AdminMaterialReview />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
