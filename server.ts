import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

// Define interfaces locally to type the DB state securely
interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  description: string;
  requirements: string[];
  skillsRequired: string[];
  status: 'Open' | 'Closed' | 'Draft';
  createdAt: string;
}

interface AIEvaluation {
  matchScore: number;
  summary: string;
  matchingSkills: string[];
  missingSkills: string[];
  experienceFit: string;
  pros: string[];
  cons: string[];
  interviewQuestions: string[];
  recommendation: 'Strong Hire' | 'Hire' | 'Neutral' | 'No Hire';
  evaluatedAt: string;
}

interface Interview {
  id: string;
  title: string;
  datetime: string;
  interviewer: string;
  type: 'Virtual' | 'In-Person' | 'Phone';
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  feedback?: string;
  rating?: number;
}

interface Message {
  id: string;
  sender: 'Recruiter' | 'Candidate';
  subject: string;
  body: string;
  timestamp: string;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  resumeText: string;
  skills: string[];
  experienceYears: number;
  currentTitle: string;
  currentCompany: string;
  appliedDate: string;
  jobId: string;
  stage: 'Applied' | 'Screened' | 'Interviewing' | 'Offered' | 'Hired' | 'Rejected';
  notes: string;
  rating: number;
  aiEvaluation?: AIEvaluation;
  interviews?: Interview[];
  messages?: Message[];
}

interface DBState {
  jobs: Job[];
  candidates: Candidate[];
}

