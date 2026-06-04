export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string; // "Full-time" | "Part-time" | "Remote" | "Contract"
  description: string;
  requirements: string[];
  skillsRequired: string[];
  status: 'Open' | 'Closed' | 'Draft';
  createdAt: string;
}

export interface AIEvaluation {
  matchScore: number; // 0 - 100
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

export interface Interview {
  id: string;
  title: string; // "Technical Phone Screen", "Coding Interview", "system Design Interview", "Culture Fit"
  datetime: string;
  interviewer: string;
  type: 'Virtual' | 'In-Person' | 'Phone';
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  feedback?: string;
  rating?: number; // 1-5 stars if completed
}

export interface Message {
  id: string;
  sender: 'Recruiter' | 'Candidate';
  subject: string;
  body: string;
  timestamp: string;
}

export interface Candidate {
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
  rating: number; // overall rating (0-5)
  aiEvaluation?: AIEvaluation;
  interviews?: Interview[];
  messages?: Message[];
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyTemplate: string;
}
