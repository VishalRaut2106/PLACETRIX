<div align="center">
  <h1>🚀 Placetrix: The Next-Gen Intelligent LMS Module</h1>
  <p><strong>End-to-End AI Evaluation Assistant for Educators</strong></p>
  <p><i>Submission for <b>The Next-Gen AI Education Track - Best Intelligent LMS Module</b> (Build with Gemma)</i></p>
</div>

---

## 🎯 The Problem

**Teachers spend too much time on manual test creation and grading.** 
In traditional Learning Management Systems, educators are forced to spend hours manually typing out questions from syllabi, grading subjective submissions, and analyzing student performance. More importantly, when students get an answer wrong, they rarely receive the deep, personalized feedback required to correct their conceptual misunderstandings.

## 💡 The Solution: Placetrix

**Placetrix** is an open-source, self-hosted end-to-end evaluation assistant powered by **Gemma AI**. We designed this module to completely automate the assessment lifecycle for teachers—from document parsing to personalized student feedback—while maintaining the highest standard of academic rigor.

---

## 🧠 The Gemma-Powered Workflow (What Judges Want to See)

We built our solution precisely around the Hackathon's judging criteria, heavily leveraging **Gemma 2** (via Google Generative AI) and **text-embedding-004** to build an intelligent, grounded RAG pipeline.

### 1. Accurate Document Parsing (RAG) & Question Generation
The workflow begins when a teacher uploads a course Syllabus or Lecture PDF.
- **How it works**: We extract the text and chunk it using a sliding window. We then generate dense vector embeddings using Google's `text-embedding-004` model.
- **Grounded Question Generation**: When a teacher requests a quiz on a specific topic, we use Cosine Similarity to retrieve the most mathematically relevant text chunks. We feed this deeply grounded context into Gemma, strictly instructing it to generate academically rigorous questions with plausible distractors, completely eliminating AI hallucinations.

### 2. The Evaluation Phase: Conceptual Feedback (The Standout Feature)
We use Gemma not just to mark answers as "right" or "wrong," but to deeply evaluate *why* a student failed.
- **Personalized Constructive Feedback**: When a student completes a test, Placetrix aggregates their performance by topic. We use Gemma to analyze their exact mistakes and generate a **Personalized Study Strategy**.
- **Explaining Conceptual Misunderstandings**: For every incorrect answer, Gemma provides an AI-generated explanation that doesn't just reveal the correct answer, but explicitly explains *why* the student's chosen distractor represents a conceptual misunderstanding. 

### 3. AI Resume & Candidate Analyzer
As a bonus module for the placement lifecycle, Placetrix uses Gemma to act as an intelligent Applicant Tracking System (ATS). It evaluates student resumes against Job Descriptions, scoring them and providing line-by-line rewrite suggestions to bridge the gap between their current skills and industry expectations.

---

## ⚙️ How the Tech Works (Under the Hood)

We designed the AI pipeline to be robust, fast, and highly accurate:

1. **Text Extraction**: We use `pdf-parse` to cleanly extract UTF-8 text from teacher-uploaded PDFs.
2. **Chunking**: Text is sliced into 2,000-character chunks with a 200-character overlap to preserve semantic context across page boundaries.
3. **Embeddings & Math**: We map chunks into 768-dimensional space using `text-embedding-004` and use Cosine Similarity to mathematically prove chunk relevance.
4. **Prompt Engineering**: We wrap the retrieved text in highly specific instructions. We explicitly forbid Gemma from using robotic phrases like *"Based on the text..."*, ensuring the output feels natural, human-authored, and grounded entirely in the teacher's original material.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Shadcn UI
- **Backend**: Next.js Server Actions, Node.js
- **Database & Auth**: Supabase (PostgreSQL, Row Level Security)
- **AI & Machine Learning**: Google Generative AI SDK, Gemma 2, `text-embedding-004`
- **Editor**: Monaco Editor (for the LogicLab code workspace)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- A Supabase Project
- A Gemma API Key

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/your-username/placetrix.git
   cd placetrix
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Set up Environment Variables**
   Create a \`.env.local\` file in the root directory and add your keys:
   \`\`\`env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_google_ai_studio_key
   \`\`\`

4. **Run the Development Server**
   \`\`\`bash
   npm run dev
   \`\`\`
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
