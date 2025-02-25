import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Config.css';
import { Prompt, BUILT_IN_PROMPTS } from '../types/Prompt';

function Config() {
  const navigate = useNavigate();
  
  // State for configuration
  const [config, setConfig] = useState({
    defaultProvider: 'openrouter',
    openrouterApiKey: '',
    anthropicApiKey: '',
    anthropicSuperEgoModel: 'claude-3-7-sonnet-20250219',
    anthropicBaseModel: 'claude-3-7-sonnet-20250219',
    openrouterSuperEgoModel: 'anthropic/claude-3.7-sonnet',
    openrouterBaseModel: 'anthropic/claude-3.7-sonnet',
    superEgoPromptFile: 'default',
    saveHistory: true
  });
  
  // State to track if settings have been modified
  const [isDirty, setIsDirty] = useState(false);
  

  // Load config from localStorage and environment variables on component mount
  useEffect(() => {
    // First try to load from localStorage
    const savedConfig = localStorage.getItem('superego-config');
    let configData = savedConfig ? JSON.parse(savedConfig) : { ...config };
    
    // Check for environment variables and use them if available
    const anthropicApiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    const openrouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    
    if (anthropicApiKey && (!configData.anthropicApiKey || configData.anthropicApiKey === '')) {
      configData.anthropicApiKey = anthropicApiKey as string;
    }
    
    if (openrouterApiKey && (!configData.openrouterApiKey || configData.openrouterApiKey === '')) {
      configData.openrouterApiKey = openrouterApiKey as string;
    }
    
    // Update the config state
    setConfig(configData);
  }, []);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Handle checkbox inputs
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setConfig(prev => ({ ...prev, [name]: checked }));
    } else {
      setConfig(prev => ({ ...prev, [name]: value }));
    }
    
    // Mark settings as modified
    setIsDirty(true);
  };
  
  // Save settings
  const handleSave = () => {
    // Save the config to localStorage
    localStorage.setItem('superego-config', JSON.stringify(config));
    
    // Reset dirty flag
    setIsDirty(false);
    
    // Show confirmation
    alert('Settings saved successfully!');
  };
  
  // Handle navigation with unsaved changes warning
  const handleNavigation = (path: string) => {
    if (isDirty) {
      const confirmNavigation = window.confirm('You have unsaved changes. Save before leaving?');
      if (confirmNavigation) {
        handleSave();
      }
    }
    navigate(path);
  };
  
  // Handle prompt selection
  const handleSelectPrompt = (promptId: string) => {
    setConfig(prev => ({ ...prev, superEgoPromptFile: promptId }));
    setIsDirty(true);
  };

  return (
    <div className="config">
      <h2>Configuration</h2>
      
      <div className="config-sections">
        <div className="config-section">
          <h3>Provider Settings</h3>
          <div className="form-group">
            <label htmlFor="defaultProvider">Default Provider:</label>
            <select 
              id="defaultProvider" 
              name="defaultProvider" 
              value={config.defaultProvider}
              onChange={handleChange}
            >
              <option value="anthropic">Anthropic</option>
              <option value="openrouter">OpenRouter</option>
            </select>
          </div>
        </div>
        
        <div className="config-section">
          <h3>API Keys</h3>
          <div className="form-group">
            <label htmlFor="anthropicApiKey">Anthropic API Key:</label>
            <input 
              type="password" 
              id="anthropicApiKey" 
              name="anthropicApiKey" 
              value={config.anthropicApiKey}
              onChange={handleChange}
              placeholder="Enter your Anthropic API key"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="openrouterApiKey">OpenRouter API Key:</label>
            <input 
              type="password" 
              id="openrouterApiKey" 
              name="openrouterApiKey" 
              value={config.openrouterApiKey}
              onChange={handleChange}
              placeholder="Enter your OpenRouter API key"
            />
          </div>
        </div>
        
        <div className="config-section">
          <h3>Model Settings</h3>
          <h4>Anthropic Models</h4>
          <div className="form-group">
            <label htmlFor="anthropicSuperEgoModel">Superego Model:</label>
            <input 
              type="text" 
              id="anthropicSuperEgoModel" 
              name="anthropicSuperEgoModel" 
              value={config.anthropicSuperEgoModel}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="anthropicBaseModel">Base Model:</label>
            <input 
              type="text" 
              id="anthropicBaseModel" 
              name="anthropicBaseModel" 
              value={config.anthropicBaseModel}
              onChange={handleChange}
            />
          </div>
          
          <h4>OpenRouter Models</h4>
          <div className="form-group">
            <label htmlFor="openrouterSuperEgoModel">Superego Model:</label>
            <input 
              type="text" 
              id="openrouterSuperEgoModel" 
              name="openrouterSuperEgoModel" 
              value={config.openrouterSuperEgoModel}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="openrouterBaseModel">Base Model:</label>
            <input 
              type="text" 
              id="openrouterBaseModel" 
              name="openrouterBaseModel" 
              value={config.openrouterBaseModel}
              onChange={handleChange}
            />
          </div>
        </div>
        
        <div className="config-section">
          <h3>Prompt Settings</h3>
          <div className="form-group">
            <label htmlFor="superEgoPromptFile">Default Superego Prompt:</label>
            <select 
              id="superEgoPromptFile" 
              name="superEgoPromptFile" 
              value={config.superEgoPromptFile}
              onChange={handleChange}
            >
              {/* Built-in prompts */}
              {BUILT_IN_PROMPTS.map(prompt => (
                <option key={prompt.id} value={prompt.id}>
                  {prompt.name} (Built-in)
                </option>
              ))}
              
              {/* Custom prompts */}
              {(() => {
                const savedPrompts = localStorage.getItem('superego-prompts');
                if (!savedPrompts) return null;
                
                try {
                  const customPrompts = JSON.parse(savedPrompts) as Prompt[];
                  return customPrompts.map(prompt => (
                    <option key={prompt.id} value={prompt.id}>
                      {prompt.name} (Custom)
                    </option>
                  ));
                } catch (error) {
                  console.error('Error parsing saved prompts:', error);
                  return null;
                }
              })()}
            </select>
          </div>
          <p className="help-text">
            <Link to="/prompts" className="link">Manage your prompts in the Prompt Manager</Link>
          </p>
        </div>
        
        <div className="config-section">
          <h3>Other Settings</h3>
          <div className="form-group checkbox">
            <label htmlFor="saveHistory">
              <input 
                type="checkbox" 
                id="saveHistory" 
                name="saveHistory" 
                checked={config.saveHistory}
                onChange={handleChange}
              />
              Save conversation history
            </label>
          </div>
        </div>
      </div>
      
      <div className="action-buttons">
        <button onClick={handleSave} className="button primary" disabled={!isDirty}>
          Save Settings
        </button>
        <button onClick={() => handleNavigation('/chat')} className="button primary">
          Start Chat
        </button>
        <Link to="/prompts" className="button secondary">
          Prompt Manager
        </Link>
        <Link to="/" className="button secondary">
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export default Config;