// Lazy load Gemini API client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY is not defined. AI components will return realistic simulated results.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "DUMMY_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Initial Core Seed Data
const defaultDBState: DBState = {
  jobs: [
    {
      id: "job_1",
      title: "Senior Full-Stack Engineer (React & Go)",
      department: "Product Engineering",
      location: "San Francisco, CA (Hybrid)",
      type: "Full-time",
      description: "We are seeking a senior full-stack expert to design and scale microservices in Go, and architect pixel-perfect interfaces in React. You will own core systems responsible for data streaming and high-availability dashboards.",
      requirements: [
        "6+ years experience in software engineering.",
        "Proficiency with Go, REST APIs, or gRPC services.",
        "Deep understanding of React.js, Tailwind CSS, and state management.",
        "Familiarity with cloud infrastructures (GCP or AWS) and PostgreSQL databases."
      ],
      skillsRequired: ["React", "Go", "TypeScript", "Tailwind CSS", "PostgreSQL", "REST APIs", "GCP"],
      status: "Open",
      createdAt: "2026-05-15T10:00:00Z"
    },
    {
      id: "job_2",
      title: "Visual UX Architect",
      department: "Product Design",
      location: "Remote (US/Canada)",
      type: "Full-time",
      description: "Join us in crafting frictionless designer-to-developer workflows and building our state-of-the-art Design System. This position focuses on creative display visuals, complex interactions, and user-centric data grids.",
      requirements: [
        "4+ years of UX design / interaction design experience.",
        "Proficiency in Figma, design system structures, and interaction patterns.",
        "Familiarity with HTML/CSS and developer handoff controls.",
        "Strong portfolio featuring responsive layouts, micro-animations, and typographic mastery."
      ],
      skillsRequired: ["Figma", "Design Systems", "Typography", "Interaction Design", "User Research", "Handoff"],
      status: "Open",
      createdAt: "2026-05-20T09:30:00Z"
    },
    {
      id: "job_3",
      title: "Machine Learning Scientist",
      department: "AI Research",
      location: "New York, NY (Onsite)",
      type: "Contract",
      description: "Looking for an expert with practical experience tuning large language models (LLMs) and training customized semantic tokenizers. You will directly optimize context latency grids on local nodes.",
      requirements: [
        "Graduate degree in Computer Science, Machine Learning, or related field.",
        "Solid math & coding grounds in Python, PyTorch, and NLP architectures.",
        "Experience implementing Retrieval Augmented Generation (RAG) pipelines.",
        "Deep knowledge of pre-training tokenization and context optimization."
      ],
      skillsRequired: ["Python", "PyTorch", "NLP", "Transformers", "LLMs", "RAG", "TensorFlow"],
      status: "Open",
      createdAt: "2026-05-28T14:00:00Z"
    }
  ],
  candidates: [
    {
      id: "cand_1",
      name: "Sophia Ramirez",
      email: "sophia.ramirez@example.com",
      phone: "+1 (555) 349-2041",
      location: "San Jose, CA",
      resumeText: `SOPHIA RAMIREZ\nFull Stack Engineer | React & Go Developer\n\nPROFESSIONAL SUMMARY\nHighly technical Software Engineer with over 6 years of expertise building high-performance web applications using modern React, Go, and relational databases. Strong track record of improving throughput by 40% and designing reusable modern Component Libraries.\n\nEXPERIENCE\nLead Full-Stack Developer at NexaGen (2023 - Present)\n- Led a team of 4 rewriting the enterprise cloud analytics platform in React, Tailwind, and Go microservices.\n- Achieved 45% reduction in dashboard load latencies using intelligent cache-priming pipelines.\n- Designed a clean custom state engine which cut client-side re-renders in half.\nSenior Engineer at StackGrid (2020 - 2023)\n- Engineered robust REST APIs in Go serving over 20,000 active concurrent users.\n- Designed database schemas in PostgreSQL with complex partition keys and specialized indexing.\n\nTECHNICAL SKILLS\nLanguages: Go, TypeScript, JavaScript, SQL, HTML, CSS\nFrameworks & Libraries: React, Next.js, Tailwind CSS, Express, Gin (Go)\nTools & Databases: PostgreSQL, MongoDB, Docker, Git, GCP, REST APIs, GraphQL`,
      skills: ["React", "Go", "TypeScript", "Tailwind CSS", "PostgreSQL", "REST APIs", "GCP", "Next.js", "Docker"],
      experienceYears: 6.5,
      currentTitle: "Lead Full-Stack Developer",
      currentCompany: "NexaGen",
      appliedDate: "2026-05-18T11:20:00Z",
      jobId: "job_1",
      stage: "Interviewing",
      notes: "Extremely strong alignment with our stack. Sophia performed exceptionally well on the introductory screening call. She has sound architectural foundations.",
      rating: 5,
      aiEvaluation: {
        matchScore: 92,
        summary: "Sophia is an exceptional fit for the Senior Full-Stack role. She possesses robust real-world production experience in both Go microservices and modern React dashboard architectures. Her current track record lists quantifiable performance optimization metrics, which perfectly align with our high-volume requirements.",
        matchingSkills: ["React", "Go", "TypeScript", "Tailwind CSS", "PostgreSQL", "REST APIs", "GCP"],
        missingSkills: [],
        experienceFit: "Excellent. Over 6 years of genuine full-stack experience with high-scale applications matching the 6+ years requested role level.",
        pros: [
          "Possesses both requested backend (Go) and frontend (React) primary languages.",
          "Demonstrable experience optimizing database querying (PostgreSQL indexing) and web rendering dashboards.",
          "Clear leadership experience running agile scrums."
        ],
        cons: [
          "Slightly heavier focus on Go backend rather than distributed gRPC, but gRPC is easily picked up given her Gin background."
        ],
        interviewQuestions: [
          "How did you structure the caching layer in your Go microservices at NexaGen to achieve the 45% latency reduction?",
          "Can you explain your approach for avoiding state-drift and optimizing renders in highly dynamic React dashboard applications?",
          "How do you handle multi-tenant isolation patterns when utilizing PostgreSQL partitions for user analytics grids?"
        ],
        recommendation: "Strong Hire",
        evaluatedAt: "2026-05-18T14:45:00Z"
      },
      interviews: [
        {
          id: "int_1",
          title: "Technical deep-dive on Go & Systems",
          datetime: "2026-06-10T15:00:00Z",
          interviewer: "Harlan Cooper (VP Engineering)",
          type: "Virtual",
          status: "Scheduled"
        },
        {
          id: "int_2",
          title: "Initial Recruiter Screen",
          datetime: "2026-05-22T10:00:00Z",
          interviewer: "Sarah Jenkins (Recruiting)",
          type: "Phone",
          status: "Completed",
          feedback: "Great energy. Sophia has clear communication skills, fits the collaborative mindset, and was very transparent about compensation expectations.",
          rating: 4
        }
      ],
      messages: [
        {
          id: "msg_1",
          sender: "Recruiter",
          subject: "Invitation to Interview: Senior Full-Stack Engineer",
          body: "Hello Sophia,\n\nI hope this email finds you well. Our team reviewed your background and was incredibly impressed by your React and Go experience, particularly the load latency achievements at NexaGen.\n\nWe would love to invite you to a 45-minute technical conversation with our VP of Engineering, Harlan Cooper, to dive deeper into systems architectures.\n\nLet me know if next Wednesday at 3:00 PM PST works for you!\n\nBest regards,\nSarah Jenkins\nTalent Team",
          timestamp: "2026-05-20T16:15:00Z"
        }
      ]
    },
    {
      id: "cand_2",
      name: "Alex Chen",
      email: "alex.chen.dev@example.com",
      phone: "+1 (555) 710-8293",
      location: "Seattle, WA",
      resumeText: `ALEX CHEN\nProduct Minded Developer\n\nOBJECTIVE\nHighly motivated sophomore developer skilled in rapid prototyping, clean Javascript practices, and MongoDB backend storage grids. Seeking a full-stack role to hone my collaborative systems habits.\n\nEXPERIENCE\nJunior Web Developer at PixelCraft (2024 - 2026)\n- Designed and implemented clean product Landing Pages boosting call-to-action signs by 10%.\n- Integrated Stripe API interfaces for subscription payment collections.\n- Managed local database connections and built Express server routing endpoints.\n\nSTRENGTHS & SKILLS\n- Languages: JavaScript, HTML5, CSS\n- Libraries: React, Express, Node.js, Tailwind CSS\n- Systems: MongoDB, Git, Postman Web Inspect`,
      skills: ["React", "TypeScript", "Tailwind CSS", "REST APIs"],
      experienceYears: 2.0,
      currentTitle: "Junior Software Engineer",
      currentCompany: "PixelCraft Agency",
      appliedDate: "2026-06-01T08:15:00Z",
      jobId: "job_1",
      stage: "Applied",
      notes: "Alex has high potential but seems light on experience for our Senior role. Go is also missing from their background entirely. Let's do a screening anyway or routing review.",
      rating: 3,
      interviews: [],
      messages: []
    },
    {
      id: "cand_3",
      name: "Liam Sterling",
      email: "l.sterling@interactive.design",
      phone: "+1 (555) 833-2894",
      location: "Denver, CO",
      resumeText: `LIAM STERLING\nLead Experience Architect | Designer & Thinker\n\nEXPERIENCE\nLead Product Designer at Visionary Studio (2021 - Present)\n- Maintained the core enterprise-level Design System, supporting 28 separate front-end teams.\n- Performed rich interactive prototyping, customer journey tracking, and micro-interaction mockups.\nPrincipal UX Specialist at WebCart (2018 - 2021)\n- Designed high-converting e-commerce carts, boosting checkout convergence rates by 12% via rapid A/B layout experiments.\n- Oversaw typography pairing guidelines and responsive viewport layouts.\n\nTOOLKIT & METHODS\nFigma, Design Systems, Typography, Interaction Design, User Research, Web Developer Handoff, Principle Animation.`,
      skills: ["Figma", "Design Systems", "Typography", "Interaction Design", "User Research"],
      experienceYears: 8.0,
      currentTitle: "Lead Product Designer",
      currentCompany: "Visionary Studio",
      appliedDate: "2026-05-24T14:10:00Z",
      jobId: "job_2",
      stage: "Screened",
      notes: "Impressive visual portfolio. Showcases perfect layout rhythm and detailed font usage. Genuinely understands responsive states.",
      rating: 4,
      aiEvaluation: {
        matchScore: 96,
        summary: "Liam is an absolute perfect match for the Visual UX Architect role. His 8+ years of dedicated design experience covers Figma system scaling, typography, and interactive prototyping. He specifically calls out custom design systems support for 28 frontend teams, matching our primary core workflow objectives.",
        matchingSkills: ["Figma", "Design Systems", "Typography", "Interaction Design", "User Research"],
        missingSkills: ["HTML/CSS"],
        experienceFit: "Outstanding. Exceeds the 4+ years requirement with premium, highly scalable, enterprise-level design system architecture.",
        pros: [
          "Direct experience driving unified design systems at scale across massive teams.",
          "Quantifiable design impact on checkout conversions (A/B testing knowledge).",
          "Excellent typographic and alignment sensibilities."
        ],
        cons: [
          "Resume doesn't show heavy coding familiarity (e.g. HTML/CSS), so developer handoff coordination might require minor adaptation, but his layout spec cleanups mitigate this."
        ],
        interviewQuestions: [
          "How did you structure design libraries within Figma to keep 28 front-end squads in lock-step without component chaos?",
          "Can you talk through a recent typography or fluid layout pairing decision you made and what research backed it up?",
          "How do you organize spec handoffs to reduce designer-to-developer transition frictions?"
        ],
        recommendation: "Strong Hire",
        evaluatedAt: "2026-05-25T11:00:00Z"
      },
      interviews: [],
      messages: []
    },
    {
      id: "cand_4",
      name: "Maya Patel",
      email: "maya.patel@datascience.io",
      phone: "+1 (555) 902-1249",
      location: "New York, NY",
      resumeText: `MAYA PATEL\nMachine Learning Researcher\n\nEXPERIENCE\nGraduate Research Assistant at Columbia NLP Lab (2024 - 2026)\n- Fine-tuned transformer models (BERT, Llama-2 variations) for high-accuracy sentence embeddings.\n- Wrote PyTorch data loaders, training pipelines, and custom tokenizer routines.\nSenior AI Analyst at InfoCorp (2022 - 2024)\n- Automated content classification engines using scikit-learn models and text processing.\n- Scaled Pandas-based semantic feature vector calculation grids.\n\nSKILLS & EDUCATION\nM.S. in Computer Science (Columbia University)\nTech: Python, PyTorch, Transformers, NLP, LLMs, SQL, Pandas, NumPy, Git`,
      skills: ["Python", "PyTorch", "NLP", "Transformers", "LLMs"],
      experienceYears: 4.0,
      currentTitle: "Graduate Research Assistant",
      currentCompany: "Columbia NLP Lab",
      appliedDate: "2026-06-02T10:05:00Z",
      jobId: "job_3",
      stage: "Applied",
      notes: "Very relevant NLP/LLM fine-tuning background. Location is NY which matches perfect onsite conditions.",
      rating: 4,
      interviews: [],
      messages: []
    },
    {
      id: "cand_5",
      name: "Marcus Brody",
      email: "marcus.db.guy@example.com",
      phone: "+1 (555) 192-3847",
      location: "San Francisco, CA",
      resumeText: `MARCUS BRODY\nSenior Database Operations | PostgreSQL Oracle Specialist\n\nEXPERIENCE\nDatabase Administrator at CloudArch (2016 - 2026)\n- Maintained heavy production PostgreSQL database clusters, tuning query plans and vacuum settings.\n- Automated failover procedures, backing up local and remote database records.\n\nSKILLS\nPostgreSQL, Oracle DB, SQL Tuning, Linux Administration, Shell Scripting.`,
      skills: ["PostgreSQL", "Postgresql"],
      experienceYears: 10.0,
      currentTitle: "Database Administrator",
      currentCompany: "CloudArch Technologies",
      appliedDate: "2026-05-20T09:15:00Z",
      jobId: "job_1",
      stage: "Rejected",
      notes: "Candidate has amazing database foundations but lacking React, Go, and standard application development skills required for full-stack engineering.",
      rating: 2,
      aiEvaluation: {
        matchScore: 42,
        summary: "Marcus possesses extensive database engineering credentials, but fails to demonstrate the critical application development proficiency requested. He has zero documented React or general Go development projects. His expertise represents an Infrastructure/DBA archetype rather than an active application developer.",
        matchingSkills: ["PostgreSQL"],
        missingSkills: ["React", "Go", "TypeScript", "Tailwind CSS", "REST APIs", "GCP"],
        experienceFit: "Strong chronological experience but misalignment of functional skills. Over 10 years as a Database Administrator is mismatched against a full-stack product engineer goal.",
        pros: [
          "Exceptional PostgreSQL optimization skill set, which is excellent for indexing high-velocity databases.",
          "Long, steady corporate employment histories indicating system reliability."
        ],
        cons: [
          "Complete lack of React, TypeScript, or modern frontend components.",
          "No backend application server construction records in modern web languages like Go, Python, or Ruby."
        ],
        interviewQuestions: [
          "What factors would direct your choice of choosing a separate microservice language versus writing business logic directly in the database layers?",
          "Are you interested in transitioning directly to application-level coding and React frontend components?"
        ],
        recommendation: "No Hire",
        evaluatedAt: "2026-05-21T15:30:00Z"
      },
      interviews: [],
      messages: [
        {
          id: "msg_reject_1",
          sender: "Recruiter",
          subject: "Application Update: Senior Full-Stack Engineer",
          body: "Hello Marcus,\n\nThank you so much for your interest in our Senior Full-Stack Engineer position and for taking the time to share your background with us.\n\nWhile your database administration experience with PostgreSQL is highly impressive, we have decided to focus our search on candidates with more active React and Go backend application engineering backgrounds.\n\nWe appreciate your interest in our company, and we wish you the best of luck with your job search!\n\nWarm regards,\nSarah Jenkins\nPrincipal Talent Specialist",
          timestamp: "2026-05-22T09:30:00Z"
        }
      ]
    }
  ]
};

