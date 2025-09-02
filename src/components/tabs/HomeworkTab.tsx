import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Save, HelpCircle, Calculator, PenTool, Atom } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getHomeworkHelp } from '../../lib/ai';
import { extractPdfText, extractImageText, extractDocxText, getFileIcon, formatFileSize } from '../../lib/fileProcessing';
import { useUsageLimits } from '../../hooks/useUsageLimits';
import { UpgradePrompt } from '../UpgradePrompt';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: 'text' | 'file' | 'voice';
  timestamp: Date;
}

interface HomeworkTabProps {
  user: any;
  profile: any;
  onUsageUpdate: () => void;
  onUpgrade: () => void;
}

export function HomeworkTab({ user, profile, onUsageUpdate, onUpgrade }: HomeworkTabProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subject, setSubject] = useState('general');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { canUse, incrementUsage, timeUntilReset, remainingUses } = useUsageLimits(user?.id || '');

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const subjects = [
    { id: 'mathematics', name: 'Mathematics', icon: Calculator, color: 'blue' },
    { id: 'science', name: 'Science', icon: Atom, color: 'green' },
    { id: 'essay', name: 'Essay Writing', icon: PenTool, color: 'purple' },
    { id: 'general', name: 'General', icon: HelpCircle, color: 'gray' },
  ];

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    }]);
  };

  const handleGetHelp = async (questionText?: string) => {
    const question = questionText || input;
    if (!question.trim() || !canUse) return;

    setLoading(true);
    addMessage({ role: 'user', content: question, type: 'text' });

    try {
      const explanation = await getHomeworkHelp(question, subject);
      addMessage({ role: 'assistant', content: explanation, type: 'text' });
      
      const success = await incrementUsage();
      if (success) {
        onUsageUpdate();
      }
      
      setInput('');
    } catch (error) {
      console.error('Homework help error:', error);
      addMessage({ 
        role: 'assistant', 
        content: '❌ Failed to generate explanation. Please try rephrasing your question or check your connection.', 
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
      type: 'file' 
    });

    setLoading(true);
    addMessage({ role: 'system', content: '🔄 Processing homework question...', type: 'text' });

    try {
      let extractedText = '';
      
      if (file.type === 'application/pdf') {
        extractedText = await extractPdfText(file);
      } else if (file.type.startsWith('image/')) {
        extractedText = await extractImageText(file);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        extractedText = await extractDocxText(file);
      } else if (file.type === 'text/plain') {
        extractedText = await file.text();
      }

      if (extractedText.trim()) {
        addMessage({ 
          role: 'system', 
          content: `✅ Extracted question from ${file.name}. Getting help...`, 
          type: 'text' 
        });
        await handleGetHelp(extractedText);
      } else {
        addMessage({ 
          role: 'system', 
          content: '⚠️ No text could be extracted from this file.', 
          type: 'text' 
        });
      }
    } catch (error) {
      console.error('File processing error:', error);
      addMessage({ 
        role: 'system', 
        content: `❌ Failed to process ${file.name}. Please try again.`, 
        type: 'text' 
      });
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const saveHomework = async () => {
    const lastExplanation = [...messages].reverse().find(m => m.role === 'assistant');
    const lastQuestion = [...messages].reverse().find(m => m.role === 'user');
    
    if (!lastExplanation || !lastQuestion || !user) return;

    setSaving(true);
    try {
      await supabase.from('homework_help').insert({
        user_id: user.id,
        question: lastQuestion.content,
        explanation: lastExplanation.content,
        subject: subject,
      });

      addMessage({ 
        role: 'system', 
        content: '💾 Homework help saved to your library!', 
        type: 'text' 
      });
    } catch (error) {
      console.error('Save error:', error);
      addMessage({ 
        role: 'system', 
        content: '❌ Failed to save homework help. Please try again.', 
        type: 'text' 
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-5 h-5 text-orange-600" />
            <h2 className="font-semibold text-gray-900">AI Homework Helper</h2>
          </div>
          <div className="text-sm text-gray-600">
            {profile?.subscription_type === 'premium' ? (
              <span className="text-green-600 font-medium">✨ Premium - Unlimited</span>
            ) : (
              <span>{remainingUses} uses remaining today</span>
            )}
          </div>
        </div>

        {/* Subject Selector */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {subjects.map((subj) => {
            const Icon = subj.icon;
            const isSelected = subject === subj.id;
            
            return (
              <button
                key={subj.id}
                onClick={() => setSubject(subj.id)}
                disabled={!canUse}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all whitespace-nowrap ${
                  isSelected 
                    ? `border-${subj.color}-500 bg-${subj.color}-50 text-${subj.color}-700` 
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                } disabled:opacity-50`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{subj.name}</span>
              </button>
            );
          })}
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
            <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Get Homework Help</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Ask questions about Math, Science, Essay Writing, or any subject. 
              Get step-by-step explanations tailored for Nigerian students.
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
                  ? 'bg-orange-600 text-white'
                  : msg.role === 'assistant'
                  ? 'bg-white border border-gray-200 text-gray-900'
                  : 'bg-blue-50 border border-blue-200 text-blue-800'
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
                <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <span className="text-sm text-gray-600 ml-2">Analyzing your question...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Save Button */}
      {messages.some(m => m.role === 'assistant') && (
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={saveHomework}
            disabled={saving}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving to Library...' : 'Save to Library'}</span>
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t bg-white">
        <div className="flex items-end space-x-2">
          <input
            type="file"
            accept=".pdf,.txt,.docx,image/*"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            disabled={!canUse}
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!canUse}
            className="p-3 rounded-full hover:bg-gray-100 disabled:opacity-50 transition-colors"
            title="Upload homework"
          >
            <Paperclip className="w-5 h-5 text-gray-600" />
          </button>
          
          <button 
            onClick={() => {/* Voice input implementation */}}
            disabled={!canUse}
            className="p-3 rounded-full hover:bg-gray-100 disabled:opacity-50 transition-colors"
            title="Voice input"
          >
            <Mic className="w-5 h-5 text-gray-600" />
          </button>
          
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={canUse ? "Ask your homework question here..." : "Upgrade to continue using EduMate"}
              placeholder={canUse ? "Ask your homework question here..." : "Upgrade to continue using FONTA"}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 resize-none"
              rows={3}
              disabled={!canUse}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && canUse) {
                  e.preventDefault();
                  handleGetHelp();
                }
              }}
            />
          </div>
          
          <button
            onClick={() => handleGetHelp()}
            disabled={loading || !input.trim() || !canUse}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white p-3 rounded-xl transition-all"
            title="Get help"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}