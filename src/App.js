import React, { useState, useRef, useEffect } from 'react';
import { 
  Container,
  Paper,
  TextField,
  IconButton,
  Box,
  Typography,
  ThemeProvider,
  createTheme
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CircularProgress from '@mui/material/CircularProgress';
import ReactMarkdown from 'react-markdown';
import './App.css';

const theme = createTheme({
  // ... (previous theme configuration remains the same)
});

const App = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (role, content, finalized = false) => {
    setMessages((prev) => [...prev, { role, content, finalized }]);
  };

  const updateLastMessage = (role, content, finalized = false) => {
    setMessages((prev) => {
      const newMessages = [...prev];
      for (let i = newMessages.length - 1; i >= 0; i--) {
        if (newMessages[i].role === role && !newMessages[i].finalized) {
          newMessages[i] = { ...newMessages[i], content, finalized };
          break;
        }
      }
      return newMessages;
    });
  };

  const simulateStreamingOutput = (role, fullText) => {
    const words = fullText.split(' ');
    let index = 0;

    const interval = setInterval(() => {
      if (index < words.length) {
        const chunk = words.slice(0, index + 1).join(' ');
        updateLastMessage(role, chunk);
        index++;
      } else {
        clearInterval(interval);
        updateLastMessage(role, fullText, true);
      }
    }, 10);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    addMessage('user', input, true);
    setInput('');

    // Add placeholders for internal thoughts and assistant response
    addMessage('assistant-internal', '');
    addMessage('assistant', '');

    try {
      const response = await fetch('http://127.0.0.1:5000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch response');
      }

      const data = await response.json();
      const internalThought = data.response.internal_thought[0]?.trim() || 'Internal thought unavailable';
      const fullResponseText = data.response.Output[0]?.trim() || 'Response unavailable';

      simulateStreamingOutput('assistant-internal', internalThought);
      setTimeout(() => {
        simulateStreamingOutput('assistant', fullResponseText);
      }, 20); // Small delay to show internal thoughts first

    } catch (error) {
      console.error('Error:', error);
      updateLastMessage('assistant', 'Something went wrong.', true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <div className="chat-container">
        <Container maxWidth="md" sx={{ height: '100%' }}>
          <Paper elevation={0} className="messages-area">
            <div className="messages-container">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`message-bubble ${message.role}`}
                  style={{
                    color: message.role === 'assistant-internal' ? '#888' : 'inherit',
                  }}
                >
                  <div className="message-content">
                    <Typography>
                      <ReactMarkdown>{message.content || (message.role === 'assistant-internal' ? 'Thinking...' : '')}</ReactMarkdown>
                    </Typography>
                  </div>
                </div>
              ))}
              {isLoading && (
                <Typography sx={{ color: '#888', textAlign: 'center', marginTop: 2 }}>
                  The assistant is thinking...
                </Typography>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="input-area">
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '20px',
                    },
                  }}
                />
                <IconButton 
                  onClick={sendMessage}
                  disabled={isLoading}
                  sx={{ 
                    background: 'var(--primary-gradient)',
                    color: 'white',
                    '&:hover': {
                      background: 'var(--hover-color)',
                    },
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                  }}
                >
                  {isLoading ? (
                    <CircularProgress size={24} sx={{ color: 'white' }} className="loading-icon" />
                  ) : (
                    <SendIcon />
                  )}
                </IconButton>
              </Box>
            </div>
          </Paper>
        </Container>
      </div>
    </ThemeProvider>
  );
};

export default App;