// Database Read/Write Utilities
function readDatabase(): DBState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const dataStr = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(dataStr);
    } else {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDBState, null, 2), "utf-8");
      return defaultDBState;
    }
  } catch (err) {
    console.error("Error reading db file. Returning defaults.", err);
    return defaultDBState;
  }
}

function writeDatabase(state: DBState): boolean {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing to db.json", err);
    return false;
  }
}

// Ensure the db.json is initialized immediately
readDatabase();

// --- API ENDPOINTS ---

// Jobs API
app.get("/api/jobs", (req, res) => {
  const db = readDatabase();
  res.json(db.jobs);
});

app.post("/api/jobs", (req, res) => {
  const db = readDatabase();
  const { title, department, location, type, description, requirements, skillsRequired } = req.body;
  
  if (!title || !description) {
    return res.status(400).json({ error: "Job title and description are required." });
  }

  const newJob: Job = {
    id: `job_${Date.now()}`,
    title,
    department: department || "General Engineering",
    location: location || "Remote",
    type: type || "Full-time",
    description,
    requirements: requirements || [],
    skillsRequired: skillsRequired || [],
    status: "Open",
    createdAt: new Date().toISOString()
  };

  db.jobs.unshift(newJob);
  writeDatabase(db);
  res.status(201).json(newJob);
});

