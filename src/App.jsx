import { useState } from 'react'
import './App.css'
import ChatWidget from './component/ChatWidget'
import { Chat as ChatIcon } from "@mui/icons-material";

function App() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg"
      >
        <ChatIcon fontSize="large" />
      </button>
      {open && <div className="h-screen border flex items-center justify-center">
        <ChatWidget onClose={()=> setOpen(false)}/>
      </div>}
    </>
  )
}

export default App
