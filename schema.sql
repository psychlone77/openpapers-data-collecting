-- ==========================================
-- 1. USERS (Minimal representation)
-- ==========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'USER', -- e.g., 'USER', 'MODERATOR', 'ADMIN'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. EXAM TAXONOMY (The Simplified 3-Tier Model)
-- ==========================================

-- Exams (e.g., 'sl_al', 'sl_ol')
CREATE TABLE exams (
    id VARCHAR(20) PRIMARY KEY, 
    name VARCHAR(100) NOT NULL, -- e.g., 'Sri Lankan GCE A/L'
    country VARCHAR(10) DEFAULT 'LK',
    description TEXT
);

-- Subjects
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id VARCHAR(20) REFERENCES exams(id) ON DELETE CASCADE,
    code VARCHAR(10), -- e.g., '01', '09'
    name VARCHAR(100) NOT NULL,
    stream VARCHAR(50), -- e.g., 'Physical Science', 'Bio Science'
    UNIQUE(exam_id, code)
);

-- Subject Units (Database localized for robust backend filtering)
CREATE TABLE subject_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    unit_number INT NOT NULL,
    name_en VARCHAR(255),
    name_si VARCHAR(255),
    name_ta VARCHAR(255),
    UNIQUE(subject_id, unit_number)
);

-- Papers (The specific exam instances)
CREATE TABLE papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    year INT NOT NULL,
    part VARCHAR(50) NOT NULL, -- e.g., 'Paper I', 'Paper II'
    type VARCHAR(20) NOT NULL, -- e.g., 'MCQ', 'STRUCTURED', 'ESSAY'
    time_limit_minutes INT,
    UNIQUE(subject_id, year, part)
);

-- ==========================================
-- 3. QUESTIONS & LOCALIZED CONTENT
-- ==========================================

-- The parent Question entity (Language-agnostic logic)
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
    
    -- Self-referencing ID for nesting (e.g., 1 -> a -> i)
    -- NULL means it is a top-level question.
    parent_question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    
    label VARCHAR(10) NOT NULL, -- e.g., '1', 'a', 'i'
    sort_order INT NOT NULL DEFAULT 0, 
    
    type VARCHAR(20) NOT NULL, -- 'MCQ', 'STRUCTURED', 'ESSAY', 'CONTAINER'
    difficulty INT CHECK (difficulty >= 1 AND difficulty <= 5),
    
    -- Array to support multiple correct answers (e.g., ARRAY['2', '3'] or ARRAY['ALL'])
    correct_answer_keys TEXT[], 
    
    marks_allocated INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Question-to-Unit Mapping (Many-to-Many)
CREATE TABLE question_units (
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES subject_units(id) ON DELETE CASCADE,
    PRIMARY KEY (question_id, unit_id)
);

-- Localized Question Content (Sinhala, Tamil, English presentation)
CREATE TABLE question_localizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    language_code VARCHAR(2) NOT NULL CHECK (language_code IN ('en', 'si', 'ta')),
    
    prompt_text TEXT, -- Markdown/LaTeX supported
    prompt_images JSONB DEFAULT '[]'::jsonb, -- Array of embedded image URLs
    
    -- Flexible MCQ options: [{"key": "1", "text": "...", "image_url": "..."}]
    options JSONB, 
    
    UNIQUE(question_id, language_code)
);

-- ==========================================
-- 4. COMMUNITY EXPLANATIONS
-- ==========================================

-- Explanations submitted by users
CREATE TABLE explanations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    language_code VARCHAR(2) NOT NULL CHECK (language_code IN ('en', 'si', 'ta')),
    
    content_text TEXT NOT NULL, 
    content_images JSONB DEFAULT '[]'::jsonb, 
    
    upvotes INT DEFAULT 0,
    downvotes INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE, -- Flag for moderator/teacher approval
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 5. PERFORMANCE INDEXES
-- ==========================================

-- Speeds up fetching papers for a subject
CREATE INDEX idx_papers_subject_id ON papers(subject_id);

-- Speeds up fetching all questions for a specific paper
CREATE INDEX idx_questions_paper_id ON questions(paper_id);

-- Crucial for recursive CTEs or fetching sub-questions
CREATE INDEX idx_questions_parent_id ON questions(parent_question_id);

-- Speeds up joining translations to questions
CREATE INDEX idx_localizations_question_id ON question_localizations(question_id);

-- Speeds up filtering explanations for a question
CREATE INDEX idx_explanations_question_id ON explanations(question_id);