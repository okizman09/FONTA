import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Download, Save, FileText, Image, File } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { summarizeText } from '../../lib/ai';
import { extractPdfText, extractImageText, extractDocxText, transcribeAudio, getFileIcon, formatFileSize } from '../../lib/fileProcessing';
import { useUsageLimits } from '../../hooks/useUsageLimits';
import { UpgradePrompt } from '../UpgradePrompt';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: 'text' | 'file' | 'voice';
  fileName?: string;
  fileSize?: number;
  timestamp: Date;
}

interface SummarizerTabProps {
  user: any;
  profile: any;
  onUsageUpdate: () => void;
  onUpgrade: () => void;
}

export function SummarizerTab({ user, profile, onUsageUpdate, onUpgrade }: SummarizerTabProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { canUse, incrementUsage, timeUntilReset, remainingUses } = useUsageLimits(user?.id || '');

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    }]);
  };

  const handleSummarize = async (textToSummarize?: string) => {
    const content = textToSummarize || input;
    if (!content.trim() || !canUse) return;

    setLoading(true);
    addMessage({ role: 'user', content, type: 'text' });

    try {
      const summary = await summarizeText(content);
      addMessage({ role: 'assistant', content: summary, type: 'text' });
      
      const success = await incrementUsage();
      if (success) {
        onUsageUpdate();
      }
      
      setInput('');
    } catch (error) {
      console.error('Summarization error:', error);
      addMessage({ 
        role: 'assistant', 
        content: '❌ Failed to generate summary. Please try again with shorter text or check your connection.', 
        type: 'text' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUse) return;

    const file = event.target.files?.[0];
    if (!file) return;

    const fileIcon = getFileIcon(file.type);
    const fileSize = formatFileSize(file.size);
    
    addMessage({ 
      role: 'user', 
      content: `${fileIcon} Uploaded: ${file.name} (${fileSize})`, 
      type: 'file',
      fileName: file.name,
      fileSize: file.size
    });

    setLoading(true);
    addMessage({ role: 'system', content: '🔄 Processing file...', type: 'text' });

    try {
      let extractedText = '';
      
      if (file.type === 'application/pdf') {
        extractedText = await extractPdfText(file);
      } else if (file.type.startsWith('image/')) {
        extractedText = await extractImageText(file);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        extractedText = await extractDocxText(file);
      } else if (file.type.startsWith('audio/')) {
        extractedText = await transcribeAudio(file);
      } else if (file.type === 'text/plain') {
        extractedText = await file.text();
      } else {
        throw new Error('Unsupported file type');
      }

      if (extractedText.trim()) {
        addMessage({ 
          role: 'system', 
          content: `✅ Successfully extracted ${extractedText.length} characters from ${file.name}`, 
          type: 'text' 
        });
        
        // Auto-summarize the extracted text
        await handleSummarize(extractedText);
      } else {
        addMessage({ 
          role: 'system', 
          content: '⚠️ No text could be extracted from this file. Please try a different file or check the file quality.', 
          type: 'text' 
        });
      }
    } catch (error) {
      console.error('File processing error:', error);
      addMessage({ 
        role: 'system', 
        content: `❌ Failed to process ${file.name}. ${error instanceof Error ? error.message : 'Please try again.'}`, 
        type: 'text' 
      });
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      addMessage({ 
        role: 'system', 
        content: '🎤 Voice input is not supported in your browser. Please use Chrome or Edge for voice features.', 
        type: 'text' 
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    addMessage({ role: 'system', content: '🎤 Listening... Speak now!', type: 'voice' });

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev ? `${prev} ${transcript}` : transcript);
      addMessage({ role: 'user', content: `🎤 "${transcript}"`, type: 'voice' });
    };

    recognition.onerror = (event: any) => {
      addMessage({ 
        role: 'system', 
        content: `❌ Voice input error: ${event.error}. Please try again.`, 
        type: 'text' 
      });
    };

    recognition.start();
  };

  const saveSummary = async () => {
    const lastSummary = [...messages].reverse().find(m => m.role === 'assistant');
    if (!lastSummary || !user) return;

    setSaving(true);
    try {
      const summaryTitle = title || `Summary - ${new Date().toLocaleDateString()}`;
      
      await supabase.from('summaries').insert({
        user_id: user.id,
        title: summaryTitle,
        original_content: messages.filter(m => m.role === 'user').map(m => m.content).join('\n\n'),
        summary_content: lastSummary.content,
      });

      addMessage({ 
        role: 'system', 
        content: `💾 Summary saved as "${summaryTitle}"`, 
        type: 'text' 
      });
      setTitle('');
    } catch (error) {
      console.error('Save error:', error);
      addMessage({ 
        role: 'system', 
        content: '❌ Failed to save summary. Please try again.', 
        type: 'text' 
      });
    } finally {
      setSaving(false);
    }
  };

  const exportSummary = () => {
    const lastSummary = [...messages].reverse().find(m => m.role === 'assistant');
    if (!lastSummary) return;

    const exportContent = `# EduMate Summary Export\n\nGenerated on: ${new Date().toLocaleString()}\n\n${lastSummary.content}`;
    
    const blob = new Blob([exportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edumate-summary-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with usage info */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">AI Note Summarizer</h2>
          </div>
          <div className="text-sm text-gray-600">
            {profile?.subscription_type === 'premium' ? (
              <span className="text-green-600 font-medium">✨ Premium - Unlimited</span>
            ) : (
              <span>{remainingUses} uses remaining today</span>
            )}
          </div>
        </div>
      </div>

      {/* Upgrade Prompt */}
      {!canUse && profile?.subscription_type !== 'premium' && (
        <UpgradePrompt timeUntilReset={timeUntilReset} onUpgrade={onUpgrade} />
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start Summarizing</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Upload PDFs, images, or Word documents, or paste your text to get AI-powered summaries 
              perfect for studying and exam preparation.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : msg.role === 'assistant'
                  ? 'bg-white border border-gray-200 text-gray-900'
                  : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              )}
              <div className="text-xs opacity-70 mt-2">
                {msg.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <span className="text-sm text-gray-600 ml-2">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Action Buttons */}
      {messages.some(m => m.role === 'assistant') && (
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center space-x-2 mb-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summary title (optional)"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={saveSummary}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-1 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </button>
            <button
              onClick={exportSummary}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-1"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t bg-white">
        <div className="flex items-end space-x-2">
          {/* Hidden File Input */}
          <input
            type="file"
            accept=".pdf,.txt,.docx,image/*,audio/*"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            disabled={!canUse}
          />
          
          {/* File Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!canUse}
            className="p-3 rounded-full hover:bg-gray-100 disabled:opacity-50 transition-colors"
            title="Upload file"
          >
            <Paperclip className="w-5 h-5 text-gray-600" />
          </button>
          
          {/* Voice Input Button */}
          <button 
            onClick={handleVoiceInput}
            disabled={!canUse}
            className="p-3 rounded-full hover:bg-gray-100 disabled:opacity-50 transition-colors"
            title="Voice input"
          >
            <Mic className="w-5 h-5 text-gray-600" />
          </button>
          
          {/* Text Input */}
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={canUse ? "Paste your notes here or upload a file..." : "Upgrade to continue using EduMate"}
              placeholder={canUse ? "Paste your notes here or upload a file..." : "Upgrade to continue using FONTA"}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none"
              rows={3}
              disabled={!canUse}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && canUse) {
                  e.preventDefault();
                  handleSummarize();
                }
              }}
            />
          </div>
          
          {/* Send Button */}
          <button
            onClick={() => handleSummarize()}
            disabled={loading || !input.trim() || !canUse}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-3 rounded-xl transition-all"
            title="Generate summary"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}