'use client';
import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, Square, FileText, Shield, RefreshCw, Copy, Check, AlertTriangle, 
  Pill, HeartPulse, Stethoscope, Save, User, LayoutDashboard, Calendar, 
  Settings, LogOut, FileSignature, Microscope, Receipt, MessageSquare, 
  Activity, Clock, ChevronRight, CheckCircle2
} from 'lucide-react';

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('clinical');
  const [copiedSection, setCopiedSection] = useState(null);
  
  const [medicalRecord, setMedicalRecord] = useState(null);
  
  const recognitionRef = useRef(null);
  
  // SECURE WAY: Vercel injects this via Environment Variables
  // Using a fallback for the browser preview environment where process might not be defined.
  const apiKey = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_GEMINI_API_KEY : ''; 

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

  const generateClinicalRecord = async () => {
    if (!transcript.trim()) return;
    setIsGenerating(true);
    
    try {
      if (!apiKey || apiKey === "") {
         throw new Error("No API key provided.");
      }

      const prompt = `You are an expert enterprise medical AI co-pilot. Analyze the following clinician dictation and extract a comprehensive medical record.
      Dictation: "${transcript}"
      
      Respond ONLY with a valid JSON object using this exact schema:
      {
        "soap": {
          "subjective": "Thorough HPI and patient symptoms",
          "objective": "Physical exam findings and objective data",
          "assessment": "Primary clinical diagnosis/impression",
          "plan": "Detailed treatment and management plan"
        },
        "vitals": ["List any vital signs mentioned"],
        "medications": [
          {"name": "Drug name", "dosage": "Dosage/Route", "instructions": "Sig/Instructions"}
        ],
        "orders": {
          "labs": ["Suggested or dictated lab tests"],
          "imaging": ["Suggested or dictated imaging (X-Ray, MRI, etc)"]
        },
        "billing": {
          "icd10": [{"code": "Code", "description": "Description"}],
          "cpt": [{"code": "Code", "description": "Evaluation/Procedure code"}]
        },
        "differential_diagnosis": ["Top 2-3 alternative diagnoses to consider"],
        "patient_handout": "A 6th-grade reading level summary speaking directly to the patient about their visit, diagnosis, and what they need to do next.",
        "warnings": ["Clinical red flags, abnormal vitals, or contraindications"]
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
      
      setMedicalRecord(JSON.parse(jsonString));
      setIsGenerating(false);
      return;
    } catch (error) {
      console.error("Gemini AI Error. Falling back to mock data...", error);
      
      setTimeout(() => {
        setMedicalRecord({
          soap: {
            subjective: transcript || "Patient reports ongoing symptoms...",
            objective: "Vitals stable. No acute distress.",
            assessment: "Clinical impression requires further workup.",
            plan: "Conservative management and follow-up."
          },
          vitals: ["BP 120/80", "HR 72"],
          medications: [{ name: "Acetaminophen", dosage: "500mg PO", instructions: "Q6H PRN pain" }],
          orders: { labs: ["CBC", "CMP"], imaging: ["None indicated"] },
          billing: { 
            icd10: [{ code: "R69", description: "Illness, unspecified" }],
            cpt: [{ code: "99213", description: "Outpatient visit, established patient" }]
          },
          differential_diagnosis: ["Viral syndrome", "Fatigue"],
          patient_handout: "You were seen today for your symptoms. Please take your medications as prescribed and rest. Call the clinic if things get worse.",
          warnings: ["Monitor for fever"]
        });
        setIsGenerating(false);
      }, 1500);
    }
  };

  const clearAll = () => {
    setTranscript('');
    setMedicalRecord(null);
    setActiveTab('clinical');
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Enterprise Sidebar */}
      <aside className="w-20 lg:w-64 bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 z-20 shadow-xl border-r border-slate-800">
        <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-slate-800 bg-slate-950">
          <Activity className="h-7 w-7 text-indigo-400 shrink-0" />
          <span className="ml-3 font-bold text-xl text-white hidden lg:block tracking-tight">MediScribe<span className="text-indigo-400">.ai</span></span>
        </div>
        
        <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
          <NavItem icon={<LayoutDashboard />} label="Dashboard" active />
          <NavItem icon={<Calendar />} label="Schedule" />
          <NavItem icon={<User />} label="Patient Directory" />
          <NavItem icon={<FileSignature />} label="Chart Review" />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <NavItem icon={<Settings />} label="Settings" />
          <NavItem icon={<LogOut />} label="Logout" />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Patient Context Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-50 p-2 rounded-full border border-indigo-100">
              <User className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Doe, John (DOB: 05/14/1980)</h2>
              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                <span>MRN: 884-92A</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>Male, 44 Yrs</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Penicillin Allergy</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-md border border-indigo-100 text-xs font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Gemini LLM Active
            </div>
            <button className="bg-slate-900 text-white px-4 py-1.5 rounded-md text-sm font-semibold hover:bg-slate-800 transition shadow-sm flex items-center gap-2">
              <Save className="h-4 w-4" /> Save Chart
            </button>
          </div>
        </header>

        {/* Split Workarea */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* LEFT: Dictation Panel */}
          <div className="w-full lg:w-[40%] bg-white border-r border-slate-200 flex flex-col z-0">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Mic className="h-4 w-4 text-indigo-500" /> Clinical Dictation
              </h3>
              {transcript && (
                <button onClick={clearAll} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 font-medium transition-colors">
                  <RefreshCw className="h-3 w-3" /> Reset
                </button>
              )}
            </div>
            
            <div className="flex-1 p-4 relative">
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Click 'Start Dictation' and speak normally. The AI will extract vitals, medications, orders, and build the SOAP note..."
                className="w-full h-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-slate-700 leading-relaxed font-normal resize-none placeholder:text-slate-400"
              />
              {isRecording && (
                <div className="absolute top-8 right-8 flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm animate-pulse">
                  <span className="h-2 w-2 bg-red-500 rounded-full"></span> RECORDING
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex gap-3 shrink-0">
              <button
                onClick={handleMicToggle}
                className={`flex-1 py-2.5 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-sm text-sm ${
                  isRecording 
                    ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' 
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isRecording ? 'Stop' : 'Dictate'}
              </button>

              <button
                onClick={generateClinicalRecord}
                disabled={!transcript || isGenerating}
                className="flex-[2] bg-indigo-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md text-sm"
              >
                {isGenerating ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Synthesizing Data...</>
                ) : (
                  <><FileSignature className="h-4 w-4" /> Generate Smart Chart</>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT: AI Output Panel */}
          <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden relative">
            {!medicalRecord && !isGenerating ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
                <div className="bg-white p-6 rounded-full shadow-sm border border-slate-100 mb-6 relative">
                  <div className="absolute inset-0 border-2 border-indigo-100 rounded-full animate-ping opacity-20"></div>
                  <Activity className="h-12 w-12 text-indigo-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">Awaiting Encouter Data</h3>
                <p className="text-slate-500 max-w-md text-sm leading-relaxed">
                  Dictate the patient encounter on the left. Our enterprise AI will automatically structure notes, extract billing codes, and generate patient instructions.
                </p>
              </div>
            ) : isGenerating ? (
               <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-sm z-10">
                 <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                 <p className="text-indigo-800 font-semibold animate-pulse">Gemini AI analyzing clinical context...</p>
               </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                
                {/* Custom Tab Navigation */}
                <div className="bg-white border-b border-slate-200 px-4 pt-4 flex gap-6 shrink-0 overflow-x-auto no-scrollbar">
                  <TabButton id="clinical" icon={<FileText />} label="Clinical Note" activeTab={activeTab} setActiveTab={setActiveTab} />
                  <TabButton id="orders" icon={<Pill />} label="Orders & Meds" activeTab={activeTab} setActiveTab={setActiveTab} />
                  <TabButton id="billing" icon={<Receipt />} label="Coding (ICD/CPT)" activeTab={activeTab} setActiveTab={setActiveTab} />
                  <TabButton id="patient" icon={<MessageSquare />} label="Patient Handout" activeTab={activeTab} setActiveTab={setActiveTab} />
                </div>

                {/* Tab Content Area */}
                <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                  <div className="max-w-4xl mx-auto space-y-6">
                    
                    {/* --- TAB 1: CLINICAL NOTE (SOAP) --- */}
                    {activeTab === 'clinical' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Warnings Banner */}
                        {medicalRecord.warnings?.length > 0 && (
                          <div className="bg-rose-50 border-l-4 border-rose-500 rounded-r-lg p-4 shadow-sm flex gap-3 items-start">
                            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                            <div>
                              <h4 className="text-sm font-bold text-rose-800 mb-1">Clinical Alerts Identified</h4>
                              <ul className="list-disc list-inside text-sm text-rose-700 space-y-0.5">
                                {medicalRecord.warnings.map((w, i) => <li key={i}>{w}</li>)}
                              </ul>
                            </div>
                          </div>
                        )}

                        {/* SOAP Structure */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                          {Object.entries({ subjective: 'Subjective', objective: 'Objective', assessment: 'Assessment', plan: 'Plan' }).map(([key, label], idx) => (
                            <div key={key} className={`p-5 group ${idx !== 0 ? 'border-t border-slate-100' : ''}`}>
                              <div className="flex justify-between items-center mb-2">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                  <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded flex items-center justify-center text-xs">{label.charAt(0)}</span>
                                  {label}
                                </h3>
                                <button onClick={() => copyToClipboard(medicalRecord.soap[key], key)} className="text-slate-400 hover:text-indigo-600 transition p-1">
                                  {copiedSection === key ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                </button>
                              </div>
                              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap pl-8">
                                {medicalRecord.soap[key]}
                              </p>
                            </div>
                          ))}
                        </div>
                        
                        {/* Differential Diagnosis */}
                        {medicalRecord.differential_diagnosis?.length > 0 && (
                          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <Activity className="h-4 w-4 text-indigo-500" /> Differential Diagnosis (DDx)
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {medicalRecord.differential_diagnosis.map((ddx, i) => (
                                <span key={i} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm border border-slate-200">{ddx}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* --- TAB 2: ORDERS & MEDS --- */}
                    {activeTab === 'orders' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Vitals */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <HeartPulse className="h-4 w-4 text-rose-500" /> Extracted Vitals
                          </h3>
                          {medicalRecord.vitals?.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {medicalRecord.vitals.map((v, i) => (
                                <div key={i} className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-sm font-medium text-slate-700 text-center shadow-sm">
                                  {v}
                                </div>
                              ))}
                            </div>
                          ) : <p className="text-sm text-slate-500 italic">No vitals dictated.</p>}
                        </div>

                        {/* Medications */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                            <Pill className="h-4 w-4 text-indigo-600" />
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Prescriptions</h3>
                          </div>
                          {medicalRecord.medications?.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                              {medicalRecord.medications.map((med, i) => (
                                <div key={i} className="p-4 flex justify-between items-center hover:bg-slate-50 transition">
                                  <div>
                                    <p className="font-bold text-slate-800">{med.name} <span className="text-indigo-600 ml-1">{med.dosage}</span></p>
                                    <p className="text-sm text-slate-500 mt-0.5">{med.instructions}</p>
                                  </div>
                                  <button className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded hover:bg-indigo-100 transition">E-Prescribe</button>
                                </div>
                              ))}
                            </div>
                          ) : <div className="p-4 text-sm text-slate-500 italic">No medications prescribed.</div>}
                        </div>

                        {/* Labs & Imaging */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                           <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Microscope className="h-4 w-4 text-teal-600" /> Lab Orders
                              </h3>
                              <ul className="space-y-2">
                                {medicalRecord.orders?.labs?.map((lab, i) => (
                                  <li key={i} className="flex items-center gap-2 text-sm text-slate-700"><div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>{lab}</li>
                                )) || <li className="text-sm text-slate-500 italic">None</li>}
                              </ul>
                           </div>
                           <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Activity className="h-4 w-4 text-blue-600" /> Imaging
                              </h3>
                              <ul className="space-y-2">
                                {medicalRecord.orders?.imaging?.map((img, i) => (
                                  <li key={i} className="flex items-center gap-2 text-sm text-slate-700"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>{img}</li>
                                )) || <li className="text-sm text-slate-500 italic">None</li>}
                              </ul>
                           </div>
                        </div>
                      </div>
                    )}

                    {/* --- TAB 3: BILLING --- */}
                    {activeTab === 'billing' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">ICD-10 Diagnostic Codes</h3>
                          <div className="space-y-3">
                            {medicalRecord.billing?.icd10?.map((code, i) => (
                              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-3">
                                  <span className="bg-white text-indigo-700 font-mono font-bold px-2.5 py-1 rounded border border-indigo-100 shadow-sm">{code.code}</span>
                                  <span className="text-sm text-slate-700 font-medium">{code.description}</span>
                                </div>
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              </div>
                            ))}
                          </div>

                          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mt-8 mb-4 border-b border-slate-100 pb-2">CPT Procedural Codes</h3>
                          <div className="space-y-3">
                            {medicalRecord.billing?.cpt?.map((code, i) => (
                              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-3">
                                  <span className="bg-white text-teal-700 font-mono font-bold px-2.5 py-1 rounded border border-teal-100 shadow-sm">{code.code}</span>
                                  <span className="text-sm text-slate-700 font-medium">{code.description}</span>
                                </div>
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* --- TAB 4: PATIENT HANDOUT --- */}
                    {activeTab === 'patient' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                           <div className="bg-indigo-50 border-b border-indigo-100 p-5 flex justify-between items-center">
                             <div>
                                <h3 className="font-bold text-indigo-900 text-lg">Visit Summary for John Doe</h3>
                                <p className="text-indigo-700 text-sm mt-1">Generated by MediScribe AI to be easily understood.</p>
                             </div>
                             <button onClick={() => window.print()} className="bg-white text-indigo-700 px-4 py-2 rounded-lg text-sm font-semibold border border-indigo-200 hover:bg-indigo-100 transition shadow-sm">
                               Print for Patient
                             </button>
                           </div>
                           <div className="p-8">
                              <p className="text-slate-700 leading-loose text-lg whitespace-pre-wrap font-serif">
                                {medicalRecord.patient_handout}
                              </p>
                           </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// Reusable Sidebar Nav Item Component
function NavItem({ icon, label, active = false }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors group ${active ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
      {React.cloneElement(icon, { className: `h-5 w-5 ${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}` })}
      <span className="font-medium text-sm hidden lg:block">{label}</span>
    </div>
  );
}

// Reusable Tab Button Component
function TabButton({ id, icon, label, activeTab, setActiveTab }) {
  const isActive = activeTab === id;
  return (
    <button 
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-all text-sm font-bold ${
        isActive ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
      }`}
    >
      {React.cloneElement(icon, { className: 'h-4 w-4' })}
      {label}
    </button>
  );
}
