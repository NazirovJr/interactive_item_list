import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ItemList from './components/ItemList'
import './App.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4">
            <h1 className="text-3xl font-bold text-gray-900">Interactive Item List</h1>
          </div>
        </header>
        <main>
          <ItemList />
        </main>
      </div>
    </QueryClientProvider>
  )
}

export default App
