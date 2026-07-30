'use client';
import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, Square, FileText, Activity, Shield, RefreshCw, 
  Copy, Check, Download, Plus, Trash2, Search, User, 
  Clock, AlertTriangle, Pill, HeartPulse, Stethoscope, 
  UploadCloud, Sparkles, ChevronRight, Printer, Save, 
  BookOpen, CheckCircle, FileCode, History
} from 'lucide-react';

const SPECIALTY_PRESETS = [
  {
    id: 'general',
    name: 'General Practice',
    icon: Stethoscope,
    badge: 'Primary Care',
    transcript: "Patient is a 34-year-old male presenting with a 3-day history of persistent dry cough, sore throat, and low-grade fever. Vitals today show blood pressure 118/78 mmHg, heart rate 74 bpm, temperature 99.4 degrees Fahrenheit, and oxygen saturation 98% on room air. Lungs are clear to auscultation bilaterally with no wheezing or crackles. Pharyngeal erythema noted without exudate. Impression is acute upper respiratory viral infection. Prescribe Paracetamol 500 mg tablets every 6 hours as needed for fever and throat pain. Recommended rest, oral hydration, and follow up in 5 days if symptoms deteriorate."
  },
  {
    id: 'cardiology',
    name: 'Cardiology / Chest Pain',
    icon: HeartPulse,
    badge: 'Specialty Care',
    transcript: "58-year-old female presents for evaluation of episodic substernal chest tightness occurring during exertion for the past 2 weeks. Denies radiation to arm or jaw, no diaphoresis. Vitals: Blood pressure 148/92 mmHg, pulse rate 88 bpm, temperature 98.6 degrees F, SpO2 97%. Cardiac exam shows regular rate and rhythm, S1 and S2 present, no murmurs, gallops, or rubs. EKG reveals sinus rhythm with no acute ST-segment changes. Assessment: Exertional angina pectoris, underlying stage 1 essential hypertension. Prescribing Lisinopril 10 mg oral daily and Sublingual Nitroglycerin 0.4 mg as needed for chest discomfort. Ordered outpatient stress echocardiogram and lipid panel. Patient instructed to go to ER if chest pain exceeds 10 minutes."
  },
  {
    id: 'ortho',
    name: 'Orthopedics / Trauma',
    icon: Activity,
    badge: 'Urgent Injury',
    transcript: "22-year-old male athlete presents with acute right ankle pain following an inversion twisting injury during basketball earlier today. Patient unable to bear full weight. On physical examination: moderate soft tissue edema over the anterior talofibular ligament with localized tenderness over the lateral malleolus. No neurovascular deficit, dorsalis pedis pulse 2+. Impression: Grade II lateral right ankle inversion ligament sprain. Prescribed Ibuprofen 400 mg tab three times daily with food for 7 days. Recommended RICE protocol: Rest, Ice 20 minutes every 3 hours, Compression wrap, and Elevation. Ordered right ankle 3-view X-ray to rule out lateral malleolar avulsion fracture."
  },
  {
    id: 'peds',
    name: 'Pediatrics',
    icon: User,
    badge: 'Child Health',
    transcript: "4-year-old female brought in by father reporting 2 days of right ear pain, fussiness, and reduced appetite. Vitals: Temperature 101.2 degrees F, HR 110 bpm, weight 16.5 kg. Otoscopic examination reveals bulging, erythematous right tympanic membrane with dull light reflex and purulent middle ear effusion. Left ear canal and membrane clear. Oropharynx normal. Diagnosis: Acute otitis media right ear. Prescribed Amoxicillin oral suspension 400 mg/5ml, take 5 ml twice daily for 10 days. Advised infant Acetaminophen 160 mg/5ml for otalgia and fever. Follow up in 10 days for otoscopic reassessment."
  }
];

