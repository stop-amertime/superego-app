# Superego React

A React web application for interacting with LLMs through a superego screener. This is a port of the Python-based Superego CLI to a React web application.

## Overview

Superego React is a web application that screens user inputs before sending them to a language model. It uses a "superego" model to evaluate the input and decide whether it should be sent to the main model.

## Features

- **Superego Screening**: Evaluates user inputs before sending them to the main model
- **Multiple Provider Support**: Works with both Anthropic and OpenRouter APIs
- **Configurable Models**: Set different models for superego and base LLM
- **Customizable Prompts**: Choose between default, strict, and permissive screening modes
- **Conversation History**: Save and load conversation history
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Mode Support**: Automatically switches between light and dark mode based on system preferences
- **Environment Variable Support**: Can load API keys from environment variables

## Installation

1. Clone the repository
2. Install dependencies:

```bash
cd superego-react
npm install
```

## Configuration

The application uses API keys for Anthropic and OpenRouter. You can set these in several ways:

1. **Environment Variables**: Add your API keys to a `.env` file in the project root:
   ```
   VITE_ANTHROPIC_API_KEY=your_anthropic_api_key
   VITE_OPENROUTER_API_KEY=your_openrouter_api_key
   ```

2. **Configuration Panel**: Set your API keys in the application's configuration panel:
   1. Start the application
   2. Click on "Configure Settings"
   3. Enter your API keys and select your preferred models

## Running the Application

To run the application in development mode:

```bash
npm run dev
```

This will start the development server at [http://localhost:3000](http://localhost:3000).

To build the application for production:

```bash
npm run build
```

## Usage

1. Start the application
2. Enter your message in the chat interface
3. The superego model will evaluate your message
4. Choose whether to send the message to the main model or try again
5. If you choose to send the message, the main model will respond

## Provider-Specific Model Configuration

The application supports both Anthropic and OpenRouter APIs. Since these providers use different model names for the same models, the application allows you to configure provider-specific model names.

For each provider, you can configure:
- Superego model: The model used for evaluating user inputs
- Base model: The model used for generating responses

For example:
- Anthropic superego model: `claude-3-7-sonnet-20250219`
- Anthropic base model: `claude-3-7-sonnet-20250219`
- OpenRouter superego model: `anthropic/claude-3.7-sonnet`
- OpenRouter base model: `anthropic/claude-3.7-sonnet`

## Differences from the Python CLI

This React application is a port of the Python-based Superego CLI. The main differences are:

1. **Web-based Interface**: Instead of a terminal interface, this application uses a web-based UI
2. **Client-side Processing**: All processing happens in the browser, not on a server
3. **API Key Storage**: API keys are stored in localStorage or loaded from environment variables
4. **Direct API Calls**: The application makes direct API calls to Anthropic and OpenRouter, without a server intermediary

## Security Considerations

This application uses the Anthropic SDK with the `dangerouslyAllowBrowser: true` option to allow API calls from the browser. This is not recommended for production use as it exposes your API keys to potential attackers. In a production environment, you should:

1. Use a server-side API proxy to make API calls
2. Never expose API keys in client-side code
3. Implement proper authentication and authorization

## Troubleshooting

If you encounter any issues, check the following:

1. Make sure your API keys are set correctly in the configuration panel or environment variables
2. Check that the model names in the configuration are correct for the API you're using
3. If you're using the Anthropic API, make sure you have access to the models you're trying to use
4. If you're using the OpenRouter API, make sure the model names are in the correct format (e.g., `anthropic/claude-3.7-sonnet`)
5. Check the browser console for any error messages
6. If you see CORS errors, you may need to use a CORS proxy or set up a server-side API proxy