app.delete("/api/jobs/:id", (req, res) => {
  const db = readDatabase();
  const index = db.jobs.findIndex(j => j.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Job not found" });
  }
  db.jobs.splice(index, 1);
  writeDatabase(db);
  res.json({ success: true, message: "Job deleted successfully." });
});

// Candidates API
app.get("/api/candidates", (req, res) => {
  const db = readDatabase();
  res.json(db.candidates);
});

app.post("/api/candidates", (req, res) => {
  const db = readDatabase();
  const { name, email, phone, location, currentTitle, currentCompany, appliedDate, jobId, resumeText, skills, experienceYears } = req.body;

  if (!name || !email || !jobId) {
    return res.status(400).json({ error: "Name, Email, and associated Job are required." });
  }

  const newCand: Candidate = {
    id: `cand_${Date.now()}`,
    name,
    email,
    phone: phone || "",
    location: location || "N/A",
    resumeText: resumeText || "",
    skills: skills || [],
    experienceYears: Number(experienceYears) || 0,
    currentTitle: currentTitle || "Applicant",
    currentCompany: currentCompany || "N/A",
    appliedDate: appliedDate || new Date().toISOString(),
    jobId,
    stage: "Applied",
    notes: "",
    rating: 0,
    interviews: [],
    messages: []
  };

  db.candidates.unshift(newCand);
  writeDatabase(db);
  res.status(201).json(newCand);
});

