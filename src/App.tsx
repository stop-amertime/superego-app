
import { Routes, Route } from 'react-router-dom';
import './App.css';

// Import components
import Home from './components/Home';
import Chat from './components/Chat';
import Config from './components/Config';
import PromptManager from './components/PromptManager';
function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Superego</h1>
        <p>LLM Screening Tool</p>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/config" element={<Config />} />
          <Route path="/prompts" element={<PromptManager onSelectPrompt={() => {}} selectedPromptId="" />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
