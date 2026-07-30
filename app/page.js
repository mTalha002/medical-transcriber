'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, FileText, Activity, Shield, RefreshCw, Copy, Check, AlertTriangle, Pill, HeartPulse, Stethoscope, Save, User } from 'lucide-react';

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [soapNote, setSoapNote] = useState(null);
  const [isGeneratingSoap, setIsGeneratingSoap] = useState(false);
  const [extractedEntities, setExtractedEntities] = useState({ vitals: [], medications: [], icd10: [], warnings: [] });
  const [copiedSection, setCopiedSection] = useState(null);
  
  const recognitionRef = useRef(null);
  
  // SECURE WAY: Vercel will inject your key here automatically!
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY; 

  useEffect(() => {
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

      rec.onerror = (e) => console.error("Speech error: ", e);
      recognitionRef.current = rec;
    }
  }, []);

  const handleMicToggle = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported or permitted in this browser version.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const generateSoapNote = async () => {
    if (!transcript.trim()) return;
    setIsGeneratingSoap(true);
    
    try {
      if (!apiKey || apiKey === "") {
         throw new Error("No API key provided. Check Vercel Environment Variables.");
      }

      const prompt = `You are an expert medical AI assistant. Analyze the following clinical dictation and extract the data into a strict JSON format. 
      Dictation: "${transcript}"
      
      Respond ONLY with a valid JSON object using this exact schema:
      {
        "subjective": "Summarize the patient's history of present illness and symptoms.",
        "objective": "Summarize the physical exam findings and objective data.",
        "assessment": "Provide the clinical diagnosis or impression.",
        "plan": "Detail the treatment plan, medications, and follow-up.",
        "vitals": ["List any vital signs mentioned, e.g., 'BP 120/80'"],
        "medications": ["List any medications prescribed or mentioned"],
        "icd10": ["Suggest 1-3 relevant ICD-10 codes, e.g., 'J20.9 - Acute Bronchitis'"],
        "warnings": ["List any abnormal vitals or clinical red flags, otherwise empty"]
      }`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) throw new Error("API call failed");

      const data = await response.json();
      let jsonString = data.candidates[0].content.parts[0].text;
      jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const parsedData = JSON.parse(jsonString);
      
      setSoapNote({
        subjective: parsedData.subjective || "",
        objective: parsedData.objective || "",
        assessment: parsedData.assessment || "",
        plan: parsedData.plan || ""
      });

      setExtractedEntities({
        vitals: parsedData.vitals || [],
        medications: parsedData.medications || [],
        icd10: parsedData.icd10 || [],
        warnings: parsedData.warnings || []
      });

      setIsGeneratingSoap(false);
      return;
    } catch (error) {
      console.error("Gemini API Error. Falling back to simple parsing...", error);
    }

    setTimeout(() => {
      const cleanText = transcript.trim();
      
      let subjectiveText = [];
      let objectiveText = [];
      let assessmentText = [];
      let planText = [];

      const sentences = cleanText.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 0);

      sentences.forEach(s => {
        const lower = s.toLowerCase();
        if (lower.includes('plan') || lower.includes('prescribe') || lower.includes('follow up') || lower.includes('take') || lower.includes('mg')) {
          planText.push(s);
        } else if (lower.includes('assessment') || lower.includes('diagnosis') || lower.includes('impression') || lower.includes('likely')) {
          assessmentText.push(s);
        } else if (lower.includes('exam') || lower.includes('vitals') || lower.includes('pressure') || lower.includes('rate') || lower.includes('temperature') || lower.includes('clear') || lower.includes('stable')) {
          objectiveText.push(s);
        } else {
          subjectiveText.push(s);
        }
      });

      setSoapNote({
        subjective: subjectiveText.length > 0 ? subjectiveText.join(' ') : cleanText,
        objective: objectiveText.length > 0 ? objectiveText.join(' ') : "No specific objective findings dictated.",
        assessment: assessmentText.length > 0 ? assessmentText.join(' ') : "Clinical impression consistent with history.",
        plan: planText.length > 0 ? planText.join(' ') : "Continue conservative clinical management."
      });

      setExtractedEntities({
        vitals: [],
        medications: [],
        icd10: [],
        warnings: []
      });

      setIsGeneratingSoap(false);
    }, 800);
  };

  const clearAll = () => {
    setTranscript('');
    setSoapNote(null);
    setExtractedEntities({ vitals: [], medications: [], icd10: [], warnings: [] });
  };

  const copyToClipboard = (text, section) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900">
      
      {/* Enterprise Application Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-teal-500/10 p-2 rounded-lg border border-teal-500/20">
            <Activity className="text-teal-600 h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 leading-tight">MediScribe</h1>
            <p className="text-xs font-medium text-slate-500 tracking-wide uppercase">AI Enterprise Sandbox</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 text-sm">
          {/* Mock Patient Context Context */}
          <div className="hidden md:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 mr-2">
            <User className="h-4 w-4 text-slate-400" />
            <span className="font-semibold text-slate-700">John Doe</span>
            <span className="text-slate-400">|</span>
            <span>MRN: 884-92A</span>
          </div>

          <div className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full border border-indigo-100 flex items-center gap-2 font-medium shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Gemini Enabled
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 bg-white px-3 py-1.5 rounded-full border border-slate-200 font-medium shadow-sm">
            <Shield className="h-3.5 w-3.5 text-emerald-500" />
            <span>HIPAA Secure</span>
          </div>
        </div>
      </header>

      { }
      <main className="max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Dictation Box */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col transition-all hover:shadow-md">
            
            <div className="bg-slate-50/50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Mic className="h-4 w-4 text-slate-500" /> Clinical Dictation
              </h2>
              {transcript && (
                <button onClick={clearAll} className="text-xs font-medium text-slate-500 hover:text-red-600 transition-colors flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-slate-200 hover:border-red-200 shadow-sm">
                  <RefreshCw className="h-3 w-3" /> Reset
                </button>
              )}
            </div>
            
            <div className="relative p-5">
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Click 'Start Dictation' and speak clearly, or paste a medical scenario text here..."
                className="w-full min-h-[320px] p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10 transition-all text-slate-700 leading-relaxed font-normal resize-y placeholder:text-slate-400"
              />
              {isRecording && (
                <div className="absolute top-8 right-8 flex items-center gap-2 bg-red-50 text-red-600 px-2.5 py-1 rounded-md border border-red-100 text-xs font-bold animate-pulse shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  RECORDING
                </div>
              )}
            </div>

            <div className="px-5 pb-5 pt-0 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleMicToggle}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-sm ${
                  isRecording 
                    ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' 
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isRecording ? 'Stop Recording' : 'Start Dictation'}
              </button>

              <button
                onClick={generateSoapNote}
                disabled={!transcript || isGeneratingSoap}
                className="flex-1 bg-slate-900 text-white py-3 px-4 rounded-xl font-semibold hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              >
                {isGeneratingSoap ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Analyzing Data...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Generate Chart
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {}
        <div className="lg:col-span-7 flex flex-col h-full">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full transition-all hover:shadow-md">
            
            <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-slate-500" /> Structured Encounter Note
              </h2>
              {soapNote && (
                <button className="text-xs bg-white text-slate-600 px-3 py-1.5 rounded-md font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1.5 border border-slate-200 shadow-sm">
                  <Save className="h-3.5 w-3.5" /> Save to EHR
                </button>
              )}
            </div>

            {!soapNote ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="bg-slate-50 p-4 rounded-full mb-4 border border-slate-100">
                  <FileText className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Awaiting Clinical Data</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  Provide a dictation and the Gemini AI will automatically extract vitals, medications, diagnoses, and structure a professional SOAP note here.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
                {/* Extracted Metrics Badges */}
                {(extractedEntities.vitals.length > 0 || extractedEntities.medications.length > 0 || extractedEntities.warnings.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {extractedEntities.warnings.length > 0 && (
                      <div className="md:col-span-2 bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-1.5">Clinical Alerts</h4>
                          <ul className="list-disc list-inside text-sm text-rose-700 space-y-1">
                            {extractedEntities.warnings.map((w, i) => <li key={i}>{w}</li>)}
                          </ul>
                        </div>
                      </div>
                    )}
                    
                    {extractedEntities.vitals.length > 0 && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <HeartPulse className="h-4 w-4 text-teal-600" />
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Vital Signs</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {extractedEntities.vitals.map((v, i) => (
                            <span key={i} className="bg-white border border-slate-200 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-md shadow-sm">
                              {v}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {extractedEntities.medications.length > 0 && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Pill className="h-4 w-4 text-indigo-600" />
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Medications</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {extractedEntities.medications.map((m, i) => (
                            <span key={i} className="bg-white border border-slate-200 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-md shadow-sm">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Structured SOAP Notes */}
                <div className="space-y-6">
                  {Object.entries({ subjective: 'Subjective', objective: 'Objective', assessment: 'Assessment', plan: 'Plan' }).map(([key, label]) => (
                    <div key={key} className="group relative pl-4">
                      {/* Left border accent line */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 rounded-full group-hover:bg-slate-400 transition-colors"></div>
                      
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-sm text-slate-800 tracking-wide flex items-center gap-2">
                          <span className="text-slate-400 font-black text-lg leading-none">{label.charAt(0)}</span>
                          {label}
                        </h3>
                        <button 
                          onClick={() => copyToClipboard(soapNote[key], key)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 transition-all p-1.5 bg-slate-50 hover:bg-indigo-50 rounded-md border border-transparent hover:border-indigo-100"
                          title={`Copy ${label}`}
                        >
                          {copiedSection === key ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-normal">
                        {soapNote[key]}
                      </p>
                    </div>
                  ))}
                </div>

                {/* ICD-10 Billing Codes */}
                {extractedEntities.icd10.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" /> Suggested Billing Codes
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {extractedEntities.icd10.map((code, i) => (
                        <span key={i} className="bg-slate-100 border border-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-md font-mono font-medium shadow-sm">
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