app.get("/api/candidates/:id", (req, res) => {
  const db = readDatabase();
  const candidate = db.candidates.find(c => c.id === req.params.id);
  if (!candidate) return res.status(404).json({ error: "Candidate not found" });
  res.json(candidate);
});

app.put("/api/candidates/:id", (req, res) => {
  const db = readDatabase();
  const index = db.candidates.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Candidate not found" });

  const updatedCandidate = { ...db.candidates[index], ...req.body };
  db.candidates[index] = updatedCandidate;
  writeDatabase(db);
  res.json(updatedCandidate);
});

app.delete("/api/candidates/:id", (req, res) => {
  const db = readDatabase();
  const index = db.candidates.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Candidate not found" });
  db.candidates.splice(index, 1);
  writeDatabase(db);
  res.json({ success: true, message: "Candidate deleted successfully." });
});

// Candidate Notes API
app.post("/api/candidates/:id/notes", (req, res) => {
  const db = readDatabase();
  const { notes } = req.body;
  const candidate = db.candidates.find(c => c.id === req.params.id);
  if (!candidate) return res.status(404).json({ error: "Candidate not found." });

  candidate.notes = notes;
  writeDatabase(db);
  res.json(candidate);
});

// Candidate Interview Scheduling API
app.post("/api/candidates/:id/interviews", (req, res) => {
  const db = readDatabase();
  const { title, datetime, interviewer, type } = req.body;
  if (!title || !datetime || !interviewer) {
    return res.status(400).json({ error: "Title, datetime, and interviewer are required." });
  }

  const candidate = db.candidates.find(c => c.id === req.params.id);
  if (!candidate) return res.status(404).json({ error: "Candidate not found." });

  const newInt: Interview = {
    id: `int_${Date.now()}`,
    title,
    datetime,
    interviewer,
    type: type || "Virtual",
    status: "Scheduled"
  };

  if (!candidate.interviews) candidate.interviews = [];
  candidate.interviews.push(newInt);
  
  // also add standard notification to candidate's message log
  const systemMessage: Message = {
    id: `msg_auto_${Date.now()}`,
    sender: "Recruiter",
    subject: `Interview Scheduled: ${title}`,
    body: `Dear ${candidate.name},\n\nWe have scheduled a high-priority conversation with you!\n\nSession: ${title}\nTime: ${new Date(datetime).toLocaleString()}\nInterviewer: ${interviewer}\nType: ${type}\n\nWe look forward to speaking with you. Our team will verify credentials beforehand.`,
    timestamp: new Date().toISOString()
  };
  candidate.messages = candidate.messages || [];
  candidate.messages.push(systemMessage);
  
  // Move candidate to Interviewing stage automatically
  candidate.stage = "Interviewing";

  writeDatabase(db);
  res.status(201).json(candidate);
});

