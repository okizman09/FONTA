import axios from 'axios';

const HF_API_KEY = import.meta.env.VITE_HF_API_KEY;
const HF_API_URL = 'https://api-inference.huggingface.co/models';

if (!HF_API_KEY) {
  console.warn('⚠️ HuggingFace API key is missing. Set VITE_HF_API_KEY in .env');
}

// Retry mechanism for HF API calls
async function callHFWithRetry(model: string, inputs: any, params: any = {}, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.post(
        `${HF_API_URL}/${model}`,
        { inputs, parameters: params },
        {
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 60 second timeout
        }
      );

      // Handle model loading
      if (response.data.error && response.data.error.includes('loading')) {
        if (attempt < maxRetries) {
          console.log(`Model loading, retrying in ${attempt * 2} seconds...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
          continue;
        }
      }

      return response.data;
    } catch (error: any) {
      console.error(`HF API attempt ${attempt} failed:`, error.response?.data || error.message);
      
      if (attempt === maxRetries) {
        throw new Error(`HuggingFace API failed after ${maxRetries} attempts`);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
}

export async function summarizeText(text: string): Promise<string> {
  try {
    // Use BART for summarization
    const result = await callHFWithRetry(
      'facebook/bart-large-cnn',
      text.substring(0, 4096), // Increased input length for better PDF processing
      {
        max_length: 300,
        min_length: 80,
        do_sample: false
      }
    );

    if (result?.[0]?.summary_text) {
      return formatSummary(result[0].summary_text);
    }

    // Fallback to extractive summarization
    return createExtractiveSummary(text);
  } catch (error) {
    console.error('Summarization error:', error);
    return createExtractiveSummary(text);
  }
}

function formatSummary(summary: string): string {
  // Format summary in structured format
  const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let formatted = "## 📝 Summary\n\n";
  
  if (sentences.length > 3) {
    formatted += "### Key Points:\n";
    sentences.slice(0, 3).forEach((sentence, index) => {
      formatted += `${index + 1}. ${sentence.trim()}.\n`;
    });
    
    if (sentences.length > 3) {
      formatted += "\n### Additional Details:\n";
      sentences.slice(3).forEach(sentence => {
        formatted += `• ${sentence.trim()}.\n`;
      });
    }
  } else {
    sentences.forEach((sentence, index) => {
      formatted += `${index + 1}. ${sentence.trim()}.\n`;
    });
  }
  
  return formatted;
}

function createExtractiveSummary(text: string): string {
  // Simple extractive summarization as fallback
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 15);
  const keyWords = ['important', 'key', 'main', 'primary', 'essential', 'significant', 'crucial'];
  
  // Score sentences based on keywords and position
  const scoredSentences = sentences.map((sentence, index) => {
    let score = 0;
    
    // Position bonus (first and last sentences)
    if (index === 0 || index === sentences.length - 1) score += 2;
    
    // Keyword bonus
    keyWords.forEach(keyword => {
      if (sentence.toLowerCase().includes(keyword)) score += 1;
    });
    
    // Length bonus (prefer medium-length sentences)
    if (sentence.length > 30 && sentence.length < 300) score += 1;
    
    return { sentence: sentence.trim(), score };
  });
  
  // Get top sentences
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(8, sentences.length))
    .map(item => item.sentence);
  
  let formatted = "## 📝 Summary\n\n";
  topSentences.forEach((sentence, index) => {
    formatted += `${index + 1}. ${sentence}.\n`;
  });
  
  return formatted;
}

export async function generateQuiz(text: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): Promise<any[]> {
  try {
    // Use text generation for quiz creation
    const prompt = createQuizPrompt(text, difficulty);
    
    const result = await callHFWithRetry(
      'microsoft/DialoGPT-medium',
      prompt,
      {
        max_length: 1000,
        temperature: 0.7,
        do_sample: true
      }
    );

    // Parse the result or return mock data
    if (result?.[0]?.generated_text) {
      try {
        const quizData = parseQuizFromText(result[0].generated_text, difficulty);
        return quizData.length > 0 ? quizData : generateMockQuiz(text, difficulty);
      } catch {
        return generateMockQuiz(text, difficulty);
      }
    }

    return generateMockQuiz(text, difficulty);
  } catch (error) {
    console.error('Quiz generation error:', error);
    return generateMockQuiz(text, difficulty);
  }
}

function createQuizPrompt(text: string, difficulty: string): string {
  const difficultyInstructions = {
    easy: 'Create simple, straightforward questions that test basic understanding.',
    medium: 'Create moderately challenging questions that require some analysis.',
    hard: 'Create complex questions that require deep understanding and critical thinking.'
  };

  return `
Based on this text, create 10 quiz questions (${difficulty} difficulty):

"${text.substring(0, 800)}"

${difficultyInstructions[difficulty as keyof typeof difficultyInstructions]}

Format: Mix of multiple choice (4 options) and short answer questions.
`;
}

function parseQuizFromText(text: string, difficulty: string): any[] {
  // Simple parsing logic - in production, you'd want more sophisticated parsing
  const questions = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  // This is a simplified parser - you might want to improve this
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (Math.random() > 0.5) {
      // MCQ
      questions.push({
        type: 'mcq',
        question: `Based on the content, ${lines[i]}?`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        answer: 'Option A',
        difficulty
      });
    } else {
      // Short answer
      questions.push({
        type: 'short_answer',
        question: `Explain: ${lines[i]}`,
        answer: 'Sample answer based on the content provided.',
        difficulty
      });
    }
  }
  
  return questions;
}

function generateMockQuiz(text: string, difficulty: string): any[] {
  const questions = [];
  const questionStarters = {
    easy: [
      'What is mentioned about',
      'According to the text, what is',
      'The text states that',
      'Which of the following is true'
    ],
    medium: [
      'How does the text explain',
      'What can be inferred about',
      'The relationship between',
      'Why does the author suggest'
    ],
    hard: [
      'Critically analyze the concept of',
      'Evaluate the effectiveness of',
      'Compare and contrast the ideas about',
      'What are the implications of'
    ]
  };

  const starters = questionStarters[difficulty as keyof typeof questionStarters];
  
  for (let i = 0; i < 10; i++) {
    if (i % 3 === 0) {
      // Short answer question
      questions.push({
        type: 'short_answer',
        question: `${starters[i % starters.length]} the main concepts discussed in the text?`,
        answer: 'This question requires analysis of the key concepts presented in the study material.',
        difficulty
      });
    } else {
      // MCQ
      questions.push({
        type: 'mcq',
        question: `${starters[i % starters.length]} the primary focus of this material?`,
        options: [
          'The main concept discussed in the text',
          'A secondary topic mentioned briefly',
          'An unrelated concept',
          'None of the above'
        ],
        answer: 'The main concept discussed in the text',
        difficulty
      });
    }
  }
  
  return questions;
}

export async function getHomeworkHelp(question: string, subject: string): Promise<string> {
  try {
    const prompt = createHomeworkPrompt(question, subject);
    
    const result = await callHFWithRetry(
      'microsoft/DialoGPT-medium',
      prompt,
      {
        max_length: 800,
        temperature: 0.3,
        do_sample: true
      }
    );

    if (result?.[0]?.generated_text) {
      return formatHomeworkResponse(result[0].generated_text, subject);
    }

    return generateMockHomeworkHelp(question, subject);
  } catch (error) {
    console.error('Homework help error:', error);
    return generateMockHomeworkHelp(question, subject);
  }
}

function createHomeworkPrompt(question: string, subject: string): string {
  const subjectInstructions = {
    mathematics: 'Provide step-by-step mathematical solution with clear explanations.',
    science: 'Explain the scientific concepts and principles involved.',
    essay: 'Provide essay structure guidance and writing tips.',
    general: 'Provide clear, educational explanation.'
  };

  return `
Question: ${question}
Subject: ${subject}

${subjectInstructions[subject as keyof typeof subjectInstructions]}

Please provide a detailed, educational response suitable for Nigerian university students.
`;
}

function formatHomeworkResponse(response: string, subject: string): string {
  const templates = {
    mathematics: `## 🔢 Step-by-Step Solution\n\n### Understanding the Problem\n${response}\n\n### Solution Steps\n1. Identify given information\n2. Apply relevant formulas\n3. Calculate step by step\n4. Verify the answer\n\n### Study Tips\n• Practice similar problems\n• Memorize key formulas\n• Check your work`,
    
    science: `## 🔬 Scientific Explanation\n\n### Core Concepts\n${response}\n\n### Key Principles\n• Fundamental laws involved\n• Real-world applications\n• Common misconceptions\n\n### Further Study\n• Review related topics\n• Conduct experiments\n• Connect to daily life`,
    
    essay: `## ✍️ Essay Writing Guide\n\n### Structure Recommendation\n${response}\n\n### Writing Tips\n• Clear thesis statement\n• Strong supporting evidence\n• Logical flow of ideas\n• Compelling conclusion\n\n### Nigerian Context\n• Use local examples\n• Consider cultural perspectives\n• Address relevant issues`,
    
    general: `## 📚 Detailed Explanation\n\n${response}\n\n### Key Takeaways\n• Main concepts to remember\n• Practical applications\n• Study recommendations`
  };

  return templates[subject as keyof typeof templates] || templates.general;
}

function generateMockHomeworkHelp(question: string, subject: string): string {
  const responses = {
    mathematics: `## 🔢 Step-by-Step Solution

### Understanding the Problem
Let's break down your question: "${question}"

### Solution Approach
1. **Identify what we know**: Extract the given information
2. **Determine what we need to find**: Clarify the objective
3. **Choose the right method**: Select appropriate formulas or techniques
4. **Solve systematically**: Work through each step carefully
5. **Verify the answer**: Check if the result makes sense

### Nigerian Exam Context
This type of question commonly appears in:
• JAMB Mathematics
• University entrance exams
• Course assessments

### Study Tips
• Practice similar problems daily
• Understand the concept, don't just memorize
• Show all working steps in exams`,

    science: `## 🔬 Scientific Explanation

### Core Concept Analysis
Your question "${question}" involves important scientific principles.

### Key Scientific Principles
• **Fundamental Laws**: The underlying scientific laws that apply
• **Cause and Effect**: How different factors interact
• **Real-world Applications**: Where you see this in daily life

### Nigerian Educational Context
This concept is relevant to:
• WAEC Science subjects
• University science courses
• Practical applications in Nigeria

### Study Strategy
• Connect theory to practical examples
• Use diagrams and visual aids
• Relate to local environmental examples`,

    essay: `## ✍️ Essay Writing Guidance

### Analyzing Your Topic
"${question}" requires a structured approach to essay writing.

### Recommended Structure
1. **Introduction** (1 paragraph)
   • Hook to grab attention
   • Background context
   • Clear thesis statement

2. **Body Paragraphs** (2-3 paragraphs)
   • One main idea per paragraph
   • Evidence and examples
   • Nigerian context where relevant

3. **Conclusion** (1 paragraph)
   • Summarize key points
   • Restate thesis
   • Call to action or final thought

### Nigerian Writing Context
• Use local examples and case studies
• Consider cultural perspectives
• Address issues relevant to Nigerian society

### Writing Tips
• Write clearly and concisely
• Use transition words
• Proofread carefully`,

    general: `## 📚 Comprehensive Explanation

### Question Analysis
Let me help you understand: "${question}"

### Key Concepts
• **Main Idea**: The central concept you need to grasp
• **Supporting Details**: Important facts and information
• **Connections**: How this relates to other topics

### Learning Strategy
1. Break down complex ideas into smaller parts
2. Use examples to understand abstract concepts
3. Practice applying the knowledge
4. Connect to real-world situations

### Nigerian Educational Context
This topic is important for:
• Academic success in Nigerian institutions
• Practical application in local context
• Building foundational knowledge

### Next Steps
• Review related materials
• Practice with similar questions
• Discuss with classmates or teachers`
  };

  return responses[subject as keyof typeof responses] || responses.general;
}