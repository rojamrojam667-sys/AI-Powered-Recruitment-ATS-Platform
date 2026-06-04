import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Users, 
  FileText, 
  Calendar, 
  Mail, 
  Search, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Star, 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  Info, 
  Clock, 
  Building, 
  MapPin, 
  Send, 
  Loader2, 
  ArrowRight,
  Sparkle
} from 'lucide-react';
import { Job, Candidate, AIEvaluation, Interview, Message } from './types';

export default function App() {
  // Navigation & View Toggles
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pipeline' | 'candidates' | 'jobs' | 'outreach'>('dashboard');
  
  // Data State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJobIdFilter, setSelectedJobIdFilter] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState('');
  
  // Active selected candidate for detail drawer
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  
  // Modals & Creation States
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  
  // Loading States
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isScreeningLoading, setIsScreeningLoading] = useState(false);
  const [isEmailGenerating, setIsEmailGenerating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Notifications State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // New Job Form State
  const [newJob, setNewJob] = useState({
    title: '',
    department: '',
    location: '',
    type: 'Full-time',
    description: '',
    requirements: '',
    skillsRequired: '',
  });

  // New Candidate Form State
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    currentTitle: '',
    currentCompany: '',
    experienceYears: '0',
    resumeText: '',
    skills: '',
    jobId: '',
  });

  // Interview Schedule Form State
  const [interviewForm, setInterviewForm] = useState({
    title: 'Technical Discussion',
    datetime: '',
    interviewer: '',
    type: 'Virtual' as 'Virtual' | 'In-Person' | 'Phone'
  });

  // Interview Feedback Form State
  const [feedbackForm, setFeedbackForm] = useState<{ [interviewId: string]: { feedback: string; rating: number } }>({});

  // Recruiter Custom Feedback / Notes State
  const [candidateNotes, setCandidateNotes] = useState('');

  // AI Email Composer Workspace state
  const [outreachConfig, setOutreachConfig] = useState({
    candidateId: '',
    jobId: '',
    templateType: 'interview' as 'interview' | 'offer' | 'rejection' | 'followup'
  });
  const [generatedEmail, setGeneratedEmail] = useState<{ subject: string; body: string } | null>(null);

  // Load Initial Data
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setIsInitializing(true);
      const [jobsRes, candidatesRes] = await Promise.all([
        fetch('/api/jobs'),
        fetch('/api/candidates')
      ]);
      
      if (jobsRes.ok && candidatesRes.ok) {
        const jobsData = await jobsRes.json();
        const candidatesData = await candidatesRes.json();
        setJobs(jobsData);
        setCandidates(candidatesData);

        // Pre-fill initial dropdowns
        if (jobsData.length > 0) {
          setNewCandidate(prev => ({ ...prev, jobId: jobsData[0].id }));
          setOutreachConfig(prev => ({ ...prev, jobId: jobsData[0].id }));
        }
        if (candidatesData.length > 0) {
          setOutreachConfig(prev => ({ ...prev, candidateId: candidatesData[0].id }));
        }
      } else {
        showToast('Failed to load recruitment data from platform database.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Offline state or connection failure to ATS server.', 'error');
    } finally {
      setIsInitializing(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Create Job Method
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.title || !newJob.description) {
      showToast('Job Title and Role Description are required.', 'error');
      return;
    }

    try {
      setIsActionLoading(true);
      const reqObj = {
        ...newJob,
        requirements: newJob.requirements.split('\n').filter(r => r.trim() !== ''),
        skillsRequired: newJob.skillsRequired.split(',').map(s => s.trim()).filter(s => s !== '')
      };

      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqObj)
      });

      if (res.ok) {
        const created = await res.json();
        setJobs(prev => [created, ...prev]);
        showToast(`Job posting "${created.title}" successfully opened!`, 'success');
        setShowAddJobModal(false);
        // Reset state
        setNewJob({
          title: '',
          department: '',
          location: '',
          type: 'Full-time',
          description: '',
          requirements: '',
          skillsRequired: '',
        });
      } else {
        const errorData = await res.json();
        showToast(errorData.error || 'Opening job posting failed.', 'error');
      }
    } catch (err) {
      showToast('Failed to connect to job submission API.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Create Candidate Method
  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidate.name || !newCandidate.email || !newCandidate.jobId) {
      showToast('Candidate Name, Email, and associated Job are required.', 'error');
      return;
    }

    try {
      setIsActionLoading(true);
      const reqObj = {
        ...newCandidate,
        skills: newCandidate.skills.split(',').map(s => s.trim()).filter(s => s !== ''),
        experienceYears: parseFloat(newCandidate.experienceYears) || 0
      };

      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqObj)
      });

      if (res.ok) {
        const created = await res.json();
        setCandidates(prev => [created, ...prev]);
        showToast(`Candidate "${created.name}" registered successfully!`, 'success');
        setShowAddCandidateModal(false);
        // Reset state
        setNewCandidate({
          name: '',
          email: '',
          phone: '',
          location: '',
          currentTitle: '',
          currentCompany: '',
          experienceYears: '0',
          resumeText: '',
          skills: '',
          jobId: jobs[0]?.id || '',
        });
      } else {
        const errorData = await res.json();
        showToast(errorData.error || 'Failed to register candidate.', 'error');
      }
    } catch (err) {
      showToast('Failed to connect to candidate submission database.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Deletion helper
  const handleDeleteCandidate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this applicant from the platform?')) return;

    try {
      const res = await fetch(`/api/candidates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCandidates(prev => prev.filter(c => c.id !== id));
        if (selectedCandidate && selectedCandidate.id === id) {
          setSelectedCandidate(null);
        }
        showToast('Applicant removed securely.', 'success');
      } else {
        showToast('Failed to remove applicant.', 'error');
      }
    } catch (e) {
      showToast('Server connection lost.', 'error');
    }
  };

  // AI Pipeline screening generator
  const triggerAIScreening = async (candidateId: string, jobId: string) => {
    try {
      setIsScreeningLoading(true);
      showToast('Analyzing candidate files and mapping core skills via Gemini...', 'info');

      const res = await fetch('/api/screen-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, jobId })
      });

      if (res.ok) {
        const aiEvaluation = await res.json();
        const updatedCandidates = candidates.map(c => {
          if (c.id === candidateId) {
            const updated = { ...c, aiEvaluation, stage: 'Screened' as const };
            if (selectedCandidate && selectedCandidate.id === candidateId) {
              setSelectedCandidate(updated);
            }
            return updated;
          }
          return c;
        });
        setCandidates(updatedCandidates);
        showToast(`AI screening finished! Match Score: ${aiEvaluation.matchScore}%`, 'success');
      } else {
        showToast('Gemini screening engine timed out or is unconfigured.', 'error');
      }
    } catch (err) {
      showToast('Platform network configuration error during screening.', 'error');
    } finally {
      setIsScreeningLoading(false);
    }
  };

  // Direct candidate Notes saving
  const handleSaveNotes = async () => {
    if (!selectedCandidate) return;
    try {
      setIsActionLoading(true);
      const res = await fetch(`/api/candidates/${selectedCandidate.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: candidateNotes })
      });

      if (res.ok) {
        const updated = await res.json();
        setCandidates(prev => prev.map(c => c.id === updated.id ? { ...c, notes: updated.notes } : c));
        setSelectedCandidate(prev => prev ? { ...prev, notes: updated.notes } : null);
        showToast('Recruiter profile commentary updated.', 'success');
      } else {
        showToast('Failed to save commentary notes.', 'error');
      }
    } catch (e) {
      showToast('Database connection failed while saving notes.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Stage updates for Kanban / pipeline dragging
  const handleUpdateStage = async (candidateId: string, newStage: Candidate['stage']) => {
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage })
      });

      if (res.ok) {
        const updated = await res.json();
        setCandidates(prev => prev.map(c => c.id === candidateId ? updated : c));
        if (selectedCandidate && selectedCandidate.id === candidateId) {
          setSelectedCandidate(updated);
        }
        showToast(`Pipeline moved to: ${newStage}`, 'success');
      } else {
        showToast('Pipeline adjustment rejected on server.', 'error');
      }
    } catch (err) {
      showToast('Failed to connect to pipeline database.', 'error');
    }
  };

  // Interview scheduler integration
  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate || !interviewForm.datetime || !interviewForm.interviewer) {
      showToast('All fields are required to log an active interview.', 'error');
      return;
    }

    try {
      setIsActionLoading(true);
      const res = await fetch(`/api/candidates/${selectedCandidate.id}/interviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(interviewForm)
      });

      if (res.ok) {
        const updated = await res.json();
        setCandidates(prev => prev.map(c => c.id === updated.id ? updated : c));
        setSelectedCandidate(updated);
        showToast(`Interview panel scheduled with ${interviewForm.interviewer}!`, 'success');
        
        // Reset schedule form
        setInterviewForm({
          title: 'Technical Discussion',
          datetime: '',
          interviewer: '',
          type: 'Virtual'
        });
      } else {
        showToast('Failed to book panel schedule logs.', 'error');
      }
    } catch (err) {
      showToast('Network error while requesting scheduler database.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Feedback scoring on interviewed candidate
  const handleSaveInterviewFeedback = async (interviewId: string) => {
    if (!selectedCandidate) return;
    const config = feedbackForm[interviewId];
    if (!config || !config.feedback) {
      showToast('Please provide feedback commentary before submitting review.', 'error');
      return;
    }

    try {
      setIsActionLoading(true);
      const res = await fetch(`/api/candidates/${selectedCandidate.id}/interviews/${interviewId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback: config.feedback,
          rating: config.rating,
          status: 'Completed'
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setCandidates(prev => prev.map(c => c.id === updated.id ? updated : c));
        setSelectedCandidate(updated);
        showToast('Interview scores and evaluations successfully logged!', 'success');
      } else {
        showToast('Failed to submit evaluation feedback.', 'error');
      }
    } catch (err) {
      showToast('Unable to connect to interview panel logs.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  // AI Recruiting Outreach Builder Generator
  const generateOutreachEmail = async () => {
    if (!outreachConfig.candidateId || !outreachConfig.jobId) {
      showToast('Select a candidate and reference job to trigger Gemini template AI.', 'error');
      return;
    }

    try {
      setIsEmailGenerating(true);
      setGeneratedEmail(null);
      showToast('Consulting background database & drafting customized message...', 'info');

      const res = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outreachConfig)
      });

      if (res.ok) {
        const draft = await res.json();
        setGeneratedEmail(draft);
        showToast('Customized Gemini draft compiled successfully!', 'success');
      } else {
        showToast('Failed to compile draft via Gemini service.', 'error');
      }
    } catch (err) {
      showToast('Offline outreach generation error.', 'error');
    } finally {
      setIsEmailGenerating(false);
    }
  };

  // Submit/Send email log
  const handleSendEmail = async () => {
    if (!generatedEmail || !outreachConfig.candidateId) return;

    try {
      setIsActionLoading(true);
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: outreachConfig.candidateId,
          subject: generatedEmail.subject,
          body: generatedEmail.body
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCandidates(prev => prev.map(c => c.id === outreachConfig.candidateId ? data.candidate : c));
        if (selectedCandidate && selectedCandidate.id === outreachConfig.candidateId) {
          setSelectedCandidate(data.candidate);
        }
        showToast(`Email successfully delivered & stage automatically coordinated!`, 'success');
        setGeneratedEmail(null);
      } else {
        showToast('Friction recording outreach correspondence.', 'error');
      }
    } catch (err) {
      showToast('Outbox database tracking connection failure.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Setup notes local mirror when active candidate changes
  useEffect(() => {
    if (selectedCandidate) {
      setCandidateNotes(selectedCandidate.notes || '');
    }
  }, [selectedCandidate]);

  // Analytics Computation values
  const totalJobs = jobs.length;
  const activeCandidates = candidates.filter(c => c.stage !== 'Rejected').length;
  const scheduledInterviewsCount = candidates.reduce((acc, c) => {
    const scheduled = c.interviews?.filter(i => i.status === 'Scheduled').length || 0;
    return acc + scheduled;
  }, 0);
  
  const allEvaluations = candidates.map(c => c.aiEvaluation?.matchScore || 0).filter(score => score > 0);
  const avgSkillMatch = allEvaluations.length > 0 
    ? (allEvaluations.reduce((acc, score) => acc + score, 0) / allEvaluations.length).toFixed(1) 
    : '82.4'; // industry benchmark default

  // Determine the candidate with the absolute highest Gemini index
  const spotlightCandidate = candidates
    .filter(c => c.aiEvaluation !== undefined)
    .reduce((best, curr) => {
      if (!best) return curr;
      return (curr.aiEvaluation?.matchScore || 0) > (best.aiEvaluation?.matchScore || 0) ? curr : best;
    }, null as Candidate | null);

  // Search/Filter matching arrays
  const filteredCandidates = candidates.filter(cand => {
    const term = searchTerm.toLowerCase();
    const nameMatch = cand.name.toLowerCase().includes(term);
    const titleMatch = cand.currentTitle.toLowerCase().includes(term);
    const skillMatch = cand.skills.some(s => s.toLowerCase().includes(term));
    const isSearchMatched = nameMatch || titleMatch || skillMatch;

    const isJobMatched = selectedJobIdFilter ? cand.jobId === selectedJobIdFilter : true;
    const isStageMatched = selectedStageFilter ? cand.stage === selectedStageFilter : true;

    return isSearchMatched && isJobMatched && isStageMatched;
  });

  return (
    <div id="frosted-platform-root" className="w-full min-h-screen bg-slate-950 text-slate-100 flex font-sans relative overflow-x-hidden antialiased select-none">
      
      {/* Dynamic Ambient Blur Backdrops */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] LEFT-[-10%] w-[55%] h-[55%] bg-indigo-600/15 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '12s' }}></div>
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[55%] bg-emerald-600/10 rounded-full blur-[160px] animate-pulse" style={{ animationDuration: '16s' }}></div>
        <div className="absolute top-[35%] right-[20%] w-[35%] h-[35%] bg-indigo-500/5 rounded-full blur-[120px]"></div>
      </div>

      {/* Floating System Level Toast Notifications */}
      {toast && (
        <div id="system-toast-panel" className="fixed top-6 right-6 z-50 animate-bounce transition-all">
          <div className={`px-6 py-4 rounded-2xl flex items-center gap-3 backdrop-blur-2xl shadow-2xl border ${
            toast.type === 'success' 
              ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300' 
              : toast.type === 'error'
              ? 'bg-red-950/80 border-red-500/30 text-red-300'
              : 'bg-indigo-950/80 border-indigo-500/40 text-indigo-200'
          }`}>
            <Sparkle className="w-5 h-5 animate-spin" />
            <span className="text-sm font-semibold tracking-wide">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-4 hover:opacity-80 p-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Primary Side Navigation Rail */}
      <aside id="main-navigation-sidebar" className="w-72 min-h-screen bg-white/5 backdrop-blur-2xl border-r border-white/10 flex flex-col justify-between p-7 z-10 shrink-0">
        <div>
          {/* Branded Logo Assembly */}
          <div className="flex items-center gap-3.5 mb-10 mt-2 px-1">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center font-extrabold text-white shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white block">TalentFlow <span className="text-indigo-400 font-extrabold">AI</span></span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">ATS Platform</span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="space-y-2">
            <button 
              id="nav-btn-dashboard"
              onClick={() => { setActiveTab('dashboard'); setSelectedCandidate(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white/10 text-indigo-300 border border-white/10 shadow-inner'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              <span>Recruiter Dashboard</span>
            </button>

            <button 
              id="nav-btn-pipeline"
              onClick={() => { setActiveTab('pipeline'); setSelectedCandidate(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'pipeline'
                  ? 'bg-white/10 text-indigo-300 border border-white/10 shadow-inner'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <span>Hiring Pipeline</span>
            </button>

            <button 
              id="nav-btn-candidates"
              onClick={() => { setActiveTab('candidates'); }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'candidates'
                  ? 'bg-white/10 text-indigo-300 border border-white/10 shadow-inner'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Applicants Directory</span>
            </button>

            <button 
              id="nav-btn-jobs"
              onClick={() => { setActiveTab('jobs'); setSelectedCandidate(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'jobs'
                  ? 'bg-white/10 text-indigo-300 border border-white/10 shadow-inner'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Briefcase className="w-5 h-5" />
              <span>Job Openings</span>
            </button>

            <button 
              id="nav-btn-outreach"
              onClick={() => { setActiveTab('outreach'); setSelectedCandidate(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'outreach'
                  ? 'bg-white/10 text-indigo-300 border border-white/10 shadow-inner'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Mail className="w-5 h-5" />
              <span>AI Outreach Comms</span>
            </button>
          </nav>
        </div>

        {/* AI Capacity indicators */}
        <div className="bg-indigo-950/20 border border-indigo-500/20 p-5 rounded-2xl">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[10px] text-indigo-300 uppercase font-black tracking-wider">Gemini Token Gas</p>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-200 px-1.5 py-0.5 rounded font-mono">100% OK</span>
          </div>
          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 w-[94%]" style={{ transition: 'width 1.5s' }}></div>
          </div>
          <p className="text-[10px] mt-2.5 text-slate-400 leading-normal">Fully connected API key for parsed resume screenings.</p>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <main className="flex-1 min-h-screen flex flex-col p-8 z-10 overflow-x-hidden">
        
        {/* Recruiter Workspace Header */}
        <header className="flex justify-between items-center mb-8 pb-3 border-b border-white/5">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              ATS Recruiter Suite
              <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 font-mono px-2.5 py-1 rounded-full uppercase tracking-widest font-black">ACTIVE PLATFORM</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">Hello, Sarah Jenkins • Managing {totalJobs} active openings and {candidates.length} candidate files</p>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => fetchInitialData()}
              className="lg:flex w-11 h-11 bg-white/5 border border-white/10 rounded-xl items-center justify-center hover:bg-white/10 transition-colors"
              title="Refresh database state"
            >
              <RefreshCw className={`w-4 h-4 text-slate-300 ${isInitializing ? 'animate-spin' : ''}`} />
            </button>
            
            <button 
              onClick={() => setShowAddCandidateModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Import Applicant</span>
            </button>

            <button 
              onClick={() => setShowAddJobModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-emerald-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Open New Job</span>
            </button>

            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-1.5 ml-1">
              <div className="w-7 h-7 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm font-mono">SJ</div>
              <span className="text-xs font-semibold text-slate-200">Sarah Jenkins</span>
            </div>
          </div>
        </header>

        {/* Global Key Metrics Panels Grid (Frosted Glass) */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl relative overflow-hidden group hover:border-indigo-500/30 transition-all">
            <div className="absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:scale-125 transition-transform">
              <Briefcase className="w-24 h-24 text-white" />
            </div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Open Roles</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-white">{totalJobs}</span>
              <span className="text-xs text-indigo-400 font-semibold uppercase tracking-tight">Active Posts</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl relative overflow-hidden group hover:border-indigo-500/30 transition-all">
            <div className="absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:scale-125 transition-transform">
              <Users className="w-24 h-24 text-white" />
            </div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Active Applicants</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-emerald-400">{activeCandidates}</span>
              <span className="text-xs text-emerald-500 font-semibold uppercase tracking-tight">In-Workflow</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-7 rounded-2xl relative overflow-hidden group hover:border-indigo-500/30 transition-all">
            <div className="absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:scale-125 transition-transform">
              <Calendar className="w-24 h-24 text-white" />
            </div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Interviews Scheduled</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-indigo-300">{scheduledInterviewsCount}</span>
              <span className="text-xs text-slate-400 font-normal">Active Panels</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <div className="absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:scale-125 transition-transform">
              <Sparkles className="w-24 h-24 text-white" />
            </div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Average Gemini Match</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-emerald-300">{avgSkillMatch}%</span>
              <span className="text-xs text-emerald-400 font-semibold font-mono">Verified Fit</span>
            </div>
          </div>
        </section>

        {/* 1. VIEW: Dashboard Overview */}
        {activeTab === 'dashboard' && (
          <div id="view-dashboard-panel" className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-fadeIn">
            
            {/* Left/Middle Column (D3 Styled SVGs, Pipelines summary, Recent) */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Real-time recruitment flow dynamics */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-5">
                  <div>
                    <h2 className="font-extrabold text-lg text-white">Daily Application Traffic</h2>
                    <p className="text-xs text-slate-400">Total volume of ingested and parsed resumes this week</p>
                  </div>
                  <span className="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full font-bold">12 New Matches</span>
                </div>

                {/* Custom Glass Visual Grid Graphics */}
                <div className="h-56 flex items-end gap-3.5 pt-6 pb-2 px-1">
                  <div className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <div className="w-full bg-indigo-500/20 h-[38%] rounded-t-lg group-hover:bg-indigo-500/30 transition-all relative">
                      <div className="absolute top-1 left-0 right-0 text-center text-[10px] font-bold text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity">14</div>
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider mt-1">Mon</span>
                  </div>

                  <div className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <div className="w-full bg-indigo-500/20 h-[58%] rounded-t-lg group-hover:bg-indigo-500/30 transition-all relative">
                      <div className="absolute top-1 left-0 right-0 text-center text-[10px] font-bold text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity">22</div>
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider mt-1">Tue</span>
                  </div>

                  <div className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <div className="w-full bg-indigo-500/30 h-[84%] rounded-t-lg group-hover:bg-indigo-500/40 border-t-2 border-indigo-400/50 transition-all relative">
                      <div className="absolute top-1 left-0 right-0 text-center text-[10px] font-bold text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity">36</div>
                    </div>
                    <span className="text-[10px] font-black text-indigo-300 uppercase tracking-wider mt-1">Wed</span>
                  </div>

                  <div className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <div className="w-full bg-indigo-500/20 h-[48%] rounded-t-lg group-hover:bg-indigo-500/30 transition-all relative">
                      <div className="absolute top-1 left-0 right-0 text-center text-[10px] font-bold text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity">19</div>
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider mt-1">Thu</span>
                  </div>

                  <div className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <div className="w-full bg-indigo-500/20 h-[68%] rounded-t-lg group-hover:bg-indigo-500/30 transition-all relative">
                      <div className="absolute top-1 left-0 right-0 text-center text-[10px] font-bold text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity">27</div>
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider mt-1">Fri</span>
                  </div>

                  <div className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <div className="w-full bg-indigo-500/50 h-[92%] rounded-t-lg group-hover:bg-indigo-500/60 border-t-2 border-indigo-400 shadow-lg shadow-indigo-500/20 transition-all relative">
                      <div className="absolute top-1 left-0 right-0 text-center text-[10px] font-bold text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity">42</div>
                    </div>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider mt-1">Today</span>
                  </div>

                  <div className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <div className="w-full bg-indigo-500/25 h-[62%] rounded-t-lg group-hover:bg-indigo-500/35 transition-all relative">
                      <div className="absolute top-1 left-0 right-0 text-center text-[10px] font-bold text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity">24</div>
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider mt-1">Sun</span>
                  </div>
                </div>

                <div className="flex justify-between mt-3 text-[10px] text-slate-500 font-black uppercase tracking-widest border-t border-white/5 pt-3">
                  <span>Week Inception (June 1)</span>
                  <span>Week End (June 7)</span>
                </div>
              </div>

              {/* Incomplete / Core Pipeline Glance */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="font-extrabold text-lg text-white">Live Pipeline Glance</h2>
                    <p className="text-xs text-slate-400">Total volume divided by recruitment stage progression</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('pipeline')}
                    className="text-xs text-indigo-400 font-bold hover:underline flex items-center gap-1"
                  >
                    View Pipeline Board <ArrowRight className="w-3" />
                  </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
                  {(['Applied', 'Screened', 'Interviewing', 'Offered', 'Hired', 'Rejected'] as Candidate['stage'][]).map(stage => {
                    const count = candidates.filter(c => c.stage === stage).length;
                    return (
                      <div key={stage} className="bg-slate-900/40 border border-white/5 p-4 rounded-xl text-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">{stage}</span>
                        <span className="text-xl font-bold block">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column (AI Spotlight & Recent Activity logs) */}
            <div className="space-y-8">
              
              {/* AI Spotlight Section */}
              {spotlightCandidate ? (
                <div className="bg-indigo-950/40 backdrop-blur-2xl border border-indigo-500/30 rounded-2xl p-6 relative group overflow-hidden">
                  <div className="absolute top-0 right-0 bg-indigo-500/20 text-indigo-200 text-[10px] font-black tracking-widest uppercase px-3.5 py-1.5 rounded-bl-xl border-l border-b border-indigo-500/20">
                    ✨ RECOMMENDED MATCH
                  </div>
                  
                  <h2 className="font-extrabold text-slate-200 mt-2 mb-4 flex items-center gap-1.5 text-xs uppercase tracking-widest">
                    <Sparkles className="w-4 h-4 text-indigo-400" /> AI Candidate Spotlight
                  </h2>

                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center font-extrabold text-white text-lg">
                      {spotlightCandidate.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-extrabold text-lg text-white leading-tight">{spotlightCandidate.name}</p>
                      <p className="text-xs text-indigo-300 mt-0.5">{spotlightCandidate.currentTitle} • {spotlightCandidate.currentCompany}</p>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-3.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-400">Match Index Score</span>
                      <span className="text-emerald-400 font-extrabold">{spotlightCandidate.aiEvaluation?.matchScore}% Alignment</span>
                    </div>

                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" style={{ width: `${spotlightCandidate.aiEvaluation?.matchScore || 0}%` }}></div>
                    </div>

                    <p className="text-slate-300 text-xs leading-relaxed italic">
                      &ldquo;{spotlightCandidate.aiEvaluation?.summary.slice(0, 150)}...&rdquo;
                    </p>

                    <div className="pt-3 border-t border-white/5 flex gap-2">
                      <button 
                        onClick={() => {
                          setSelectedCandidate(spotlightCandidate);
                          setActiveTab('candidates');
                        }}
                        className="flex-1 bg-white hover:bg-slate-100 text-indigo-950 py-2 rounded-xl text-xs font-bold transition-colors text-center"
                      >
                        Deep Profile & Prep
                      </button>
                      <button 
                        onClick={() => {
                          setOutreachConfig({
                            candidateId: spotlightCandidate.id,
                            jobId: spotlightCandidate.jobId,
                            templateType: 'interview'
                          });
                          setActiveTab('outreach');
                        }}
                        className="px-3 bg-indigo-500/20 text-indigo-200 border border-indigo-400/20 rounded-xl hover:bg-indigo-500/30 transition-colors"
                        title="Draft Outreach Compose"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-slate-400">
                  <Sparkle className="w-8 h-8 text-indigo-400 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No candidate matches scored yet of note. Complete AI Screen analysis on candidate files to highlight top recruits.</p>
                </div>
              )}

              {/* Recent Activity Log Panel */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="font-extrabold text-slate-200 flex items-center gap-2 text-sm uppercase tracking-widest">
                    <span>Recent Activity logs</span>
                  </h2>
                  <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full font-black animate-pulse">● LIVE</span>
                </div>

                <div className="space-y-4 max-h-[295px] overflow-y-auto pr-1">
                  {candidates.slice(0, 5).map((cand, idx) => {
                    const messageCount = cand.messages?.length || 0;
                    const interviewCount = cand.interviews?.length || 0;
                    
                    return (
                      <div key={cand.id + idx} className="flex gap-3.5 items-start pl-1 border-l-2 border-indigo-500/30 py-1 transition-all hover:border-indigo-400 leading-normal">
                        <div className="w-2 h-2 mt-1.5 bg-indigo-500 rounded-full flex-shrink-0"></div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-200">{cand.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Status shifted: <span className="text-indigo-300">{cand.stage}</span> • {interviewCount} panels • {messageCount} outreaches
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  
                  {candidates.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-4">No logged records to display. Register a new candidate.</p>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* 2. VIEW: Interactive Kanban Hiring Pipeline */}
        {activeTab === 'pipeline' && (
          <div id="view-pipeline-panel" className="flex-1 flex flex-col gap-6 animate-fadeIn">
            <div>
              <h2 className="font-extrabold text-xl text-white">Visual Recruitment Pipeline Board</h2>
              <p className="text-xs text-slate-400">Review, manage, promote, or reject candidate statuses instantly</p>
            </div>

            {/* Kanban Columns Framework */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 flex-1 min-h-[500px]">
              {(['Applied', 'Screened', 'Interviewing', 'Offered', 'Hired', 'Rejected'] as Candidate['stage'][]).map(stage => {
                const columnCandidates = candidates.filter(c => c.stage === stage);
                
                return (
                  <div key={stage} className="bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-col gap-3 min-h-[300px]">
                    <div className="flex justify-between items-center px-2 py-1 bg-white/5 rounded-lg border border-white/5 mb-1 text-xs">
                      <span className="font-black text-[10px] tracking-wider uppercase text-indigo-300">{stage}</span>
                      <span className="bg-indigo-500/20 text-indigo-200 px-2 py-0.5 rounded-full font-bold">{columnCandidates.length}</span>
                    </div>

                    <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[600px] pr-0.5">
                      {columnCandidates.map(cand => {
                        const score = cand.aiEvaluation?.matchScore;
                        return (
                          <div 
                            key={cand.id} 
                            onClick={() => {
                              setSelectedCandidate(cand);
                              setActiveTab('candidates');
                            }}
                            className="p-3.5 bg-slate-900/60 border border-white/10 rounded-xl hover:border-indigo-500/30 hover:bg-slate-900 transition-all cursor-pointer group relative"
                          >
                            <div className="flex justify-between items-start mb-1.5">
                              <p className="font-bold text-xs text-white leading-tight group-hover:text-indigo-300 transition-colors">{cand.name}</p>
                              {score !== undefined ? (
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded font-mono ${
                                  score >= 80 ? 'bg-emerald-500/20 text-emerald-300' :
                                  score >= 55 ? 'bg-amber-500/20 text-amber-300' :
                                  'bg-red-500/20 text-red-300'
                                }`}>
                                  {score}%
                                </span>
                              ) : (
                                <span className="text-[9px] bg-indigo-500/15 text-indigo-200 px-1 py-0.5 rounded">Raw</span>
                              )}
                            </div>
                            
                            <p className="text-[10px] text-slate-400 truncate mb-2">{cand.currentTitle || 'Applicant'}</p>
                            
                            {/* Fast stage actions directly on board card */}
                            <div className="flex justify-between items-center pt-2 border-t border-white/5">
                              <span className="text-[9px] text-slate-500 font-mono">Move Stage:</span>
                              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                {stage !== 'Rejected' && (
                                  <button 
                                    onClick={() => handleUpdateStage(cand.id, 'Rejected')}
                                    className="p-1 bg-red-950/40 hover:bg-red-900 border border-red-500/20 rounded text-[9px] text-red-200"
                                    title="Reject Candidate"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                )}
                                
                                {stage === 'Applied' && (
                                  <button 
                                    onClick={() => triggerAIScreening(cand.id, cand.jobId)}
                                    className="px-1.5 py-0.5 bg-indigo-500/10 hover:bg-indigo-500 border border-indigo-400/30 text-indigo-100 rounded text-[9px] font-bold flex items-center gap-0.5 animate-pulse"
                                    title="Trigger AI Assessment"
                                  >
                                    <Sparkles className="w-2 h-2" /> Screen
                                  </button>
                                )}

                                {stage === 'Screened' && (
                                  <button 
                                    onClick={() => handleUpdateStage(cand.id, 'Interviewing')}
                                    className="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[9px] font-bold"
                                  >
                                    Interview
                                  </button>
                                )}

                                {stage === 'Interviewing' && (
                                  <button 
                                    onClick={() => handleUpdateStage(cand.id, 'Offered')}
                                    className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[9px] font-bold"
                                  >
                                    Offer
                                  </button>
                                )}

                                {stage === 'Offered' && (
                                  <button 
                                    onClick={() => handleUpdateStage(cand.id, 'Hired')}
                                    className="px-1.5 py-0.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded text-[9px] font-extrabold"
                                  >
                                    Hire
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {columnCandidates.length === 0 && (
                        <div className="py-6 border border-dashed border-white/5 rounded-xl text-center">
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Empty Segment</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. VIEW: Applicants Directory + Detail Panel Workspace */}
        {activeTab === 'candidates' && (
          <div id="view-applicants-panel" className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-fadeIn">
            
            {/* Left side: Directory Listings with Filter toolbar */}
            <div className="lg:col-span-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <h2 className="font-extrabold text-lg text-white">Candidates Directory</h2>
                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-bold">{filteredCandidates.length} Listed</span>
              </div>

              {/* Filtering Toolbar */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input 
                    type="text" 
                    placeholder="Search candidate, role, skill..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select 
                    value={selectedJobIdFilter}
                    onChange={(e) => setSelectedJobIdFilter(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-xl px-2 py-2 text-[11px] text-slate-300 focus:outline-none"
                  >
                    <option value="">All Jobs</option>
                    {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                  </select>

                  <select 
                    value={selectedStageFilter}
                    onChange={(e) => setSelectedStageFilter(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-xl px-2 py-2 text-[11px] text-slate-300 focus:outline-none"
                  >
                    <option value="">All Stages</option>
                    {['Applied', 'Screened', 'Interviewing', 'Offered', 'Hired', 'Rejected'].map(stg => (
                      <option key={stg} value={stg}>{stg}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Directory Scroller Container */}
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredCandidates.map(cand => {
                  const job = jobs.find(j => j.id === cand.jobId);
                  const isCurSelected = selectedCandidate && selectedCandidate.id === cand.id;
                  const matchScore = cand.aiEvaluation?.matchScore;
                  
                  return (
                    <div 
                      key={cand.id}
                      onClick={() => setSelectedCandidate(cand)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                        isCurSelected 
                          ? 'bg-indigo-600/20 border-indigo-500/40 shadow-inner' 
                          : 'bg-slate-900/40 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <p className="font-extrabold text-xs text-white block truncate w-32">{cand.name}</p>
                        <div className="flex gap-1.5">
                          {matchScore !== undefined && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                              matchScore >= 80 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-indigo-500/20 text-slate-300'
                            }`}>
                              AI {matchScore}%
                            </span>
                          )}
                          <span className="text-[9px] bg-white/5 text-slate-400 px-1.5 py-0.5 rounded">
                            {cand.stage}
                          </span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 leading-tight">
                        <p className="font-medium text-slate-200">{cand.currentTitle} <span className="text-slate-500">at</span> {cand.currentCompany}</p>
                        <p className="text-[9px] text-indigo-300 mt-1 truncate max-w-xs">{job ? job.title : 'General Entry'}</p>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-white/5 text-[9px] text-slate-500">
                        <span>XP: {cand.experienceYears} yrs</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={(e) => handleDeleteCandidate(cand.id, e)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredCandidates.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-8">No applicants found matching filter conditions.</p>
                )}
              </div>
            </div>

            {/* Right side: Detailed Candidate evaluation view splits (2 Cols) */}
            <div className="lg:col-span-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 minimal-highlgihts relative">
              {selectedCandidate ? (
                <div className="space-y-6 max-h-[700px] overflow-y-auto pr-2">
                  
                  {/* Top Candidate Profile Bio Row */}
                  <div className="flex justify-between items-start border-b border-white/5 pb-5">
                    <div className="flex gap-4 items-center">
                      <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 rounded-2xl flex items-center justify-center font-extrabold text-white text-xl shadow-lg">
                        {selectedCandidate.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xl font-extrabold text-white leading-tight">{selectedCandidate.name}</h3>
                        <p className="text-xs text-slate-300 mt-1">{selectedCandidate.currentTitle} • <span className="text-indigo-400 font-semibold">{selectedCandidate.currentCompany}</span></p>
                        <div className="flex gap-4 flex-wrap mt-2.5 text-[10px] text-slate-400 uppercase font-bold tracking-widest leading-none">
                          <span className="flex items-center gap-1"><MapPin className="w-3" /> {selectedCandidate.location || 'N/A'}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3" /> {selectedCandidate.experienceYears} Years Practiced</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 text-right">
                      <span className="text-[10px] text-slate-500 uppercase font-black">Status Stage</span>
                      <select 
                        value={selectedCandidate.stage}
                        onChange={(e) => handleUpdateStage(selectedCandidate.id, e.target.value as any)}
                        className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-indigo-300 font-bold focus:outline-none"
                      >
                        {['Applied', 'Screened', 'Interviewing', 'Offered', 'Hired', 'Rejected'].map(std => (
                          <option key={std} value={std}>{std}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Split Panel Block for Original CV and AI evaluation outputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Column 1: Candidate file data, Matched Skills list */}
                    <div className="space-y-6">
                      
                      {/* Skills Cloud mapping */}
                      <div>
                        <h4 className="text-xs text-slate-400 uppercase tracking-widest font-black mb-2.5">Skills Alignment Portfolio</h4>
                        <div className="flex flex-wrap gap-1.5 focus-mode-skills">
                          {selectedCandidate.skills.map(sk => {
                            const job = jobs.find(j => j.id === selectedCandidate.jobId);
                            const isRequestedSkill = job?.skillsRequired.includes(sk);
                            return (
                              <span 
                                key={sk}
                                className={`text-[10px] px-2.5 py-1 rounded-lg font-bold tracking-tight border ${
                                  isRequestedSkill 
                                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                                    : 'bg-white/5 border-white/5 text-slate-300'
                                }`}
                              >
                                {sk}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Expandable Original Resume text block */}
                      <div className="bg-slate-900/60 p-4 border border-white/5 rounded-xl">
                        <h4 className="text-xs text-slate-400 font-black uppercase tracking-widest mb-2 flex justify-between items-center">
                          <span>Ingested original profile details</span>
                          <span className="text-[9px] px-1.5 bg-indigo-500/10 text-indigo-300 rounded font-bold font-mono uppercase">CV Parser</span>
                        </h4>
                        <div className="max-h-56 overflow-y-auto text-slate-300 text-xs font-serif leading-relaxed select-text whitespace-pre-line bg-slate-950/40 p-3 rounded-lg">
                          {selectedCandidate.resumeText || "No file content scanned. You can input manual resume text under the register applicants screen."}
                        </div>
                      </div>

                      {/* Recruiter Custom Feedback / Notes form */}
                      <div className="bg-slate-900/60 p-4 border border-white/5 rounded-xl space-y-3">
                        <h4 className="text-xs text-slate-400 font-black uppercase tracking-widest">Recruiter Commentary Notes</h4>
                        <textarea 
                          rows={3} 
                          placeholder="Log notes about this applicant during review..."
                          value={candidateNotes}
                          onChange={(e) => setCandidateNotes(e.target.value)}
                          className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                        />
                        <button 
                          onClick={handleSaveNotes}
                          disabled={isActionLoading}
                          className="w-full bg-indigo-500/20 hover:bg-indigo-600 border border-indigo-500/35 hover:text-white text-indigo-300 text-[11px] font-bold py-2 rounded-xl transition-all"
                        >
                          {isActionLoading ? 'Saving Commentary...' : 'Update Internal Notes'}
                        </button>
                      </div>

                    </div>

                    {/* Column 2: Gemini AI Screen Diagnostics Suite */}
                    <div className="space-y-6">
                      
                      {/* Top Rank gauge */}
                      <div className="bg-gradient-to-br from-indigo-950/50 via-slate-900/40 to-emerald-950/30 border border-indigo-500/20 rounded-2xl p-5 relative overflow-hidden">
                        
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Gemini Assessment index</span>
                          <button 
                            onClick={() => triggerAIScreening(selectedCandidate.id, selectedCandidate.jobId)}
                            disabled={isScreeningLoading}
                            className="bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold text-[9px] px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm transition-all uppercase"
                          >
                            {isScreeningLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />}
                            <span>Re-screen CV</span>
                          </button>
                        </div>

                        {selectedCandidate.aiEvaluation ? (
                          <div className="space-y-4">
                            
                            {/* Alignment Gauge display */}
                            <div className="flex items-center gap-4">
                              <div className="relative w-20 h-20 shrink-0 flex items-center justify-center bg-slate-950/80 border border-white/10 rounded-full">
                                <div className="absolute inset-2 rounded-full border-2 border-indigo-500/20 flex items-center justify-center font-serif">
                                  <span className="text-xl font-black text-emerald-400">{selectedCandidate.aiEvaluation.matchScore}%</span>
                                </div>
                                <svg className="w-full h-full rotate-[-90deg]">
                                  <circle 
                                    cx="40" 
                                    cy="40" 
                                    r="34" 
                                    fill="transparent" 
                                    stroke="#10b981" 
                                    strokeWidth="4" 
                                    strokeDasharray={`${2 * Math.PI * 34}`}
                                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - selectedCandidate.aiEvaluation.matchScore / 100)}`}
                                    className="transition-all duration-1000"
                                  />
                                </svg>
                              </div>

                              <div className="space-y-1">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border inline-block ${
                                  selectedCandidate.aiEvaluation.recommendation === 'Strong Hire' ? 'bg-emerald-950 border-emerald-500/40 text-emerald-300' :
                                  selectedCandidate.aiEvaluation.recommendation === 'Hire' ? 'bg-indigo-950 border-indigo-500/40 text-indigo-300' :
                                  selectedCandidate.aiEvaluation.recommendation === 'Neutral' ? 'bg-amber-950 border-amber-500/40 text-amber-300' :
                                  'bg-red-950 border-red-500/40 text-red-300'
                                }`}>
                                  {selectedCandidate.aiEvaluation.recommendation}
                                </span>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{selectedCandidate.aiEvaluation.experienceFit}</p>
                              </div>
                            </div>

                            {/* Summary Text */}
                            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-white/5 font-sans">
                              {selectedCandidate.aiEvaluation.summary}
                            </p>

                            {/* Pros & Cons list */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px]">
                              <div>
                                <h5 className="font-bold text-emerald-400 uppercase tracking-wide text-[9px] mb-1 leading-none">Standout Pros</h5>
                                <ul className="space-y-1 list-none pl-0">
                                  {selectedCandidate.aiEvaluation.pros.map((p, idx) => (
                                    <li key={idx} className="text-slate-300 truncate font-sans leading-tight flex gap-1 items-start">
                                      <span className="text-emerald-500 font-black">•</span> {p}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div>
                                <h5 className="font-bold text-slate-400 uppercase tracking-wide text-[9px] mb-1 leading-none">Identified Liabilities</h5>
                                <ul className="space-y-1 list-none pl-0">
                                  {selectedCandidate.aiEvaluation.cons.map((c, idx) => (
                                    <li key={idx} className="text-slate-300 truncate font-sans leading-tight flex gap-1 items-start">
                                      <span className="text-slate-500 font-black">•</span> {c}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            {/* Prep interview questions */}
                            <div className="pt-2">
                              <h5 className="font-extrabold text-[10px] text-indigo-300 uppercase tracking-wider mb-1.5">Custom Interview Preps Questions</h5>
                              <div className="space-y-1.5">
                                {selectedCandidate.aiEvaluation.interviewQuestions.map((q, idx) => (
                                  <div key={idx} className="bg-slate-950/50 p-2 border border-indigo-500/10 rounded text-[10px] text-slate-300 italic leading-snug">
                                    &ldquo;{q}&rdquo;
                                  </div>
                                ))}
                              </div>
                            </div>

                          </div>
                        ) : (
                          <div className="py-10 text-center space-y-4">
                            <Sparkle className="w-8 h-8 text-indigo-400/50 mx-auto animate-pulse" />
                            <div>
                              <p className="text-xs font-bold text-slate-300">Evaluate with Gemini AI</p>
                              <p className="text-[10px] text-slate-500 max-w-xs mx-auto leading-normal mt-1">Screen parsed profile files against requested job specs to review custom match ratings, highlights, and question grids.</p>
                            </div>
                            <button 
                              onClick={() => triggerAIScreening(selectedCandidate.id, selectedCandidate.jobId)}
                              disabled={isScreeningLoading}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30"
                            >
                              {isScreeningLoading ? 'Refining Index...' : 'Simulate screening Analysis'}
                            </button>
                          </div>
                        )}

                      </div>

                    </div>

                  </div>

                  {/* Panel Sections for Scheduled Interviews & Correspondence history */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t border-white/5">
                    
                    {/* Schedule manager / Feedback tracker */}
                    <div className="space-y-4">
                      
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs text-slate-400 uppercase tracking-widest font-black">Interviews Panel Logs</h4>
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded font-mono font-bold">1-5 Rating Metric</span>
                      </div>

                      {/* Schedule interactive form */}
                      <form onSubmit={handleScheduleInterview} className="bg-slate-950/40 p-4 border border-white/15 rounded-xl space-y-3">
                        <p className="text-[10px] font-black uppercase text-indigo-300 leading-none">Schedule Active Panel Session</p>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] text-slate-500 font-bold uppercase">Format Title</label>
                            <input 
                              type="text" 
                              value={interviewForm.title}
                              onChange={(e) => setInterviewForm(prev => ({ ...prev, title: e.target.value }))}
                              className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] text-slate-500 font-bold uppercase">Panelist / Interviewer</label>
                            <input 
                              type="text" 
                              placeholder="Harlan Cooper"
                              value={interviewForm.interviewer}
                              onChange={(e) => setInterviewForm(prev => ({ ...prev, interviewer: e.target.value }))}
                              className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs focus:outline-none placeholder-slate-600"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] text-slate-500 font-bold uppercase">Target Date-Time</label>
                            <input 
                              type="datetime-local" 
                              value={interviewForm.datetime}
                              onChange={(e) => setInterviewForm(prev => ({ ...prev, datetime: e.target.value }))}
                              className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] focus:outline-none"
                            />
                          </div>

                          <div className="flex flex-col gap-1 font-sans">
                            <label className="text-[9px] text-slate-500 font-bold uppercase">Interview Style</label>
                            <select 
                              value={interviewForm.type}
                              onChange={(e) => setInterviewForm(prev => ({ ...prev, type: e.target.value as any }))}
                              className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                            >
                              <option value="Virtual">Virtual Channel</option>
                              <option value="In-Person">In-Person</option>
                              <option value="Phone">Direct Phone Call</option>
                            </select>
                          </div>
                        </div>

                        <button 
                          type="submit" 
                          disabled={isActionLoading}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold py-2 rounded-xl transition-all shadow shadow-emerald-600/20"
                        >
                          Book Panel & Update Candidate
                        </button>
                      </form>

                      {/* Interview list with rating feedback triggers */}
                      <div className="space-y-3.5 max-h-56 overflow-y-auto pr-1">
                        {selectedCandidate.interviews && selectedCandidate.interviews.map((int) => {
                          const isSch = int.status === 'Scheduled';
                          const feedbackConf = feedbackForm[int.id] || { feedback: '', rating: 4 };

                          return (
                            <div key={int.id} className="bg-slate-900/60 p-3.5 border border-white/5 rounded-xl space-y-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-slate-100 font-extrabold text-xs block">{int.title}</span>
                                  <span className="text-[10px] text-slate-400 mt-0.5">{int.interviewer} ({int.type})</span>
                                </div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                  isSch ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'
                                }`}>
                                  {int.status}
                                </span>
                              </div>

                              <div className="text-[10px] text-slate-400 border-t border-white/5 pt-2">
                                <span className="font-semibold block text-slate-300">Format Time: {new Date(int.datetime).toLocaleString()}</span>
                              </div>

                              {isSch ? (
                                <div className="space-y-2 pt-2 border-t border-white/5">
                                  <p className="text-[9px] font-bold uppercase text-indigo-300 leading-none">Log evaluation & score candidate</p>
                                  <textarea 
                                    rows={2}
                                    placeholder="Enter evaluation criteria/feedback..."
                                    value={feedbackConf.feedback}
                                    onChange={(e) => setFeedbackForm(prev => ({
                                      ...prev,
                                      [int.id]: { ...(prev[int.id] || { rating: 4 }), feedback: e.target.value }
                                    }))}
                                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs focus:outline-none"
                                  />
                                  
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9px] text-slate-400">Score Rating:</span>
                                      {[1, 2, 3, 4, 5].map((stars) => (
                                        <button 
                                          key={stars}
                                          type="button"
                                          onClick={() => setFeedbackForm(prev => ({
                                            ...prev,
                                            [int.id]: { ...(prev[int.id] || { feedback: '' }), rating: stars }
                                          }))}
                                          className="text-slate-500 hover:text-amber-400"
                                        >
                                          <Star className={`w-3.5 h-3.5 ${feedbackConf.rating >= stars ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                                        </button>
                                      ))}
                                    </div>

                                    <button 
                                      onClick={() => handleSaveInterviewFeedback(int.id)}
                                      className="bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold text-white px-3 py-1 rounded-lg"
                                    >
                                      Complete & Save Feedbacks
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5 text-[11px] leading-relaxed text-slate-300">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-wide">Recruiter Assessment</span>
                                    <div className="flex">
                                      {Array.from({ length: int.rating || 3 }).map((_, i) => (
                                        <Star key={i} className="w-3 h-3 text-amber-500 fill-amber-500" />
                                      ))}
                                    </div>
                                  </div>
                                  <p className="italic">&ldquo;{int.feedback}&rdquo;</p>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {(!selectedCandidate.interviews || selectedCandidate.interviews.length === 0) && (
                          <p className="text-xs text-slate-500 text-center py-4 bg-slate-900/20 rounded-xl">No interviews recorded for this candidate file yet.</p>
                        )}
                      </div>

                    </div>

                    {/* Correspondence sequence log */}
                    <div className="space-y-4">
                      
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs text-slate-400 uppercase tracking-widest font-black">Recruitment Correspondence Log</h4>
                        <button 
                          onClick={() => {
                            setOutreachConfig({
                              candidateId: selectedCandidate.id,
                              jobId: selectedCandidate.jobId,
                              templateType: 'interview'
                            });
                            setActiveTab('outreach');
                          }}
                          className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1 font-bold"
                        >
                          Outreach Composer <ArrowRight className="w-3" />
                        </button>
                      </div>

                      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                        {selectedCandidate.messages && selectedCandidate.messages.map((msg) => (
                          <div key={msg.id} className="bg-slate-900/60 p-3.5 border border-white/5 rounded-xl space-y-2">
                            <div className="flex justify-between items-start">
                              <span className="font-extrabold text-xs text-indigo-200 block truncate w-36">{msg.subject}</span>
                              <span className="text-[8px] bg-white/5 text-slate-400 px-2 py-0.5 rounded font-mono">
                                {new Date(msg.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-300 leading-relaxed whitespace-pre-wrap font-serif bg-slate-950/40 p-2.5 rounded border border-white/5">
                              {msg.body}
                            </p>
                          </div>
                        ))}

                        {(!selectedCandidate.messages || selectedCandidate.messages.length === 0) && (
                          <div className="py-8 text-center text-slate-500 border border-dashed border-white/5 rounded-xl">
                            <Mail className="w-5 h-5 mx-auto mb-1 text-slate-600" />
                            <p className="text-xs">No correspondence metrics registered. Draft custom outreach templates under outbox composer.</p>
                          </div>
                        )}
                      </div>

                    </div>

                  </div>

                </div>
              ) : (
                <div className="py-24 text-center max-w-sm mx-auto space-y-4">
                  <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto text-indigo-300">
                    <Users className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-300 text-lg">No applicant selected</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-normal">Pick an active recruiting file from the applicants directory side list to audit detailed parsing, evaluations, and message timelines.</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* 4. VIEW: Active Jobs Openings List */}
        {activeTab === 'jobs' && (
          <div id="view-jobs-panel" className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-extrabold text-xl text-white">Active Recruitment Openings</h2>
                <p className="text-xs text-slate-400">Manage organizational skill sets criteria and required credentials listings</p>
              </div>
              <button 
                onClick={() => setShowAddJobModal(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Import New Posting
              </button>
            </div>

            {/* Jobs card listings layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {jobs.map(job => {
                const jobCandidates = candidates.filter(c => c.jobId === job.id);
                return (
                  <div key={job.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-indigo-500/30 transition-all flex flex-col justify-between gap-5 text-left">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-400/25 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                          {job.department}
                        </span>
                        <span className="text-[10px] text-slate-500 block font-bold font-mono uppercase">{job.type}</span>
                      </div>

                      <div>
                        <h4 className="font-bold text-lg text-white leading-tight">{job.title}</h4>
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 text-slate-500" /> {job.location}
                        </p>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed max-h-24 overflow-y-auto pr-1">
                        {job.description}
                      </p>

                      <div className="space-y-1.5 pt-2">
                        <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest block">Essential Skill Criteria Matrix</span>
                        <div className="flex flex-wrap gap-1">
                          {job.skillsRequired.map(sk => (
                            <span key={sk} className="bg-white/5 border border-white/5 px-2 py-0.5 rounded text-[10px] text-slate-300 font-medium">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>

                    </div>

                    <div className="flex justify-between items-center border-t border-white/5 pt-4 text-xs font-semibold leading-none">
                      <span className="text-slate-400">{jobCandidates.length} Active Candidates</span>
                      <button 
                        onClick={() => {
                          setSelectedJobIdFilter(job.id);
                          setActiveTab('candidates');
                        }}
                        className="text-indigo-400 hover:underline flex items-center gap-1 font-bold"
                      >
                        Explore applicants <ChevronRight className="w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. VIEW: AI Recruiting Outreach Composer */}
        {activeTab === 'outreach' && (
          <div id="view-comms-panel" className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-fadeIn">
            
            {/* Outreach Parameter forms */}
            <div className="lg:col-span-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col gap-5">
              <div>
                <h2 className="font-extrabold text-lg text-white flex items-center gap-1.5">
                  <Mail className="w-5 h-5 text-indigo-400" /> AI Outreach Director
                </h2>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-bold">Synthesize Outreach Drafts</p>
              </div>

              <div className="space-y-4">
                
                {/* Choose recipient */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Select Target Applicant</label>
                  <select 
                    value={outreachConfig.candidateId}
                    onChange={(e) => {
                      const cand = candidates.find(c => c.id === e.target.value);
                      setOutreachConfig(prev => ({ 
                        ...prev, 
                        candidateId: e.target.value,
                        jobId: cand ? cand.jobId : prev.jobId
                      }));
                      setGeneratedEmail(null);
                    }}
                    className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none"
                  >
                    <option value="">-- Choose Candidate --</option>
                    {candidates.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.currentTitle})</option>
                    ))}
                  </select>
                </div>

                {/* Choose Job referenced */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Associated Job Context</label>
                  <select 
                    value={outreachConfig.jobId}
                    onChange={(e) => {
                      setOutreachConfig(prev => ({ ...prev, jobId: e.target.value }));
                      setGeneratedEmail(null);
                    }}
                    className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none"
                  >
                    <option value="">-- Choose Reference Job --</option>
                    {jobs.map(j => (
                      <option key={j.id} value={j.id}>{j.title}</option>
                    ))}
                  </select>
                </div>

                {/* Template Goals */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-slate-400 font-bold uppercase block">Outreach Campaign Goal</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { id: 'interview', label: 'Interview Invitation' },
                      { id: 'offer', label: 'Offer Letter' },
                      { id: 'rejection', label: 'Rejection/Feedback' },
                      { id: 'followup', label: 'Follow-Up Sequence' }
                    ] as const).map(opt => (
                      <button 
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setOutreachConfig(prev => ({ ...prev, templateType: opt.id }));
                          setGeneratedEmail(null);
                        }}
                        className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                          outreachConfig.templateType === opt.id
                            ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-200'
                            : 'bg-slate-900/40 border-white/5 hover:border-white/10 text-slate-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3">
                  <button 
                    onClick={generateOutreachEmail}
                    disabled={isEmailGenerating}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30"
                  >
                    {isEmailGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Compiling custom copy via Gemini...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Compile Custom outreach with Gemini</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            </div>

            {/* Interactive outreach preview envelope (2 Cols) */}
            <div className="lg:col-span-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col justify-between min-h-[500px]">
              
              {generatedEmail ? (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  
                  {/* Subject lines and body outputs with custom editable wrappers */}
                  <div className="space-y-4 flex-1">
                    <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest leading-none">Recruiter Composition Draft Workspace</p>
                    
                    <div className="space-y-3 select-text bg-slate-900/60 p-5 rounded-2xl border border-white/5">
                      <div className="flex flex-col gap-1 border-b border-white/5 pb-3">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Subject Header Line</span>
                        <input 
                          type="text" 
                          value={generatedEmail.subject}
                          onChange={(e) => setGeneratedEmail(prev => prev ? { ...prev, subject: e.target.value } : null)}
                          className="bg-transparent font-extrabold text-white text-sm focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-col gap-1 pt-2">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Compose message Body</span>
                        <textarea 
                          rows={11}
                          value={generatedEmail.body}
                          onChange={(e) => setGeneratedEmail(prev => prev ? { ...prev, body: e.target.value } : null)}
                          className="bg-transparent text-xs text-slate-200 leading-relaxed font-serif whitespace-pre-wrap focus:outline-none resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-white/5 pt-4">
                    <p className="text-[10px] text-slate-500 max-w-sm leading-normal">Confirming outreach updates target stage, and writes messages immediately into applicant logs.</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setGeneratedEmail(null)}
                        className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-xs"
                      >
                        Discard
                      </button>
                      <button 
                        onClick={handleSendEmail}
                        disabled={isActionLoading}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow"
                      >
                        <Send className="w-3.5 h-3.5" /> Send Outreach Sequence
                      </button>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="my-auto text-center max-w-xs mx-auto space-y-4 py-16">
                  <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto text-indigo-300">
                    <Mail className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-300 text-lg">Envelope Draft Workspace</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-normal">Tune recruitment parameters on the left panel, and click compile to compose professional custom candidate campaigns.</p>
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

      </main>

      {/* MODAL: Import Candidate Scans */}
      {showAddCandidateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div id="import-applicant-modal" className="bg-slate-900/90 border border-white/10 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative animate-fadeIn">
            <button 
              onClick={() => setShowAddCandidateModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-xl font-extrabold text-white">Import Candidate Scans</h3>
              <p className="text-xs text-slate-400">Scrapes text parameters into recruitment database files</p>
            </div>

            <form onSubmit={handleCreateCandidate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Applicant Full Name</label>
                  <input 
                    type="text" 
                    placeholder="Maya Patel"
                    value={newCandidate.name}
                    onChange={(e) => setNewCandidate(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none placeholder-slate-600"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Email Address</label>
                  <input 
                    type="email" 
                    placeholder="maya@datascience.io"
                    value={newCandidate.email}
                    onChange={(e) => setNewCandidate(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none placeholder-slate-600"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Contact Number</label>
                  <input 
                    type="text" 
                    placeholder="+1 (555) 902-1249"
                    value={newCandidate.phone}
                    onChange={(e) => setNewCandidate(prev => ({ ...prev, phone: e.target.value }))}
                    className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none placeholder-slate-600"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Location City</label>
                  <input 
                    type="text" 
                    placeholder="New York, NY"
                    value={newCandidate.location}
                    onChange={(e) => setNewCandidate(prev => ({ ...prev, location: e.target.value }))}
                    className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none placeholder-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Current Title</label>
                  <input 
                    type="text" 
                    placeholder="AI Specialist"
                    value={newCandidate.currentTitle}
                    onChange={(e) => setNewCandidate(prev => ({ ...prev, currentTitle: e.target.value }))}
                    className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none placeholder-slate-600"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Current Firm</label>
                  <input 
                    type="text" 
                    placeholder="Columbia NLP Lab"
                    value={newCandidate.currentCompany}
                    onChange={(e) => setNewCandidate(prev => ({ ...prev, currentCompany: e.target.value }))}
                    className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none placeholder-slate-600"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">XP (Years)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    placeholder="4.0"
                    value={newCandidate.experienceYears}
                    onChange={(e) => setNewCandidate(prev => ({ ...prev, experienceYears: e.target.value }))}
                    className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none placeholder-slate-600"
                  />
                </div>
              </div>

              {/* Tag definitions */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Target Position Context</label>
                  <select 
                    value={newCandidate.jobId}
                    onChange={(e) => setNewCandidate(prev => ({ ...prev, jobId: e.target.value }))}
                    className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
                    required
                  >
                    <option value="">-- Associate to Open Post --</option>
                    {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Skills (comma separated)</label>
                  <input 
                    type="text" 
                    placeholder="Python, PyTorch, Transformers, NLP"
                    value={newCandidate.skills}
                    onChange={(e) => setNewCandidate(prev => ({ ...prev, skills: e.target.value }))}
                    className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none placeholder-slate-600"
                  />
                </div>
              </div>

              {/* Raw parsed body copy */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Resume Parsing Body Text</label>
                <textarea 
                  rows={4} 
                  placeholder="Paste CV text coordinates or experience breakdowns here block-by-block..."
                  value={newCandidate.resumeText}
                  onChange={(e) => setNewCandidate(prev => ({ ...prev, resumeText: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none placeholder-slate-600"
                />
              </div>

              <button 
                type="submit"
                disabled={isActionLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-2xl text-xs transition-all shadow-md shadow-indigo-600/30"
              >
                {isActionLoading ? 'Inserting applicant database...' : 'Ingest applicant details'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Open New Job posting */}
      {showAddJobModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div id="add-job-post-modal" className="bg-slate-900/90 border border-white/10 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative">
            <button 
              onClick={() => setShowAddJobModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-xl font-extrabold text-white">Open New Job Posting</h3>
              <p className="text-xs text-slate-400">Specifies standard criteria constraints for candidates search grids</p>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-4 font-sans">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Positonal Title</label>
                  <input 
                    type="text" 
                    placeholder="Machine Learning Scientist"
                    value={newJob.title}
                    onChange={(e) => setNewJob(prev => ({ ...prev, title: e.target.value }))}
                    className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none placeholder-slate-600"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Target Department</label>
                  <input 
                    type="text" 
                    placeholder="AI Research"
                    value={newJob.department}
                    onChange={(e) => setNewJob(prev => ({ ...prev, department: e.target.value }))}
                    className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none placeholder-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Job Location</label>
                  <input 
                    type="text" 
                    placeholder="Denver, CO (Hybrid) or Remote"
                    value={newJob.location}
                    onChange={(e) => setNewJob(prev => ({ ...prev, location: e.target.value }))}
                    className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none placeholder-slate-600"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Job Hours / Type</label>
                  <select 
                    value={newJob.type}
                    onChange={(e) => setNewJob(prev => ({ ...prev, type: e.target.value }))}
                    className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Role Description Summary</label>
                <textarea 
                  rows={2} 
                  placeholder="Summarize the core day to day projects of this team..."
                  value={newJob.description}
                  onChange={(e) => setNewJob(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none placeholder-slate-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Skills Matrix criteria (comma separated)</label>
                  <input 
                    type="text" 
                    placeholder="Python, PyTorch, NLP, Transformers"
                    value={newJob.skillsRequired}
                    onChange={(e) => setNewJob(prev => ({ ...prev, skillsRequired: e.target.value }))}
                    className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none placeholder-slate-600"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Requirement Bullet lines (newline separated)</label>
                  <textarea 
                    rows={2} 
                    placeholder="Solid proficiency with PyTorch&#10;ML degree is highly preferred..."
                    value={newJob.requirements}
                    onChange={(e) => setNewJob(prev => ({ ...prev, requirements: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none placeholder-slate-600"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isActionLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-2xl text-xs transition-colors shadow-md shadow-emerald-600/30"
              >
                {isActionLoading ? 'Deploying job configurations...' : 'Deploy job listing'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