// Complete & Feedback on Interview
app.post("/api/candidates/:id/interviews/:intId/feedback", (req, res) => {
  const db = readDatabase();
  const { feedback, rating, status } = req.body;
  
  const candidate = db.candidates.find(c => c.id === req.params.id);
  if (!candidate || !candidate.interviews) return res.status(404).json({ error: "Interview record not found." });

  const interview = candidate.interviews.find(i => i.id === req.params.intId);
  if (!interview) return res.status(404).json({ error: "Specific interview not found." });

  interview.feedback = feedback || "";
  interview.rating = Number(rating) || 3;
  interview.status = status || "Completed";

  // Re-calculate rating
  const completedInts = candidate.interviews.filter(i => i.status === "Completed" && i.rating !== undefined);
  if (completedInts.length > 0) {
    const total = completedInts.reduce((acc, curr) => acc + (curr.rating || 0), 0);
    candidate.rating = Math.ceil(total / completedInts.length);
  }

  writeDatabase(db);
  res.json(candidate);
});

// --- AI SCREENING ENDPOINT via Gemini ---
app.post("/api/screen-candidate", async (req, res) => {
  const { candidateId, jobId } = req.body;
  if (!candidateId || !jobId) {
    return res.status(400).json({ error: "candidateId and jobId are required in request body." });
  }

  const db = readDatabase();
  const candidate = db.candidates.find(c => c.id === candidateId);
  const job = db.jobs.find(j => j.id === jobId);

  if (!candidate || !job) {
    return res.status(404).json({ error: "Candidate or associated Job not found." });
  }

  const resumeBody = candidate.resumeText || `Name: ${candidate.name}. Skills of interest: ${candidate.skills.join(", ")}. Title: ${candidate.currentTitle}. Company: ${candidate.currentCompany}. Experience years: ${candidate.experienceYears}.`;
  
  // AI Config & Prompts
  const systemInstruction = `You are an expert technical recruiter and talent assessment intelligence engine.
Your task is to analyze candidate specifications (resume content, primary skill metrics, and experience timelines) against our Job Requirements.
Calculate a reliable match score (0-100), extract matching skills, identify specific gaps (missing skills), evaluate experience fit, summarize strengths and liabilities, provide targeted interview technical questions, and choose recommendation level ('Strong Hire', 'Hire', 'Neutral', 'No Hire').`;

  const prompt = `### PROFILE IDENTIFIER
Candidate: ${candidate.name}
Current Title: ${candidate.currentTitle} (${candidate.experienceYears} Years Experience)
Possessed Skills: ${candidate.skills.join(", ")}

### JOB REQUIREMENTS
Title: ${job.title}
Role Description: ${job.description}
Key Requirements:
${job.requirements.map(r => ` - ${r}`).join("\n")}
Target Required Skills: ${job.skillsRequired.join(", ")}

### CANDIDATE RESUME BODY:
${resumeBody}

Provide a deep-dive technical ranking analysis in structured JSON context directly mapping to required attributes. Do not wrap in markdown tags or outer text blocks.`;

  try {
    const ai = getGeminiClient();
    
    // Check if key is available. If dummy key exists, fallback to high-quality simulated assessment
    if (!process.env.GEMINI_API_KEY) {
      // Simulate real calculation beautifully
      const matchingSkills = candidate.skills.filter(s => job.skillsRequired.includes(s));
      const missingSkills = job.skillsRequired.filter(s => !candidate.skills.includes(s));
      
      const yearsMatch = candidate.experienceYears >= 5 ? "Strong" : (candidate.experienceYears >= 2 ? "Moderate" : "Junior level");
      const matchScore = Math.min(100, Math.round((matchingSkills.length / Math.max(1, job.skillsRequired.length)) * 70 + (candidate.experienceYears * 4) + 10));

      const evaluation: AIEvaluation = {
        matchScore: matchScore,
        summary: `Simulated Analysis for ${candidate.name}: Shows solid engineering capabilities as a ${candidate.currentTitle} with strong alignment on ${matchingSkills.join(", ") || "fundamental engineering items"}. Minor gaps in ${missingSkills.join(", ") || "niche architectures"} were identified.`,
        matchingSkills: matchingSkills,
        missingSkills: missingSkills,
        experienceFit: `Candidate possesses ${candidate.experienceYears} years. Fit level evaluated as: ${yearsMatch}.`,
        pros: [
          `Solid experience operating as ${candidate.currentTitle} at ${candidate.currentCompany || "past agencies"}.`,
          `Possesses key target functional skills including ${matchingSkills.slice(0, 3).join(", ") || "modern workflows"}.`
        ],
        cons: missingSkills.length > 0 ? [
          `Currently lacks structured experience with: ${missingSkills.join(", ")}.`
        ] : [
          "No major structural weaknesses identified in candidate background."
        ],
        interviewQuestions: [
          `Can you describe a complex task where you utilized your skills in ${matchingSkills[0] || "application systems development"} to resolve production bottlenecks?`,
          missingSkills.length > 0 ? `How would you go about picking up a project requiring deep understanding of ${missingSkills[0]}?` : `How do you stay abreast of new techniques in this field?`
        ],
        recommendation: matchScore >= 85 ? "Strong Hire" : (matchScore >= 65 ? "Hire" : (matchScore >= 45 ? "Neutral" : "No Hire")),
        evaluatedAt: new Date().toISOString()
      };

      // update DB record
      candidate.aiEvaluation = evaluation;
      candidate.stage = "Screened";
      writeDatabase(db);
      return res.json(evaluation);
    }

    // Real API Call with Response Schema
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchScore: { type: Type.INTEGER, description: "Match percentage out of 100 based on core alignment." },
            summary: { type: Type.STRING, description: "Professional summary of candidate suitability." },
            matchingSkills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Standardized list of skills the candidate possesses matching the role."
            },
            missingSkills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Skills listed in job requirements that are completely omitted or lacking in resume."
            },
            experienceFit: { type: Type.STRING, description: "Assessment of work timeline fit." },
            pros: { type: Type.ARRAY, items: { type: Type.STRING }, description: "STANDOUT core positive qualifications." },
            cons: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Discrepancies, missing credentials, or developmental items." },
            interviewQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 highly direct technical questions to probe during structural screening conversations."
            },
            recommendation: {
              type: Type.STRING,
              description: "Must be exactly one of: 'Strong Hire', 'Hire', 'Neutral', 'No Hire'."
            }
          },
          required: ["matchScore", "summary", "matchingSkills", "missingSkills", "experienceFit", "pros", "cons", "interviewQuestions", "recommendation"]
        }
      }
    });

    const parsedEval: AIEvaluation = JSON.parse(response.text.trim());
    parsedEval.evaluatedAt = new Date().toISOString();

    candidate.aiEvaluation = parsedEval;
    // Auto shift to Screened stage if they were in Applied stage
    if (candidate.stage === "Applied") {
      candidate.stage = "Screened";
    }
    
    writeDatabase(db);
    res.json(parsedEval);

  } catch (err: any) {
    console.error("Gemini Screening API Err:", err);
    res.status(500).json({ error: "AI assessment failed. Please verify API configuration.", details: err.message });
  }
});