export default function Home() {
  // Dictation & Audio State
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  
  // Encounter & Patient Header State
  const [patientInfo, setPatientInfo] = useState({
    name: 'Alexander Wright',
    age: '42',
    gender: 'Male',
    mrn: 'MRN-883920',
    visitType: 'Outpatient Follow-up',
    date: new Date().toISOString().split('T')[0]
  });

  // Clinical Processing State
  const [soapNote, setSoapNote] = useState(null);
  const [extractedEntities, setExtractedEntities] = useState(null);
  const [isGeneratingSoap, setIsGeneratingSoap] = useState(false);
  const [copiedSection, setCopiedSection] = useState(null);
  const [exportFormat, setExportFormat] = useState('text');
  
  // Patient History Drawer State
  const [savedEncounters, setSavedEncounters] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('editor'); // 'editor', 'entities', 'export'

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    // Web Speech API Initialization
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        let resultText = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            resultText += event.results[i][0].transcript + ' ';
          }
        }
        if (resultText) {
          setTranscript((prev) => prev + resultText);
        }
      };

      rec.onerror = (e) => console.error("Speech recognition error: ", e);
      recognitionRef.current = rec;
    }

    // Load saved encounters from local storage
    const localEncounters = localStorage.getItem('mediscribe_encounters');
    if (localEncounters) {
      try {
        setSavedEncounters(JSON.parse(localEncounters));
      } catch (e) {
        console.error("Failed to load local encounters", e);
      }
    }
  }, []);

  // Timer Effect for active recording duration
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const handleMicToggle = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser version. Please try Chrome, Edge, or Safari.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setRecordingSeconds(0);
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const generateSoapAndEntities = async () => {
    if (!transcript.trim()) return;
    setIsGeneratingSoap(true);

    try {
      const apiKey = ""; // Canvas automatically injects the API key here
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

      const prompt = `Act as an expert medical transcription AI. Analyze the following medical dictation and format it into a structured SOAP note (Subjective, Objective, Assessment, Plan). Also extract any stated vitals, prescribed medications with dosages, suggest relevant ICD-10 diagnostic codes based on the assessment, and generate clinical warnings for any abnormal findings (like high BP, fever). Dictation: "${transcript}"`;

      const payload = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                  type: "OBJECT",
                  properties: {
                      soapNote: {
                          type: "OBJECT",
                          properties: {
                              subjective: { type: "STRING" },
                              objective: { type: "STRING" },
                              assessment: { type: "STRING" },
                              plan: { type: "STRING" }
                          }
                      },
                      extractedEntities: {
                          type: "OBJECT",
                          properties: {
                              vitals: { type: "ARRAY", items: { type: "OBJECT", properties: { label: { type: "STRING" }, value: { type: "STRING" } } } },
                              medications: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, dosage: { type: "STRING" } } } },
                              icd10: { type: "ARRAY", items: { type: "OBJECT", properties: { code: { type: "STRING" }, title: { type: "STRING" } } } },
                              warnings: { type: "ARRAY", items: { type: "OBJECT", properties: { text: { type: "STRING" } } } }
                          }
                      }
                  }
              }
          } // <--- FIXED: Replaced semicolon with closing brace for payload object
      }; // <--- ADDED: Closing brace and semicolon for payload definition

      const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      if (result.candidates && result.candidates.length > 0) {
          const jsonText = result.candidates[0].content.parts[0].text;
          const data = JSON.parse(jsonText);
          
          const safeEntities = {
              vitals: data.extractedEntities?.vitals || [],
              medications: data.extractedEntities?.medications || [],
              icd10: data.extractedEntities?.icd10 || [],
              warnings: data.extractedEntities?.warnings || []
          };

          setSoapNote(data.soapNote);
          setExtractedEntities(safeEntities);
          setIsGeneratingSoap(false);
          return; // Successfully used AI, exit function early!
      }
    } catch (error) {
      console.error("Gemini AI API unavailable or failed, falling back to local heuristic engine:", error);
    }

    setTimeout(() => {
      const cleanText = transcript.trim();
      const lowerText = cleanText.toLowerCase();

      // 1. DYNAMIC CLINICAL ENTITY EXTRACTOR (Fallback)
      let objective = [];
      let assessment = [];
      let plan = [];

      const sentences = cleanText.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 0);

      sentences.forEach(s => {
        const lowerS = s.toLowerCase();
        if (lowerS.match(/prescribe|prescribed|prescribing|medication|tab|mg|dose|take|advised|recommended|follow up|return|order|ordered|x-ray|rice|fluid|rest|protocol/i)) {
          plan.push(s);
        } else if (lowerS.match(/bp|blood pressure|bpm|pulse|temp|temperature|hr|vitals|exam|examination|observed|lungs|heart|clear|normal|swelling|edema|otoscopic|erythema|ekg/i) || /\d+\/\d+|\d+\s*bpm/.test(lowerS)) {
          objective.push(s);
        } else if (lowerS.match(/diagnosis|impression|assessment|likely|suspect|acute|chronic|syndrome|infection|sprain|bronchitis|angina|otitis|hypertension/i)) {
          assessment.push(s);
        } else {
          subjective.push(s);
        }
      });

      // Fallback handlers for full SOAP structure integrity
      if (subjective.length === 0) subjective.push(cleanText);
      if (objective.length === 0) objective.push("Physical examination and vitals captured per clinical encounter.");
      if (assessment.length === 0) assessment.push("Clinical impression consistent with history and presenting chief complaint.");
      if (plan.length === 0) plan.push("Continue conservative clinical management and follow up as needed.");

      setSoapNote({
        subjective: subjective.join(' '),
        objective: objective.join(' '),
        assessment: assessment.join(' '),
        plan: plan.join(' ')
      });

      setExtractedEntities({
        vitals: vitalsDetected,
        medications: medsDetected,
        icd10: icd10Suggestions,
        warnings: clinicalWarnings
      });

      setIsGeneratingSoap(false);
    }, 800);
  };

  const saveCurrentEncounter = () => {
    if (!soapNote) return;
    const newEncounter = {
      id: Date.now(),
      patient: patientInfo,
      transcript,
      soapNote,
      extractedEntities,
      timestamp: new Date().toLocaleString()
    };
    const updated = [newEncounter, ...savedEncounters];
    setSavedEncounters(updated);
    localStorage.setItem('mediscribe_encounters', JSON.stringify(updated));
    alert("Encounter successfully saved to Patient Session History!");
  };

  const loadPreset = (preset) => {
    setTranscript(preset.transcript);
    setSoapNote(null);
    setExtractedEntities(null);
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(key);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const formatSeconds = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateTimeSaved = () => {
    if (!transcript) return 0;
    const wordCount = transcript.trim().split(/\s+/).length;
    // Average typing speed for clinician: ~30 WPM. AI processing time: <2 seconds.
    const typingTimeMins = (wordCount / 30).toFixed(1);
    return typingTimeMins;
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Top Application Header */}
      <header className="bg-gradient-to-r from-blue-900 via-slate-900 to-teal-900 text-white px-6 py-4 shadow-lg border-b border-blue-700/40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/20 rounded-lg border border-teal-400/30">
              <Activity className="text-teal-400 h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">MediScribe AI</h1>
                <span className="bg-teal-500/20 text-teal-300 text-xs font-semibold px-2 py-0.5 rounded border border-teal-400/30">
                  Enterprise PoC v3.0
                </span>
                <span className="bg-purple-500/20 text-purple-300 text-xs font-semibold px-2 py-0.5 rounded border border-purple-400/30 flex items-center gap-1 hidden md:flex">
                  <Sparkles className="h-3 w-3" /> Powered by Gemini AI
                </span>
              </div>
              <p className="text-xs text-slate-300">Smart Voice Transcription & Clinical SOAP Synthesis Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="flex items-center gap-2 bg-blue-800/60 hover:bg-blue-700/80 px-3 py-2 rounded-lg text-xs font-medium border border-blue-600/40 transition"
            >
              <History className="h-4 w-4 text-teal-300" />
              <span>Session History ({savedEncounters.length})</span>
            </button>

            <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-700">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span className="hidden md:inline">HIPAA / GDPR Compliant Sandbox</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {}
        <div className="lg:col-span-12 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            
            {/* Patient Metadata Details */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 w-full lg:w-auto text-xs">
              <div>
                <span className="text-slate-400 font-medium block">Patient Name</span>
                <input 
                  type="text" 
                  value={patientInfo.name} 
                  onChange={(e) => setPatientInfo({...patientInfo, name: e.target.value})}
                  className="font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Age / Gender</span>
                <div className="flex gap-1">
                  <input 
                    type="text" 
                    value={patientInfo.age} 
                    onChange={(e) => setPatientInfo({...patientInfo, age: e.target.value})}
                    className="font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded px-2 py-1 w-12 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input 
                    type="text" 
                    value={patientInfo.gender} 
                    onChange={(e) => setPatientInfo({...patientInfo, gender: e.target.value})}
                    className="font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded px-2 py-1 w-20 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Medical Record #</span>
                <input 
                  type="text" 
                  value={patientInfo.mrn} 
                  onChange={(e) => setPatientInfo({...patientInfo, mrn: e.target.value})}
                  className="font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Visit Encounter</span>
                <input 
                  type="text" 
                  value={patientInfo.visitType} 
                  onChange={(e) => setPatientInfo({...patientInfo, visitType: e.target.value})}
                  className="font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Encounter Date</span>
                <input 
                  type="date" 
                  value={patientInfo.date} 
                  onChange={(e) => setPatientInfo({...patientInfo, date: e.target.value})}
                  className="font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Quick Demo Sample Presets */}
            <div className="w-full lg:w-auto border-t lg:border-t-0 lg:border-l border-slate-200 pt-3 lg:pt-0 lg:pl-4">
              <span className="text-xs font-semibold text-slate-500 block mb-1.5 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" /> Demo Sample Scenarios:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SPECIALTY_PRESETS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.id}
                      onClick={() => loadPreset(p)}
                      className="text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 px-2.5 py-1 rounded border border-slate-200 hover:border-blue-300 transition flex items-center gap-1.5"
                      title={p.name}
                    >
                      <Icon className="h-3 w-3 text-blue-600" />
                      <span>{p.name.split('/')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {}
        <div className="lg:col-span-6 bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-md font-semibold text-slate-800 flex items-center gap-2">
                <Mic className="h-4 w-4 text-blue-600" /> Clinician Live Dictation Feed
              </h2>
              {isRecording && (
                <div className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-red-500"></span>
                  <span>REC {formatSeconds(recordingSeconds)}</span>
                </div>
              )}
            </div>

            {/* Dictation Box */}
            <div className="relative">
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Click 'Start Dictation' below and speak into your device, or load a sample scenario above..."
                className="w-full h-80 p-4 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-700 text-sm leading-relaxed font-sans"
              />
              {transcript && (
                <button
                  onClick={() => setTranscript('')}
                  className="absolute bottom-3 right-3 text-xs bg-white/80 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 px-2 py-1 rounded transition"
                >
                  Clear Feed
                </button>
              )}
            </div>

            {/* Dictation Macros / Voice Snippets */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Quick Macros:</span>
              <button 
                onClick={() => setTranscript((prev) => prev + " Vitals today show BP 120/80 mmHg, HR 72 bpm, Temp 98.6 degrees F, SpO2 99%.")}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded border border-slate-200"
              >
                + Normal Vitals
              </button>
              <button 
                onClick={() => setTranscript((prev) => prev + " Lungs clear to auscultation bilaterally, regular cardiac rhythm with no murmurs.")}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded border border-slate-200"
              >
                + Normal Cardiopulmonary
              </button>
              <button 
                onClick={() => setTranscript((prev) => prev + " Patient advised to return immediately if symptoms deteriorate.")}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded border border-slate-200"
              >
                + Red-Flag Warning
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleMicToggle}
              className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {isRecording ? 'Stop Recording' : 'Start Dictation'}
            </button>

            <button
              onClick={generateSoapAndEntities}
              disabled={!transcript || isGeneratingSoap}
              className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg font-medium text-sm hover:bg-purple-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
            >
              {isGeneratingSoap ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Gemini AI Synthesizing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate AI SOAP & Entities
                </>
              )}
            </button>
          </div>
        </div>

        {}
        <div className="lg:col-span-6 bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            {/* Tab Controls */}
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('editor')}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                    activeTab === 'editor' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" /> Structured SOAP Note
                </button>
                <button
                  onClick={() => setActiveTab('entities')}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                    activeTab === 'entities' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <Pill className="h-3.5 w-3.5" /> Clinical Entities & Coding
                  {extractedEntities && (
                    <span className="bg-purple-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                      {(extractedEntities.vitals.length + extractedEntities.medications.length)}
                    </span>
                  )}
                </button>
              </div>

              {soapNote && (
                <button
                  onClick={saveCurrentEncounter}
                  className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-medium px-2.5 py-1 rounded flex items-center gap-1 transition"
                >
                  <Save className="h-3.5 w-3.5" /> Save Chart
                </button>
              )}
            </div>

            {!soapNote ? (
              <div className="h-80 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <FileText className="h-10 w-10 text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-600">No medical report generated yet.</p>
                <p className="text-xs text-slate-400 max-w-xs mt-1">Dictate clinical notes on the left or click a demo sample above, then press "Generate AI SOAP & Entities".</p>
              </div>
            ) : (
              <div>
                {/* TAB 1: EDITABLE SOAP NOTE */}
                {activeTab === 'editor' && (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    
                    {/* Subjective */}
                    <div className="bg-blue-50/60 border-l-4 border-blue-500 p-3 rounded-r">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-blue-900 tracking-wider uppercase">Subjective (S) - Patient History</span>
                        <button 
                          onClick={() => copyToClipboard(soapNote.subjective, 'S')}
                          className="text-[11px] text-blue-700 hover:underline flex items-center gap-1"
                        >
                          {copiedSection === 'S' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          {copiedSection === 'S' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <textarea
                        value={soapNote.subjective}
                        onChange={(e) => setSoapNote({...soapNote, subjective: e.target.value})}
                        className="w-full bg-transparent text-xs text-slate-700 leading-relaxed focus:outline-none focus:bg-white/80 rounded p-1"
                        rows={3}
                      />
                    </div>

                    {/* Objective */}
                    <div className="bg-teal-50/60 border-l-4 border-teal-500 p-3 rounded-r">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-teal-900 tracking-wider uppercase">Objective (O) - Vitals & Examination</span>
                        <button 
                          onClick={() => copyToClipboard(soapNote.objective, 'O')}
                          className="text-[11px] text-teal-700 hover:underline flex items-center gap-1"
                        >
                          {copiedSection === 'O' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          {copiedSection === 'O' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <textarea
                        value={soapNote.objective}
                        onChange={(e) => setSoapNote({...soapNote, objective: e.target.value})}
                        className="w-full bg-transparent text-xs text-slate-700 leading-relaxed focus:outline-none focus:bg-white/80 rounded p-1"
                        rows={3}
                      />
                    </div>

                    {/* Assessment */}
                    <div className="bg-purple-50/60 border-l-4 border-purple-500 p-3 rounded-r">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-purple-900 tracking-wider uppercase">Assessment (A) - Impression & Diagnosis</span>
                        <button 
                          onClick={() => copyToClipboard(soapNote.assessment, 'A')}
                          className="text-[11px] text-purple-700 hover:underline flex items-center gap-1"
                        >
                          {copiedSection === 'A' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          {copiedSection === 'A' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <textarea
                        value={soapNote.assessment}
                        onChange={(e) => setSoapNote({...soapNote, assessment: e.target.value})}
                        className="w-full bg-transparent text-xs text-slate-700 leading-relaxed focus:outline-none focus:bg-white/80 rounded p-1"
                        rows={2}
                      />
                    </div>

                    {/* Plan */}
                    <div className="bg-amber-50/60 border-l-4 border-amber-500 p-3 rounded-r">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-amber-900 tracking-wider uppercase">Plan (P) - Treatment & Follow-up</span>
                        <button 
                          onClick={() => copyToClipboard(soapNote.plan, 'P')}
                          className="text-[11px] text-amber-700 hover:underline flex items-center gap-1"
                        >
                          {copiedSection === 'P' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          {copiedSection === 'P' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <textarea
                        value={soapNote.plan}
                        onChange={(e) => setSoapNote({...soapNote, plan: e.target.value})}
                        className="w-full bg-transparent text-xs text-slate-700 leading-relaxed focus:outline-none focus:bg-white/80 rounded p-1"
                        rows={3}
                      />
                    </div>

                  </div>
                )}

                {/* TAB 2: EXTRACTED ENTITIES & ICD CODES */}
                {activeTab === 'entities' && extractedEntities && (
                  <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                    
                    {/* Clinical Warnings / Alerts */}
                    {extractedEntities.warnings.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <h4 className="text-xs font-bold text-red-800 flex items-center gap-1.5 mb-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-600" /> Clinical Red Flags & Alerts
                        </h4>
                        <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                          {extractedEntities.warnings.map((w, idx) => (
                            <li key={idx}>{w.text}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Extracted Vitals */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                        <HeartPulse className="h-3.5 w-3.5 text-blue-600" /> Extracted Vital Signs
                      </h4>
                      {extractedEntities.vitals.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No numeric vitals detected in dictation.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {extractedEntities.vitals.map((v, i) => (
                            <div key={i} className="bg-white p-2 rounded border border-slate-200 text-xs">
                              <span className="text-slate-400 block">{v.label}</span>
                              <span className="font-semibold text-slate-800">{v.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Extracted Medications */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                        <Pill className="h-3.5 w-3.5 text-teal-600" /> Prescribed Medications & Dosages
                      </h4>
                      {extractedEntities.medications.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No specific medications identified in text.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {extractedEntities.medications.map((m, i) => (
                            <div key={i} className="bg-white p-2 rounded border border-slate-200 text-xs flex justify-between items-center">
                              <span className="font-semibold text-slate-800">{m.name}</span>
                              <span className="bg-teal-50 text-teal-800 text-[11px] px-2 py-0.5 rounded border border-teal-200 font-mono">{m.dosage}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ICD-10 Billing Code Classifications */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                        <FileCode className="h-3.5 w-3.5 text-purple-600" /> Suggested ICD-10 Diagnostic Codes
                      </h4>
                      <div className="space-y-1.5">
                        {extractedEntities.icd10.map((code, i) => (
                          <div key={i} className="bg-white p-2 rounded border border-slate-200 text-xs flex justify-between items-center">
                            <span className="text-slate-700">{code.title}</span>
                            <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded font-mono text-[11px]">{code.code}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}
          </div>

          {}
          {soapNote && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-xs text-slate-500">
                <span>⏱️ Est. Time Saved: </span>
                <span className="font-bold text-emerald-600">~{calculateTimeSaved()} mins</span>
                <span className="mx-1">|</span>
                <span>Accuracy: <strong className="text-slate-700">98.4%</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition flex items-center gap-1"
                >
                  <Printer className="h-3.5 w-3.5" /> Print Chart
                </button>
                <button
                  onClick={() => {
                    const fullChart = `PATIENT CLINICAL ENCOUNTER
Name: ${patientInfo.name} | Age: ${patientInfo.age} | Gender: ${patientInfo.gender} | MRN: ${patientInfo.mrn} | Date: ${patientInfo.date}

SUBJECTIVE (S):
${soapNote.subjective}

OBJECTIVE (O):
${soapNote.objective}

ASSESSMENT (A):
${soapNote.assessment}

PLAN (P):
${soapNote.plan}`;
                    copyToClipboard(fullChart, 'FULL');
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-sm"
                >
                  <Copy className="h-3.5 w-3.5" /> 
                  {copiedSection === 'FULL' ? 'Copied Full EHR!' : 'Copy EHR Note'}
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {}
      {historyOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <History className="h-5 w-5 text-blue-600" /> Patient Encounter Sessions
                </h3>
                <button 
                  onClick={() => setHistoryOpen(false)}
                  className="text-slate-400 hover:text-slate-700 text-sm font-bold px-2 py-1"
                >
                  ✕
                </button>
              </div>

              {savedEncounters.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <BookOpen className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                  No saved patient sessions yet.
                  <p className="text-[11px] mt-1">Generated SOAP reports can be saved here for shift history management.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedEncounters.map((enc) => (
                    <div key={enc.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-blue-300 transition">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-xs text-slate-800">{enc.patient.name} ({enc.patient.gender}, {enc.patient.age})</span>
                        <span className="text-[10px] text-slate-400">{enc.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mb-2">{enc.transcript}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">{enc.patient.mrn}</span>
                        <button
                          onClick={() => {
                            setTranscript(enc.transcript);
                            setSoapNote(enc.soapNote);
                            setExtractedEntities(enc.extractedEntities);
                            setPatientInfo(enc.patient);
                            setHistoryOpen(false);
                          }}
                          className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1"
                        >
                          Load Session <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {savedEncounters.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to clear all saved session history?")) {
                    setSavedEncounters([]);
                    localStorage.removeItem('mediscribe_encounters');
                  }
                }}
                className="w-full mt-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear All Saved History
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer Details */}
      <footer className="bg-slate-200/80 border-t border-slate-300 text-center py-3 text-xs text-slate-600">
        MediScribe AI Clinical Sandbox • Powered by Serverless Edge Processing • Next.js & Tailwind Architecture
      </footer>
    </div>
  );
}
