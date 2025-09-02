# FONTA – AI Study Companion

FONTA is an **AI-powered study companion** designed for Nigerian and African students. It helps learners turn their notes into quizzes, summaries, and guided answers — making studying smarter, faster, and more effective.

Built during the **Vibe Coding Hackathon 2025**, this project reflects our vision of making AI-driven study tools accessible in an African educational context.

---

## 🎥 Demonstration

👉https://photos.google.com/share/AF1QipMFWU08h6s-BGZxJEDUx1M3VoZ20nLJMJV1WrYN8U8G0aaqDydpf2cKw7B3M5cL-w?pli=1&key=MmQxR2RJVXROZm1MNk1jMzh6SjRkbkFybjduckh3

---

## ✨ Features

### 🧠 AI Note-to-Quiz Generator

* Upload PDFs or paste text notes
* Generate **multiple-choice questions (MCQs)** with explanations
* Create **short-answer questions** with model answers
* Track quiz performance and scores

### 📚 AI Digital Library Summarizer

* Convert lengthy notes into concise summaries
* Clean, structured output
* Save summaries for later review
* Perfect for exam preparation

### 🎯 AI Homework Helper

* Step-by-step explanations
* Support for **Math, Science, and Essays**
* Encourages understanding, not rote answers

### 🧩 New Additions (Experimental)

* **Voice mode** 🎤 (still improving accuracy)
* **Image upload** 🖼️ (beta stage, being refined)
* **Test monetization API** 💳 (prototype for premium features)

---

## 🚀 Getting Started

### 1. Setup Supabase Database

* Create a new [Supabase](https://supabase.com/) project
* Run the SQL migrations in the `/supabase/migrations` folder
* Copy your project URL and anon key into `.env`

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

---

## 🛠️ Tech Stack

* **Frontend**: React + TypeScript + Vite
* **Styling**: Tailwind CSS
* **Database**: Supabase
* **Authentication**: Supabase Auth
* **AI Integration**: Hugging Face API (Summarizer + Quiz Generator)
* **File Upload**: React Dropzone
* **Icons**: Lucide React

---

## 🎯 Target Audience

* **Primary**: Nigerian undergraduate & postgraduate students
* **Secondary**: WAEC / JAMB prep students
* **Focus**: Local exam styles & African educational context

---

## 👥 Team

* **ABDULRAHMAN DAUD(Lead Developer & Project Lead)** – Oversaw full-stack development, Hugging Face API integration, Supabase setup, and project direction.
* **RAJI FARUQ(Frontend Developer & Ideation Associate)** – Assisted with frontend components, styling, and contributed ideas during feature planning.
* **CHINEMEREM NELSON(Backend Developer & Ideation Associate)** – Assisted with paystack integration, data flow, and feature brainstorming.
* **ABDULHAMMED TOIBAT(Coordinator, Pitch Deck & Ideation Associate)** – Handled coordination, crafted the pitch deck, and contributed to ideation.

---

## 🔮 Future Plans

* Improve **voice & image upload** performance
* Add **better daily usage limits & subscription model**
* Refine **UI into chat-style interface** for smoother user experience
* Expand **subject coverage** beyond initial scope

---

## 📌 Project Context

This project was built during the **Vibe Coding Hackathon 2025**.
Our goal was to create a **minimum viable product (MVP)** that demonstrates:

* AI-assisted learning tailored for African students
* Integration of Supabase for authentication, storage, and usage limits
* A foundation for future monetization and scaling