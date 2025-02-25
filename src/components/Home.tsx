import { Link } from 'react-router-dom';
import './Home.css';

function Home() {
  return (
    <div className="home">
      <div className="welcome-card">
        <h2>Welcome to Superego</h2>
        <p>
          Superego is a tool that screens user inputs before sending them to a language model.
          It uses a "superego" model to evaluate the input and decide whether it should be sent to the main model.
        </p>
        
        <div className="action-buttons">
          <Link to="/chat" className="button primary">
            Start Chat
          </Link>
          <Link to="/config" className="button secondary">
            Configure Settings
          </Link>
        </div>
      </div>
      
      <div className="info-section">
        <h3>How it works</h3>
        <ol>
          <li>Enter your message in the chat interface</li>
          <li>The superego model will evaluate your message</li>
          <li>You can decide whether to send the message to the main model</li>
          <li>If you choose to send it, the main model will respond</li>
        </ol>
      </div>
    </div>
  );
}

export default Home;
