import { useState } from 'react';
import OpenAI from 'openai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import '../styles/ChatBot.css'

function ChatBot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('deepseek/deepseek-r1');
  const [copySuccess, setCopySuccess] = useState(null);

  const handleClear = () => {
    setMessages([]);
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(text);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      var openai = new OpenAI({
        apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
        baseURL: selectedModel === 'gemini' ? 'https://gemini.erikpsw.works' : 'https://deepseek.erikpsw.works',
        
        dangerouslyAllowBrowser: true
      });
      
      const stream = await openai.chat.completions.create({
        messages: [...messages, userMessage],
        model: selectedModel,  
        stream: true,
      });

      let streamedContent = '';
      let isThinking = false;
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      for await (const chunk of stream) {
        if (chunk.choices[0]?.delta?.content) {
          const content = chunk.choices[0].delta.content;
          console.log('Received chunk:', content);
          
          if (selectedModel === 'deepseek/deepseek-r1') {
            const trimmedContent = content.trim();
            if (trimmedContent === '<think>') {
              isThinking = true;
              streamedContent += '<div class="thinking-box">';
              continue;
            }
            if (trimmedContent === '</think>') {
              isThinking = false;
              streamedContent += '</div>';
              continue;
            }
          }
          streamedContent += content;
          
          setMessages(prev => [
            ...prev.slice(0, -1),
            { 
              role: 'assistant', 
              content: streamedContent
            }
          ]);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，出现了一些错误。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="model-selector">
        <select 
          value={selectedModel} 
          onChange={(e) => setSelectedModel(e.target.value)}
          disabled={isLoading}
        >
          <option value="deepseek/deepseek-chat">DeepSeek Chat</option>
          <option value="deepseek/deepseek-r1">DeepSeek R1</option>
          <option value="qwen/qwen-max">Qwen Max</option>
          <option value="gemini">Gemini</option>
        </select>
        <button 
          onClick={handleClear} 
          disabled={isLoading || messages.length === 0}
          className="clear-button"
        >
          清除对话
        </button>
      </div>
      <div className="messages-container">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                div: ({node, className, children, ...props}) => {
                  if (className === 'thinking-box') {
                    return (
                      <div className="thinking-box">
                        <div className="thinking-content">
                          <div className="thinking-header">思考过程</div>
                          {children}
                        </div>
                      </div>
                    );
                  }
                  return <div className={className} {...props}>{children}</div>;
                },
                table: ({node, ...props}) => (
                  <table className="markdown-table" {...props} />
                ),
                code: ({node, inline, className, children, ...props}) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const code = String(children).replace(/\n$/, '');
                  
                  if (!inline && match) {
                    return (
                      <div className="code-block-wrapper">
                        <button 
                          className={`copy-button ${copySuccess === code ? 'success' : ''}`}
                          onClick={() => handleCopy(code)}
                        >
                          {copySuccess === code ? '✓' : '复制'}
                        </button>
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {code}
                        </SyntaxHighlighter>
                      </div>
                    );
                  }
                  return <code className={className} {...props}>{children}</code>;
                }
              }}
            >
              {msg.content}
            </ReactMarkdown>
            <div className="copy-message-container">
              <button 
                className={`copy-message ${copySuccess === msg.content ? 'success' : ''}`}
                onClick={() => handleCopy(msg.content)}
              >
                {copySuccess === msg.content ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        ))}
        {isLoading && <div className="message assistant">思考中...</div>}
      </div>
      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入消息..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>发送</button>
      </form>
    </div>
  );
}

export default ChatBot;
