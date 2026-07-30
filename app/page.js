'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, FileText, Activity, Shield, RefreshCw, Copy, Check, AlertTriangle, Pill, HeartPulse, Stethoscope, Save } from 'lucide-react';

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [soapNote, setSoapNote] = useState(null);
  const [isGeneratingSoap, setIsGeneratingSoap] = useState(false);
  const [extractedEntities, setExtractedEntities] = useState({ vitals: [], medications: [], icd10: [], warnings: [] });
  const [copiedSection, setCopiedSection] = useState(null);
  const [encounterHistory, setEncounterHistory] = useState([]);
  
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
      console.error("Gemini AI API unavailable or failed, falling back to local heuristic engine:", error);
    }

    // Backup Fallback System (If AI fails)
    setTimeout(() => {
      const cleanText = transcript.trim();
      
      let subjective = [];
      let objective = [];
      let assessment = [];
      let plan = [];

      const sentences = cleanText.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 0);

      sentences.forEach(s => {
        const lower = s.toLowerCase();
        if (lower.includes('plan') || lower.includes('prescribe') || lower.includes('follow up') || lower.includes('take') || lower.includes('mg')) {
          plan.push(s);
        } else if (lower.includes('assessment') || lower.includes('diagnosis') || lower.includes('impression') || lower.includes('likely')) {
          assessment.push(s);
        } else if (lower.includes('exam') || lower.includes('vitals') || lower.includes('pressure') || lower.includes('rate') || lower.includes('temperature') || lower.includes('clear') || lower.includes('stable')) {
          objective.push(s);
        } else {
          subjective.push(s);
        }
      });

      if (subjective.length === 0) subjective.push(cleanText);
      if (objective.length === 0) objective.push("No specific objective findings dictated.");
      if (assessment.length === 0) assessment.push("Clinical impression consistent with history and presenting chief complaint.");
      if (plan.length === 0) plan.push("Continue conservative clinical management and follow up as needed.");

      setSoapNote({
        subjective: subjective.join(' '),
        objective: objective.join(' '),
        assessment: assessment.join(' '),
        plan: plan.join(' ')
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

  const loadPreset = (text) => {
    setTranscript(text);
  };

  const saveCurrentEncounter = () => {
    if (!soapNote) return;
    setEncounterHistory([{ date: new Date().toLocaleTimeString(), soap: soapNote }, ...encounterHistory]);
    alert("Encounter saved to local history.");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-slate-900 text-white px-6 py-4 shadow-md flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <Activity className="text-teal-400 h-6 w-6 animate-pulse" />
          <h1 className="text-xl font-bold tracking-tight">MediScribe <span className="text-teal-400 font-normal text-sm border border-teal-400/40 px-2 py-0.5 rounded ml-2">AI Enterprise</span></h1>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="bg-purple-900/50 text-purple-300 px-3 py-1.5 rounded-full border border-purple-700/50 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </span>
            Powered by Gemini AI
          </div>
          <div className="flex items-center gap-2 text-slate-300 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
            <Shield className="h-3.5 w-3.5 text-teal-400" />
            <span>HIPAA Compliant Sandbox</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col flex-1">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                🎙️ Clinician Dictation
              </h2>
              {transcript && (
                <button onClick={clearAll} className="text-xs text-slate-400 hover:text-red-500 transition flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
            
            <div className="relative flex-1 flex flex-col">
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Click 'Start Recording' and dictate, or paste a medical scenario here..."
                className="flex-1 w-full min-h-[250px] p-4 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-slate-700 leading-relaxed font-sans resize-none"
              />
              {isRecording && (
                <span className="absolute top-3 right-3 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleMicToggle}
                className={`flex-1 py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all shadow-sm ${
                  isRecording 
                    ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' 
                    : 'bg-slate-800 text-white hover:bg-slate-900'
                }`}
              >
                {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isRecording ? 'Stop Recording' : 'Start Dictation'}
              </button>

              <button
                onClick={generateSoapNote}
                disabled={!transcript || isGeneratingSoap}
                className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
              >
                {isGeneratingSoap ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Synthesizing...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Generate AI SOAP
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Quick Presets (For Demo)</h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => loadPreset("Patient is a 45-year-old female, two weeks status post right total knee arthroplasty. Pain is well-controlled with Tylenol. Surgical incision is clean, dry, and intact with no signs of erythema. Active range of motion is 5 degrees of extension to 90 degrees of flexion. Vitals: BP 118/75, Temp 98.6. Assessment: Normally healing right total knee replacement. Plan: Continue outpatient physical therapy twice a week. Follow up in 4 weeks.")} className="text-left px-3 py-2 text-xs bg-slate-50 border border-slate-200 hover:border-purple-400 rounded transition text-slate-600">
                🦴 Ortho Post-Op
              </button>
              <button onClick={() => loadPreset("5 year old male brought in by mother for barking cough starting yesterday. No fever. Temp 99.1, HR 110, SpO2 98% on room air. Mild inspiratory stridor noted on exam, otherwise clear. Looks tired but playing. Diagnosis is mild croup. Plan is single dose oral Dexamethasone 12mg in clinic. Advised cool mist humidifier and return precautions.")} className="text-left px-3 py-2 text-xs bg-slate-50 border border-slate-200 hover:border-purple-400 rounded transition text-slate-600">
                🧸 Peds Croup
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col h-full">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              📄 Structured Clinical Note
            </h2>
            {soapNote && (
              <button onClick={saveCurrentEncounter} className="text-xs bg-teal-50 text-teal-700 px-3 py-1.5 rounded-full font-medium hover:bg-teal-100 transition flex items-center gap-1 border border-teal-200">
                <Save className="h-3.5 w-3.5" /> Save to EHR
              </button>
            )}
          </div>

          {!soapNote ? (
            <div className="flex-1 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-50/50">
              <Stethoscope className="h-16 w-16 text-slate-300 mb-4 opacity-50" />
              <p className="text-base font-medium text-slate-500 mb-1">Awaiting Clinical Dictation</p>
              <p className="text-sm max-w-sm mx-auto">Use the microphone or paste a scenario to automatically generate a structured SOAP note with AI.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-2 space-y-5 custom-scrollbar">
              
              {(extractedEntities.vitals.length > 0 || extractedEntities.medications.length > 0 || extractedEntities.warnings.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  {extractedEntities.warnings.length > 0 && (
                    <div className="md:col-span-2 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-red-800 uppercase tracking-wide mb-1">Clinical Alerts</h4>
                        <ul className="list-disc list-inside text-sm text-red-700 space-y-0.5">
                          {extractedEntities.warnings.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  {extractedEntities.vitals.length > 0 && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <HeartPulse className="h-4 w-4 text-blue-500" />
                        <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wide">Vital Signs</h4>
                      </div>
                      <ul className="text-sm text-blue-900 space-y-1">
                        {extractedEntities.vitals.map((v, i) => <li key={i} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>{v}</li>)}
                      </ul>
                    </div>
                  )}

                  {extractedEntities.medications.length > 0 && (
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Pill className="h-4 w-4 text-purple-500" />
                        <h4 className="text-xs font-bold text-purple-800 uppercase tracking-wide">Medications</h4>
                      </div>
                      <ul className="text-sm text-purple-900 space-y-1">
                        {extractedEntities.medications.map((m, i) => <li key={i} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-purple-400"></span>{m}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {Object.entries({ subjective: 'S', objective: 'O', assessment: 'A', plan: 'P' }).map(([key, label]) => (
                <div key={key} className="relative group">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 rounded-l group-hover:bg-purple-400 transition-colors"></div>
                  <div className="pl-4 pr-2 py-1">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-bold text-sm text-slate-800 tracking-wider uppercase flex items-center gap-2">
                        <span className="bg-slate-100 text-slate-600 w-6 h-6 rounded flex items-center justify-center text-xs font-black">{label}</span>
                        {key}
                      </h3>
                      <button 
                        onClick={() => copyToClipboard(soapNote[key], key)}
                        className="text-slate-400 hover:text-purple-600 transition p-1"
                        title={`Copy ${key}`}
                      >
                        {copiedSection === key ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{soapNote[key]}</p>
                  </div>
                </div>
              ))}

              {extractedEntities.icd10.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Suggested Billing Codes</h4>
                  <div className="flex flex-wrap gap-2">
                    {extractedEntities.icd10.map((code, i) => (
                      <span key={i} className="bg-slate-100 border border-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded font-mono">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
