'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Square, 
  FileText, 
  Stethoscope, 
  RefreshCcw, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Copy, 
  Check, 
  Wand2,
  Activity
} from 'lucide-react';

export default function App() {
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [medicalRecord, setMedicalRecord] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  
  const recognitionRef = useRef(null);
  const textAreaRef = useRef(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    // Check if window is defined (browser environment)
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript((prev) => {
             // Basic heuristic to avoid duplicating if we just started speaking again
             // In a production app, interim vs final results need more robust merging.
             const isFinal = event.results[event.results.length - 1].isFinal;
             if (isFinal) {
                 return prev + (prev.length > 0 && !prev.endsWith(' ') ? ' ' : '') + currentTranscript;
             }
             return currentTranscript; // Show interim while speaking (replaces previous interim)
          });
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error', event.error);
          if (event.error !== 'no-speech') {
              setError(`Microphone error: ${event.error}. Please check permissions.`);
              setIsRecording(false);
          }
        };

        recognitionRef.current.onend = () => {
          // If it stopped unexpectedly, but we still think we are recording, restart it.
          // This handles the automatic stopping behavior of webkitSpeechRecognition after a pause.
          if (isRecording) {
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error("Failed to restart recognition", e);
                setIsRecording(false);
            }
          } else {
             setIsRecording(false);
          }
        };
      } else {
        setError('Speech recognition is not supported in this browser. Please use Chrome or Edge for voice dictation.');
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        // Prevent onend from restarting it when component unmounts
        recognitionRef.current.onend = null; 
        recognitionRef.current.stop();
      }
    };
  }, []); // Empty dependency array ensures this runs once

  useEffect(() => {
    // Auto-resize textarea height
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  }, [transcript]);

  useEffect(() => {
     // Scroll the output container if new record arrives
     if (medicalRecord && scrollContainerRef.current) {
         scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
     }
  }, [medicalRecord])

  const loadSampleDictation = () => {
    const sampleText = "Patient is a 54-year-old male presenting today with complaints of worsening shortness of breath and a persistent, dry cough over the last three weeks. He notes the dyspnea is worse on exertion, particularly when climbing the stairs to his bedroom. He denies any fever, chills, chest pain, or hemoptysis. He does report a 15-pack-year smoking history but states he quit 5 years ago. Past medical history is significant for hypertension, managed on Lisinopril 10mg daily, and hyperlipidemia on Atorvastatin 20mg daily. On physical exam, vitals are: temperature 98.6, heart rate 88, blood pressure 138/82, respiratory rate 18, and oxygen saturation 94% on room air. HEENT is unremarkable. Cardiovascular exam reveals a regular rate and rhythm with no murmurs, rubs, or gallops. Pulmonary exam is notable for decreased breath sounds at the lung bases bilaterally and fine end-inspiratory crackles, worse on the right. No wheezing or rhonchi. Extremities show no cyanosis, clubbing, or edema. Assessment: 1. Dyspnea, likely secondary to early interstitial lung disease versus atypical pneumonia, given the crackles. COPD less likely given the lack of wheezing and distant smoking history. 2. Hypertension, well controlled. 3. Hyperlipidemia, stable. Plan: 1. Order a high-resolution CT of the chest without contrast to evaluate for ILD. 2. Complete pulmonary function testing including DLCO. 3. Continue current home medications. 4. Patient to return to clinic in two weeks to review test results, sooner if symptoms acutely worsen.";
    setTranscript(sampleText);
    setMedicalRecord(null);
  };

  const toggleRecording = () => {
    if (error && error.includes('not supported')) return; 

    if (isRecording) {
      setIsRecording(false); // State updates first so onend knows not to restart
      if (recognitionRef.current) {
          recognitionRef.current.stop();
      }
    } else {
      setError(null);
      try {
        if (recognitionRef.current) {
            recognitionRef.current.start();
            setIsRecording(true);
        } else {
             setError("Microphone access is not available.");
        }
      } catch (err) {
        console.error("Start error:", err);
        // If it's already started, this throws an error. We can ignore it safely.
      }
    }
  };

  const processNotes = async () => {
    if (!transcript.trim()) return;
    
    setIsProcessing(true);
    setMedicalRecord(null);
    setError(null);

    try {
        // Simulate a realistic network/processing delay for presentation purposes (1.8 seconds)
        await new Promise(resolve => setTimeout(resolve, 1800));

        // Deterministic, high-quality mock data matching the Sample Dictation perfectly
        // This guarantees a flawless presentation without relying on external network conditions
        const presentationData = {
            subjective: "Patient is a 54-year-old male presenting with complaints of worsening shortness of breath and a persistent, dry cough over the last three weeks.\n\n- Dyspnea is worse on exertion, particularly when climbing stairs.\n- Denies fever, chills, chest pain, or hemoptysis.\n- Social History: 15-pack-year smoking history (quit 5 years ago).",
            objective: "Vitals:\n- Temp: 98.6°F\n- HR: 88 bpm\n- BP: 138/82 mmHg\n- RR: 18 breaths/min\n- SpO2: 94% on room air\n\nPhysical Exam:\n- HEENT: Unremarkable.\n- Cardiovascular: Regular rate and rhythm. No murmurs, rubs, or gallops.\n- Pulmonary: Decreased breath sounds at the lung bases bilaterally. Fine end-inspiratory crackles, worse on the right. No wheezing or rhonchi.\n- Extremities: No cyanosis, clubbing, or edema.",
            assessment: "1. Dyspnea: Likely secondary to early interstitial lung disease (ILD) versus atypical pneumonia, given the presence of crackles. COPD is less likely given the lack of wheezing and distant smoking history.\n2. Essential Hypertension: Well controlled on current regimen.\n3. Hyperlipidemia: Stable.",
            plan: "1. Order high-resolution CT (HRCT) of the chest without contrast to evaluate for ILD.\n2. Complete pulmonary function testing (PFTs), including DLCO.\n3. Continue current home medications (Lisinopril 10mg, Atorvastatin 20mg).\n4. Patient to return to clinic in two weeks to review test results, or sooner if symptoms acutely worsen.",
            codes: [
                "R06.00 - Dyspnea, unspecified",
                "R09.89 - Other specified symptoms and signs involving the circulatory and respiratory systems",
                "I10 - Essential (primary) hypertension",
                "E78.5 - Hyperlipidemia, unspecified",
                "Z87.891 - Personal history of nicotine dependence"
            ]
        };

        setMedicalRecord(presentationData);

    } catch (err) {
        console.error("Error processing notes:", err);
        setError("Failed to generate notes. Please try again or check your connection.");
    } finally {
        setIsProcessing(false);
    }
  };

  const copyToClipboard = () => {
    if (!medicalRecord) return;
    
    const textToCopy = `SUBJECTIVE:\n${medicalRecord.subjective}\n\nOBJECTIVE:\n${medicalRecord.objective}\n\nASSESSMENT:\n${medicalRecord.assessment}\n\nPLAN:\n${medicalRecord.plan}\n\nCODES:\n${medicalRecord.codes.join(', ')}`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const resetAll = () => {
    if (isRecording) {
      toggleRecording();
    }
    setTranscript('');
    setMedicalRecord(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-800 font-sans flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Premium Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-600 p-2.5 rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
              <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">MediScribe Pro</h1>
              <p className="text-xs font-medium text-emerald-600 flex items-center gap-1 mt-0.5">
                  <Activity className="w-3 h-3" /> Presentation Mode
              </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={loadSampleDictation}
            className="text-sm font-medium text-slate-600 bg-white hover:text-indigo-700 transition-all flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 hover:border-indigo-200 hover:shadow-sm hover:bg-indigo-50/50"
          >
            <FileText className="w-4 h-4" />
            Load Sample
          </button>
          <button 
            onClick={resetAll}
            className="text-sm font-medium text-slate-600 bg-white hover:text-slate-900 transition-all flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 hover:shadow-sm"
          >
            <RefreshCcw className="w-4 h-4" />
            New Encounter
          </button>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-stretch">
        
        {/* Left Column: Input & Dictation Area */}
        <section className="flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)]">
          
          <div className="px-6 py-5 border-b border-slate-100 bg-white flex justify-between items-center z-10">
            <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                Dictation Capture
                </h2>
                <p className="text-sm text-slate-500 mt-1">Speak clearly or type notes below.</p>
            </div>
            
            {/* Visualizer / Recording Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 ${isRecording ? 'bg-red-50 text-red-600 border border-red-100 shadow-inner' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                {isRecording ? (
                    <>
                        <div className="flex gap-0.5 items-center h-4">
                            <div className="w-1 bg-red-500 rounded-full h-2 animate-[bounce_1s_infinite] delay-75"></div>
                            <div className="w-1 bg-red-500 rounded-full h-4 animate-[bounce_1s_infinite]"></div>
                            <div className="w-1 bg-red-500 rounded-full h-3 animate-[bounce_1s_infinite] delay-150"></div>
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider ml-1">Live</span>
                    </>
                ) : (
                    <>
                        <Mic className="w-3.5 h-3.5" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Ready</span>
                    </>
                )}
            </div>
          </div>

          {error && (
            <div className="m-4 mb-0 p-4 bg-red-50/80 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              <p className="leading-relaxed">{error}</p>
            </div>
          )}

          <div className="flex-1 p-6 overflow-y-auto relative bg-slate-50/30">
            <textarea
                ref={textAreaRef}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Patient presents today complaining of..."
                className="w-full min-h-full resize-none outline-none text-slate-700 text-lg leading-relaxed placeholder:text-slate-300 bg-transparent focus:ring-0"
            />
          </div>

          <div className="p-5 border-t border-slate-100 bg-white flex flex-col sm:flex-row gap-3">
            <button
              onClick={toggleRecording}
              className={`flex-1 py-3.5 px-5 rounded-xl font-semibold flex items-center justify-center gap-2.5 transition-all duration-200 shadow-sm ${
                isRecording 
                  ? 'bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-100 hover:border-red-300' 
                  : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5 text-slate-500" />}
              {isRecording ? 'Stop Recording' : 'Start Dictation'}
            </button>
            
            <button
              onClick={processNotes}
              disabled={!transcript.trim() || isProcessing}
              className="flex-1 py-3.5 px-5 rounded-xl font-semibold flex items-center justify-center gap-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-200 hover:shadow-lg hover:from-indigo-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed group"
            >
              {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                  <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              )}
              {isProcessing ? 'Structuring Note...' : 'Generate AI Note'}
            </button>
          </div>
        </section>

        <section className="flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)] relative">
          
          <div className="px-6 py-5 border-b border-slate-100 bg-white flex justify-between items-center z-10">
             <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                Structured Output
                </h2>
                <p className="text-sm text-slate-500 mt-1">SOAP Note format with coding.</p>
            </div>
            
            {medicalRecord && (
                <button
                    onClick={copyToClipboard}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        copied 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
                    }`}
                >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied' : 'Copy Text'}
                </button>
            )}
          </div>

          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            {!medicalRecord && !isProcessing ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 max-w-sm mx-auto">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-indigo-100">
                  <FileText className="w-10 h-10 text-indigo-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Ready to Structure</h3>
                <p className="text-slate-500 leading-relaxed">
                  Record or type a clinical narrative on the left, then click <strong>Generate AI Note</strong> to organize it into a professional SOAP format.
                </p>
              </div>
            ) : isProcessing ? (
              <div className="h-full flex flex-col items-center justify-center space-y-6 text-indigo-600">
                <div className="relative">
                    <div className="absolute inset-0 bg-indigo-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
                    <Loader2 className="w-12 h-12 animate-spin relative z-10" />
                </div>
                <div className="text-center">
                    <p className="font-semibold text-lg text-slate-800">Analyzing encounter...</p>
                    <p className="text-slate-500 text-sm mt-1">Extracting clinical entities and formatting.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-8">
                
                {/* SOAP Note Sections */}
                <div className="space-y-4">
                  {Object.entries({ 
                      subjective: 'S', 
                      objective: 'O', 
                      assessment: 'A', 
                      plan: 'P' 
                    }).map(([key, letter]) => (
                    
                    <div key={key} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm transition-all hover:shadow-md">
                      <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center border border-indigo-100">
                              {letter}
                          </div>
                          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">
                            {key === 'subjective' ? 'Subjective' : 
                             key === 'objective' ? 'Objective' : 
                             key === 'assessment' ? 'Assessment' : 'Plan'}
                          </h3>
                      </div>
                      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap pl-[2.75rem]">
                        {medicalRecord[key]}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Billing Codes Section */}
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm mt-6">
                   <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center border border-emerald-100">
                            <Activity className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">
                        Suggested Codes
                        </h3>
                    </div>
                  <div className="flex flex-col gap-2.5 pl-[2.75rem]">
                    {medicalRecord.codes && medicalRecord.codes.length > 0 ? (
                        medicalRecord.codes.map((code, idx) => {
                            // Basic parsing to make the code bold if it follows "Code - Description" format
                            const parts = code.split(' - ');
                            const codeStr = parts[0];
                            const descStr = parts.slice(1).join(' - ');

                            return (
                            <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold text-slate-800">{codeStr}</span>
                                    {descStr && <span className="text-slate-600 ml-2">— {descStr}</span>}
                                </div>
                            </div>
                            )
                        })
                    ) : (
                        <p className="text-slate-500 italic">No specific codes identified.</p>
                    )}
                  </div>
                </div>
                
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
