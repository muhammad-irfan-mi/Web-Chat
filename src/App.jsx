import { useState } from 'react'
import './App.css'
import ChatWidget from './component/ChatWidget'

function App() {
  const [open, setOpen] = useState(false)

  return (
    <>
        <ChatWidget onClose={()=> setOpen(false)}/>
    </>
  )
}

export default App
