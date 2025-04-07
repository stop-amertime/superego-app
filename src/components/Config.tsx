import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Config.css';
import { Prompt } from '../types/Prompt';

function Config() {
  const navigate = useNavigate();
  
  // Define the config type to include contextMessageLimit as number | null
  type ConfigState = {
    defaultProvider: 'anthropic' | 'openrouter';
    openrouterApiKey: string;
    anthropicApiKey: string;
    anthropicSuperEgoModel: string;
    anthropicBaseModel: string;
    openrouterSuperEgoModel: string;
    openrouterBaseModel: string;
    superEgoConstitutionFile: string;
    superEgoThinkingBudget: number;
    contextMessageLimit: number | null;
    saveHistory: boolean;
  };

  // State for configuration
  const [config, setConfig] = useState<ConfigState>({
    defaultProvider: 'openrouter',
    openrouterApiKey: '',
    anthropicApiKey: '',
    anthropicSuperEgoModel: 'claude-3-7-sonnet-20250219',
    anthropicBaseModel: 'claude-3-7-sonnet-20250219',
    openrouterSuperEgoModel: 'anthropic/claude-3.7-sonnet',
    openrouterBaseModel: 'anthropic/claude-3.7-sonnet',
    superEgoConstitutionFile: 'default',
    superEgoThinkingBudget: 4000, // Default to 4K tokens
    contextMessageLimit: null, // Default to unlimited messages
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
          <h3>Constitution Settings</h3>
          <div className="form-group">
            <label htmlFor="superEgoConstitutionFile">Default Superego Constitution:</label>
            <select 
              id="superEgoConstitutionFile" 
              name="superEgoConstitutionFile" 
              value={config.superEgoConstitutionFile}
              onChange={handleChange}
            >
              {/* Built-in constitutions */}
              {(() => {
                // Fetch built-in constitutions from constitutions.json
                const [builtInConstitutions, setBuiltInConstitutions] = useState<Prompt[]>([]);
                
                useEffect(() => {
                  const fetchConstitutions = async () => {
                    try {
                      const response = await fetch(`${import.meta.env.BASE_URL}constitutions.json`);
                      if (response.ok) {
                        const data = await response.json();
                        const constitutions = data.constitutions.map((p: any) => ({
                          id: p.id,
                          name: p.name,
                          content: p.content,
                          isBuiltIn: true,
                          lastUpdated: new Date().toISOString()
                        }));
                        setBuiltInConstitutions(constitutions);
                      } else {
                        console.error('Failed to load constitutions.json file');
                      }
                    } catch (error) {
                      console.error('Error loading constitutions.json file:', error);
                    }
                  };
                  
                  fetchConstitutions();
                }, []);
                
                return builtInConstitutions.map(constitution => (
                  <option key={constitution.id} value={constitution.id}>
                    {constitution.name} (Built-in)
                  </option>
                ));
              })()}
              
              {/* Custom constitutions */}
              {(() => {
                const savedConstitutions = localStorage.getItem('superego-constitutions');
                if (!savedConstitutions) return null;
                
                try {
                  const customConstitutions = JSON.parse(savedConstitutions) as Prompt[];
                  return customConstitutions.map(prompt => (
                    <option key={prompt.id} value={prompt.id}>
                      {prompt.name} (Custom)
                    </option>
                  ));
                } catch (error) {
                  console.error('Error parsing saved constitutions:', error);
                  return null;
                }
              })()}
            </select>
          </div>
          <p className="help-text">
            <Link to="/prompts" className="link">Manage your constitutions in the Constitution Manager</Link>
          </p>
          <a 
            href="https://drive.google.com/drive/folders/1qzcuBsolDCIJNo-1eiYLOY-qtvV1vJ78" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="button secondary"
            style={{ marginTop: '10px', display: 'inline-block' }} 
          >
            More Constitutions...
          </a>
        </div>
        
        <div className="config-section">
          <h3>Other Settings</h3>
          <div className="form-group">
            <label htmlFor="superEgoThinkingBudget">Superego Thinking Budget (tokens):</label>
            <input 
              type="number" 
              id="superEgoThinkingBudget" 
              name="superEgoThinkingBudget" 
              value={config.superEgoThinkingBudget}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 1024) {
                  setConfig(prev => ({ ...prev, superEgoThinkingBudget: value }));
                  setIsDirty(true);
                }
              }}
              min="1024"
              step="1000"
            />
            <p className="help-text">Minimum: 1,024 tokens. Recommended: 4,000 - 16,000 tokens.</p>
          </div>
          
          <div className="form-group">
            <label htmlFor="contextMessageLimit">Context Message Limit:</label>
            <select
              id="contextMessageLimit"
              name="contextMessageLimit"
              value={config.contextMessageLimit === null ? "null" : config.contextMessageLimit}
              onChange={(e) => {
                const value = e.target.value === "null" ? null : parseInt(e.target.value);
                setConfig(prev => ({ ...prev, contextMessageLimit: value }));
                setIsDirty(true);
              }}
            >
              <option value="null">Unlimited</option>
              <option value="5">5 messages</option>
              <option value="10">10 messages</option>
              <option value="15">15 messages</option>
              <option value="20">20 messages</option>
              <option value="30">30 messages</option>
              <option value="50">50 messages</option>
            </select>
            <p className="help-text">Limit the number of messages sent to the model. Unlimited uses the entire conversation history.</p>
          </div>
          
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
          Constitution Manager
        </Link>
        <Link to="/" className="button secondary">
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export default Config;
