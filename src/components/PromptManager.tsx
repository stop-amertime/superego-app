import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './PromptManager.css';
import { Prompt } from '../types/Prompt';

interface PromptManagerProps {
  onSelectPrompt: (promptId: string) => void;
  selectedPromptId: string;
}

function PromptManager({ onSelectPrompt, selectedPromptId }: PromptManagerProps) {
  const [constitutions, setConstitutions] = useState<Prompt[]>([]);
  const [editingConstitution, setEditingConstitution] = useState<Prompt | null>(null);
  const [newConstitutionName, setNewConstitutionName] = useState('');
  const [newConstitutionContent, setNewConstitutionContent] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Load constitutions from prompts.json and localStorage on component mount
  useEffect(() => {
    const loadConstitutions = async () => {
      // Load built-in constitutions from prompts.json
      const builtInConstitutions: Prompt[] = [];
      
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}prompts.json`);
        if (response.ok) {
          const data = await response.json();
          // Convert the constitutions from the JSON file to Prompt objects
          data.prompts.forEach((p: any) => {
            builtInConstitutions.push({
              id: p.id,
              name: p.name,
              content: p.content,
              isBuiltIn: true,
              lastUpdated: new Date().toISOString()
            });
          });
        } else {
          console.error('Failed to load prompts.json file');
        }
      } catch (error) {
        console.error('Error loading prompts.json file:', error);
      }
      
      // Load custom constitutions from localStorage
      let customConstitutions: Prompt[] = [];
      const savedConstitutions = localStorage.getItem('superego-constitutions');
      
      if (savedConstitutions) {
        try {
          customConstitutions = JSON.parse(savedConstitutions);
        } catch (error) {
          console.error('Error parsing saved constitutions:', error);
        }
      }
      
      // Combine built-in constitutions with custom constitutions
      setConstitutions([...builtInConstitutions, ...customConstitutions]);
    };
    
    loadConstitutions();
  }, []);

  // Save custom constitutions to localStorage when they change
  useEffect(() => {
    const customConstitutions = constitutions.filter(p => !p.isBuiltIn);
    if (customConstitutions.length > 0) {
      localStorage.setItem('superego-constitutions', JSON.stringify(customConstitutions));
    }
  }, [constitutions]);

  // Handle constitution selection
  const handleSelectPrompt = (promptId: string) => {
    onSelectPrompt(promptId);
  };

  // Start editing a constitution
  const handleEditPrompt = (prompt: Prompt) => {
    if (prompt.isBuiltIn) {
      // Create a copy of the built-in constitution
      const newConstitution: Prompt = {
        ...prompt,
        id: `custom-${Date.now()}`,
        name: `${prompt.name} (Custom)`,
        isBuiltIn: false,
        lastUpdated: new Date().toISOString()
      };
      
      setEditingConstitution(newConstitution);
      setNewConstitutionName(newConstitution.name);
      setNewConstitutionContent(newConstitution.content);
    } else {
      setEditingConstitution(prompt);
      setNewConstitutionName(prompt.name);
      setNewConstitutionContent(prompt.content);
    }
  };

  // Save edited constitution
  const handleSavePrompt = () => {
    if (!editingConstitution) return;
    
    const updatedConstitution: Prompt = {
      ...editingConstitution,
      name: newConstitutionName.trim() || editingConstitution.name,
      content: newConstitutionContent.trim() || editingConstitution.content,
      lastUpdated: new Date().toISOString()
    };
    
    // Check if this is a new constitution or an update to an existing one
    const constitutionExists = constitutions.some(p => p.id === updatedConstitution.id);
    
    if (constitutionExists) {
      setConstitutions(prev => prev.map(p => p.id === updatedConstitution.id ? updatedConstitution : p));
    } else {
      setConstitutions(prev => [...prev, updatedConstitution]);
    }
    
    // Select the updated constitution
    onSelectPrompt(updatedConstitution.id);
    
    // Reset editing state
    setEditingConstitution(null);
    setNewConstitutionName('');
    setNewConstitutionContent('');
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingConstitution(null);
    setNewConstitutionName('');
    setNewConstitutionContent('');
    setIsCreatingNew(false);
  };

  // Delete a constitution
  const handleDeletePrompt = (promptId: string) => {
    // Cannot delete built-in constitutions
    const constitutionToDelete = constitutions.find(p => p.id === promptId);
    if (!constitutionToDelete || constitutionToDelete.isBuiltIn) return;
    
    if (window.confirm(`Are you sure you want to delete the constitution "${constitutionToDelete.name}"?`)) {
      setConstitutions(prev => prev.filter(p => p.id !== promptId));
      
      // If the deleted constitution was selected, select the default constitution
      if (selectedPromptId === promptId) {
        onSelectPrompt('default');
      }
    }
  };

  // Start creating a new constitution
  const handleCreateNewPrompt = () => {
    const newConstitution: Prompt = {
      id: `custom-${Date.now()}`,
      name: 'New Constitution',
      content: '',
      isBuiltIn: false,
      lastUpdated: new Date().toISOString()
    };
    
    setEditingConstitution(newConstitution);
    setNewConstitutionName(newConstitution.name);
    setNewConstitutionContent(newConstitution.content);
    setIsCreatingNew(true);
  };

  return (
    <div className="prompt-manager-page">
      <h2>Constitution Manager</h2>
      
      <div className="prompt-manager">
        {!editingConstitution ? (
          <>
            <div className="prompt-list-header">
              <h3>Superego Constitutions</h3>
              <button 
                className="button primary"
                onClick={handleCreateNewPrompt}
              >
                Create New
              </button>
            </div>
            
            <div className="prompt-list">
              <h4>Built-in Constitutions</h4>
              {constitutions.filter(p => p.isBuiltIn).map(prompt => (
                <div 
                  key={prompt.id}
                  className={`prompt-item ${selectedPromptId === prompt.id ? 'active' : ''}`}
                >
                  <div 
                    className="prompt-item-content"
                    onClick={() => handleSelectPrompt(prompt.id)}
                  >
                    <div className="prompt-name">{prompt.name}</div>
                    <div className="prompt-preview">
                      {prompt.content.substring(0, 60)}...
                    </div>
                  </div>
                  <div className="prompt-actions">
                    <button 
                      className="edit-button"
                      onClick={() => handleEditPrompt(prompt)}
                      title="Create a custom copy of this constitution"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              ))}
              
              {constitutions.filter(p => !p.isBuiltIn).length > 0 && (
                <>
                  <h4>Custom Constitutions</h4>
                  {constitutions.filter(p => !p.isBuiltIn).map(prompt => (
                    <div 
                      key={prompt.id}
                      className={`prompt-item ${selectedPromptId === prompt.id ? 'active' : ''}`}
                    >
                      <div 
                        className="prompt-item-content"
                        onClick={() => handleSelectPrompt(prompt.id)}
                      >
                        <div className="prompt-name">{prompt.name}</div>
                        <div className="prompt-preview">
                          {prompt.content.substring(0, 60)}...
                        </div>
                      </div>
                      <div className="prompt-actions">
                        <button 
                          className="edit-button"
                          onClick={() => handleEditPrompt(prompt)}
                          title="Edit this constitution"
                        >
                          Edit
                        </button>
                        <button 
                          className="delete-button"
                          onClick={() => handleDeletePrompt(prompt.id)}
                          title="Delete this constitution"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="prompt-editor">
            <h3>{isCreatingNew ? 'Create New Constitution' : 'Edit Constitution'}</h3>
            
            <div className="form-group">
              <label htmlFor="promptName">Constitution Name:</label>
              <input 
                type="text"
                id="promptName"
                value={newConstitutionName}
                onChange={(e) => setNewConstitutionName(e.target.value)}
                placeholder="Enter a name for this constitution"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="promptContent">Constitution Content:</label>
              <textarea 
                id="promptContent"
                value={newConstitutionContent}
                onChange={(e) => setNewConstitutionContent(e.target.value)}
                placeholder="Enter the constitution content"
                rows={15}
              />
            </div>
            
            <div className="editor-actions">
              <button 
                className="button primary"
                onClick={handleSavePrompt}
                disabled={!newConstitutionName.trim() || !newConstitutionContent.trim()}
              >
                Save
              </button>
              <button 
                className="button secondary"
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="action-buttons">
        <Link to="/config" className="button secondary">
          Back to Settings
        </Link>
        <Link to="/chat" className="button primary">
          Go to Chat
        </Link>
      </div>
    </div>
  );
}

export default PromptManager;
