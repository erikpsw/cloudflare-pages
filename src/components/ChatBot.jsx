import { useState } from 'react';
import OpenAI from 'openai';
import ReactMarkdown from 'react-markdown';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
  baseURL: 'https://gemini.erikpsw.works',
  dangerouslyAllowBrowser: true  // Add this line
});

function ChatBot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const stream = await openai.chat.completions.create({
        messages: [...messages, userMessage],
        stream: true,
      });

      let streamedContent = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      for await (const chunk of stream) {
        if (chunk.choices[0]?.delta?.content) {
          streamedContent += chunk.choices[0].delta.content;
          setMessages(prev => [
            ...prev.slice(0, -1),
            { role: 'assistant', content: streamedContent }
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
      <div className="messages-container">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            <ReactMarkdown>{msg.content}</ReactMarkdown>
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
