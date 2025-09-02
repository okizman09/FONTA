import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Download, Save, BookOpen, Share2, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { generateQuiz } from '../../lib/ai';
import { extractPdfText, extractImageText, extractDocxText, transcribeAudio, getFileIcon, formatFileSize } from '../../lib/fileProcessing';
import { useUsageLimits } from '../../hooks/useUsageLimits';
import { UpgradePrompt } from '../UpgradePrompt';
import { v4 as uuidv4 } from 'uuid';

interface QuizQuestion {
  type: 'mcq' | 'short_answer';
  question: string;
  options?: string[];
  answer: string;
  difficulty: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: 'text' | 'file' | 'voice';
  timestamp: Date;
}

interface QuizTabProps {
  user: any;
  profile: any;
  onUsageUpdate: () => void;
  onUpgrade: () => void;
}

export function QuizTab({ user, profile, onUsageUpdate, onUpgrade }: QuizTabProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { canUse, incrementUsage, timeUntilReset, remainingUses } = useUsageLimits(user?.id || '');

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, quiz]);

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    }]);
  };

  const handleGenerateQuiz = async (studyMaterial?: string) => {
    const content = studyMaterial || input;
    if (!content.trim() || !canUse) return;

    setLoading(true);
    addMessage({ role: 'user', content, type: 'text' });

    try {
      const questions = await generateQuiz(content, difficulty);
      
      if (questions && questions.length > 0) {
        setQuiz(questions);
        setUserAnswers({});
        setShowResults(false);
        
        addMessage({ 
          role: 'assistant', 
          content: `📝 Generated ${questions.length} ${difficulty} difficulty questions based on your material.`, 
          type: 'text' 
        });
        
        const success = await incrementUsage();
        if (success) {
          onUsageUpdate();
        }
      } else {
        addMessage({ 
          role: 'assistant', 
          content: '❌ Could not generate questions from this content. Please try with more detailed study material.', 
          type: 'text' 
        });
      }
      
      setInput('');
    } catch (error) {
      console.error('Quiz generation error:', error);
      addMessage({ 
        role: 'assistant', 
        content: '❌ Failed to generate quiz. Please try again with different content.', 
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
    addMessage({ role: 'system', content: '🔄 Processing file for quiz generation...', type: 'text' });

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
      }

      if (extractedText.trim()) {
        addMessage({ 
          role: 'system', 
          content: `✅ Extracted content from ${file.name}. Generating quiz...`, 
          type: 'text' 
        });
        await handleGenerateQuiz(extractedText);
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

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const calculateScore = () => {
    let correct = 0;
    quiz.forEach((question, index) => {
      if (userAnswers[index] === question.answer) {
        correct++;
      }
    });
    return Math.round((correct / quiz.length) * 100);
  };

  const submitQuiz = () => {
    setShowResults(true);
    const score = calculateScore();
    addMessage({ 
      role: 'system', 
      content: `🎯 Quiz completed! Your score: ${score}% (${Object.keys(userAnswers).length}/${quiz.length} questions answered)`, 
      type: 'text' 
    });
  };

  const saveQuiz = async () => {
    if (!quiz.length || !user) return;

    setSaving(true);
    try {
      const quizTitle = title || `Quiz - ${difficulty} - ${new Date().toLocaleDateString()}`;
      const score = showResults ? calculateScore() : null;
      
      await supabase.from('quizzes').insert({
        user_id: user.id,
        title: quizTitle,
        content: messages.filter(m => m.role === 'user').map(m => m.content).join('\n\n'),
        questions: quiz,
        difficulty: difficulty,
        score: score,
        completed: showResults
      });

      addMessage({ 
        role: 'system', 
        content: `💾 Quiz saved as "${quizTitle}"`, 
        type: 'text' 
      });
      setTitle('');
    } catch (error) {
      console.error('Save error:', error);
      addMessage({ 
        role: 'system', 
        content: '❌ Failed to save quiz. Please try again.', 
        type: 'text' 
      });
    } finally {
      setSaving(false);
    }
  };

  const shareQuiz = async () => {
    if (!quiz.length) return;

    const shareId = uuidv4();
    const shareData = {
      id: shareId,
      title: title || `Shared Quiz - ${difficulty}`,
      questions: quiz,
      difficulty: difficulty,
      created_by: user.id,
      created_at: new Date().toISOString()
    };

    try {
      await supabase.from('shared_quizzes').insert(shareData);
      
      const shareUrl = `${window.location.origin}/shared-quiz/${shareId}`;
      navigator.clipboard.writeText(shareUrl);
      
      addMessage({ 
        role: 'system', 
        content: `🔗 Quiz share link copied to clipboard! Your classmates can access it at: ${shareUrl}`, 
        type: 'text' 
      });
    } catch (error) {
      console.error('Share error:', error);
      addMessage({ 
        role: 'system', 
        content: '❌ Failed to share quiz. Please try again.', 
        type: 'text' 
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold text-gray-900">AI Quiz Generator</h2>
          </div>
          <div className="text-sm text-gray-600">
            {profile?.subscription_type === 'premium' ? (
              <span className="text-green-600 font-medium">✨ Premium - Unlimited</span>
            ) : (
              <span>{remainingUses} uses remaining today</span>
            )}
          </div>
        </div>

        {/* Difficulty Selector */}
        <div className="flex space-x-2">
          {(['easy', 'medium', 'hard'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setDifficulty(level)}
              disabled={!canUse}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                difficulty === level
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } disabled:opacity-50`}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Upgrade Prompt */}
      {!canUse && profile?.subscription_type !== 'premium' && (
        <UpgradePrompt timeUntilReset={timeUntilReset} onUpgrade={onUpgrade} />
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && quiz.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Generate Your Quiz</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Upload study materials or paste text to generate custom quizzes. 
              Perfect for JAMB, WAEC, and university exam preparation.
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
                  ? 'bg-green-600 text-white'
                  : msg.role === 'assistant'
                  ? 'bg-white border border-gray-200 text-gray-900'
                  : 'bg-blue-50 border border-blue-200 text-blue-800'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              <div className="text-xs opacity-70 mt-2">
                {msg.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {/* Quiz Display */}
        {quiz.length > 0 && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h3 className="font-bold text-green-800 mb-2">
                📝 Your {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Quiz ({quiz.length} questions)
              </h3>
              <p className="text-sm text-green-700">
                Answer all questions and click "Submit Quiz" to see your results.
              </p>
            </div>

            {quiz.map((question, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">Q{index + 1}.</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                    question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {question.difficulty}
                  </span>
                </div>
                
                <p className="text-gray-800 mb-4">{question.question}</p>

                {question.type === 'mcq' && question.options ? (
                  <div className="space-y-2">
                    {question.options.map((option, optIndex) => (
                      <label
                        key={optIndex}
                        className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          userAnswers[index] === option
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        } ${
                          showResults && option === question.answer
                            ? 'border-green-500 bg-green-100'
                            : showResults && userAnswers[index] === option && option !== question.answer
                            ? 'border-red-500 bg-red-50'
                            : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${index}`}
                          value={option}
                          checked={userAnswers[index] === option}
                          onChange={(e) => handleAnswerChange(index, e.target.value)}
                          disabled={showResults}
                          className="text-green-600"
                        />
                        <span className={showResults && option === question.answer ? 'font-semibold' : ''}>
                          {option}
                          {showResults && option === question.answer && ' ✓'}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div>
                    <textarea
                      value={userAnswers[index] || ''}
                      onChange={(e) => handleAnswerChange(index, e.target.value)}
                      placeholder="Type your answer here..."
                      disabled={showResults}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                      rows={3}
                    />
                    {showResults && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm font-medium text-green-800">Model Answer:</p>
                        <p className="text-sm text-green-700 mt-1">{question.answer}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Quiz Actions */}
            <div className="flex flex-wrap gap-3">
              {!showResults && (
                <button
                  onClick={submitQuiz}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-all flex items-center space-x-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Submit Quiz</span>
                </button>
              )}
              
              {showResults && (
                <button
                  onClick={() => {
                    setShowResults(false);
                    setUserAnswers({});
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-all flex items-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retake Quiz</span>
                </button>
              )}

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Quiz title (optional)"
                className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              
              <button
                onClick={saveQuiz}
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>
              
              <button
                onClick={shareQuiz}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <span className="text-sm text-gray-600 ml-2">Generating quiz...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-white">
        <div className="flex items-end space-x-2">
          <input
            type="file"
            accept=".pdf,.txt,.docx,image/*,audio/*"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            disabled={!canUse}
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!canUse}
            className="p-3 rounded-full hover:bg-gray-100 disabled:opacity-50 transition-colors"
            title="Upload file"
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
              placeholder={canUse ? "Enter study material or topic for quiz generation..." : "Upgrade to continue using EduMate"}
              placeholder={canUse ? "Enter study material or topic for quiz generation..." : "Upgrade to continue using FONTA"}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 resize-none"
              rows={3}
              disabled={!canUse}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && canUse) {
                  e.preventDefault();
                  handleGenerateQuiz();
                }
              }}
            />
          </div>
          
          <button
            onClick={() => handleGenerateQuiz()}
            disabled={loading || !input.trim() || !canUse}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white p-3 rounded-xl transition-all"
            title="Generate quiz"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}