// --- AI RECRUITING MESSAGE / EMAIL GENERATOR ---
app.post("/api/generate-email", async (req, res) => {
  const { candidateId, jobId, templateType } = req.body;
  if (!candidateId || !jobId || !templateType) {
    return res.status(400).json({ error: "candidateId, jobId, and templateType are required." });
  }

  const db = readDatabase();
  const candidate = db.candidates.find(c => c.id === candidateId);
  const job = db.jobs.find(j => j.id === jobId);

  if (!candidate || !job) {
    return res.status(404).json({ error: "Candidate or Job details not found." });
  }

  const hasScore = candidate.aiEvaluation ? candidate.aiEvaluation.matchScore : null;
  const matchRecommendation = candidate.aiEvaluation ? candidate.aiEvaluation.recommendation : "review ongoing";

  const systemInstruction = `You are a warm, highly professional talent acquisition manager with impeccable grammatical rhythm and modern branding.
Draft beautifully crafted personalized outreach and transactional emails for candidates. Maintain high engagement and customized interest signals which refer specifically to matching aspects of their background.`;

  const prompt = `Create a candidate recruiting email draft with the following specifications:
- Candidate Name: ${candidate.name}
- Target Position: ${job.title} at our firm
- Current Role: ${candidate.currentTitle} at ${candidate.currentCompany}
- Relevant Professional Skills: ${candidate.skills.slice(0, 4).join(", ")}
- AI Screening Score: ${hasScore ? `${hasScore}% alignment` : 'Needs initial review'}
- AI Assessment Recommendation: ${matchRecommendation}
- Target Email Type / Template Goal: ${templateType.toUpperCase()} (e.g. "INTERVIEW" request, "OFFER" letter outline, constructive feedback "REJECTION", or "FOLLOW-UP" update)

Structure your text beautifully. Return a JSON object with:
- subject: a catchy professional subject line
- body: clean, paragraphs separated by double newline, with placeholders like [My Company Name] or [My Name] for recruiter branding, but candidate identifiers fully filled. Keep it highly relevant and proportional. Avoid sales-y hype.`;

  try {
    const ai = getGeminiClient();

    if (!process.env.GEMINI_API_KEY) {
      // Simulate beautiful email draft
      let subject = "";
      let body = "";

      if (templateType === "interview") {
        subject = `Technical Discussion: Senior Position Outreach | ${candidate.name}`;
        body = `Dear ${candidate.name},\n\nI hope this email finds you well.\n\nOur engineering team was recently reviewing profiles and your stellar background as a ${candidate.currentTitle} caught our absolute focus. Your hands-on experience in ${candidate.skills.slice(0, 3).join(", ") || "modular technologies"} perfectly aligns with our roadmap objectives.\n\nWe would love to invite you to an introductory 30-minute conversation to explore how your credentials sync with our open ${job.title} role. Let me know if you would be available for a virtual meet next Tuesday or Thursday after 10:00 AM.\n\nBest regards,\n[My Name]\nPrincipal Recruiting Lead`;
      } else if (templateType === "offer") {
        subject = `Offer of Employment: ${job.title} at our Company`;
        body = `Dear ${candidate.name},\n\nIt is our absolute privilege and pleasure to extend a formal offer of employment to join our growing product team in the role of ${job.title}.\n\nThroughout our technical screens, every evaluator remarked on your outstanding knowledge of ${candidate.skills.slice(0, 3).join(", ")} and your proactive engineering approach. We are confident your leadership will elevate our services pipeline.\n\nAttached to this transmission you will find the initial package details. We look forward to welcome you to the engineering division!\n\nSincerest congratulations,\n[My Name]\nChief Talent Officer`;
      } else if (templateType === "rejection") {
        subject = `Application Update: ${job.title}`;
        body = `Dear ${candidate.name},\n\nThank you for taking the time to discuss your background as a ${candidate.currentTitle} with our recruitment managers for the open ${job.title} seat.\n\nWe were impressed by your clear understanding of ${candidate.skills.slice(0, 2).join(", ") || "modern pipelines"}. However, our core team is currently prioritizing applicants who possess extensive professional mastery in Go microservices. Consequently, we are moving forward with other applicants at this juncture.\n\nWe will keep your resume on file as new requirements develop. We wish you immense success in your active career search.\n\nSincerely,\n[My Name]\nUniversity & Talent Relations`;
      } else {
        subject = `Following up on your application: ${job.title}`;
        body = `Dear ${candidate.name},\n\nI'm writing to share a brief update regarding your ongoing application for the ${job.title} role.\n\nOur hiring managers are actively reviewing engineering schedules to organize the upcoming panels. We appreciate your patience, and expect to have a set of solid dates locked down by the end of this week.\n\nPlease don't hesitate to reach back out if you have any questions in the meantime.\n\nBest regards,\n[My Name]\nCandidate Success Coordinator`;
      }

      return res.json({ subject, body });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING, description: "Elegant, crisp subject line." },
            body: { type: Type.STRING, description: "Personalized body text with appropriate spacing." }
          },
          required: ["subject", "body"]
        }
      }
    });

    const parsedEmail = JSON.parse(response.text.trim());
    res.json(parsedEmail);

  } catch (err: any) {
    console.error("Gemini Email API Err:", err);
    res.status(500).json({ error: "Failed to generate AI email draft.", details: err.message });
  }
});

