import { useState } from 'react';
import OpenAI from 'openai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';


function ChatBot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('deepseek/deepseek-chat');
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
      let thinkingContent = '';
      let isThinking = false;
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      for await (const chunk of stream) {
        if (chunk.choices[0]?.delta?.content) {
          const content = chunk.choices[0].delta.content;
          
          if (selectedModel === 'deepseek') {
            if (content.includes('<think>')) {
              isThinking = true;
              streamedContent += '<div class="thinking-box">';
              continue;
            }
            if (content.includes('</think>')) {
              isThinking = false;
              streamedContent += '</div>';
              continue;
            }
            
            if (isThinking) {
              streamedContent += content;
            } else {
              streamedContent += content;
            }
          } else {
            streamedContent += content;
          }
          
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
                        {/* <div className="thinking-header">推理过程</div> */}
                        {children}
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
            <button 
              className={`copy-message ${copySuccess === msg.content ? 'success' : ''}`}
              onClick={() => handleCopy(msg.content)}
            >
              {copySuccess === msg.content ? '✓' : '复制'}
            </button>
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
