
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
          <Route path="/prompts" element={<PromptManager 
            onSelectPrompt={(promptId) => {
              // Get the current config
              const savedConfig = localStorage.getItem('superego-config');
              if (savedConfig) {
                const config = JSON.parse(savedConfig);
                // Update the default constitution
                config.superEgoConstitutionFile = promptId;
                // Save the updated config
                localStorage.setItem('superego-config', JSON.stringify(config));
              }
            }} 
            selectedPromptId={(() => {
              // Get the current config to determine the selected prompt ID
              const savedConfig = localStorage.getItem('superego-config');
              if (savedConfig) {
                const config = JSON.parse(savedConfig);
                return config.superEgoConstitutionFile || 'default';
              }
              return 'default';
            })()} 
          />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