// Send/Log Simulated Email in Candidate File
app.post("/api/send-email", (req, res) => {
  const { candidateId, subject, body } = req.body;
  if (!candidateId || !subject || !body) {
    return res.status(400).json({ error: "candidateId, subject, and body are required." });
  }

  const db = readDatabase();
  const candidate = db.candidates.find(c => c.id === candidateId);
  if (!candidate) return res.status(404).json({ error: "Candidate not found." });

  const newMessage: Message = {
    id: `msg_${Date.now()}`,
    sender: "Recruiter",
    subject,
    body,
    timestamp: new Date().toISOString()
  };

  if (!candidate.messages) candidate.messages = [];
  candidate.messages.push(newMessage);

  // automatically sync pipeline stage based on email topics to save recruiter time!
  const lowerSub = subject.toLowerCase();
  const lowerBody = body.toLowerCase();
  if (lowerSub.includes("offer") || lowerBody.includes("offer of employment")) {
    candidate.stage = "Offered";
  } else if (lowerSub.includes("reject") || lowerBody.includes("rejection") || lowerBody.includes("moving forward with other")) {
    candidate.stage = "Rejected";
  } else if (lowerSub.includes("interview") || lowerBody.includes("schedule a conversation") || lowerBody.includes("technical conversation")) {
    candidate.stage = "Interviewing";
  }

  writeDatabase(db);
  res.json({ success: true, candidate });
});


// Configure Vite Asset Server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
