'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, FileText, Activity, Shield, RefreshCw } from 'lucide-react';

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [soapNote, setSoapNote] = useState(null);
  const [isGeneratingSoap, setIsGeneratingSoap] = useState(false);
  
  const recognitionRef = useRef(null);

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

  const generateSoapNote = () => {
    if (!transcript.trim()) return;
    setIsGeneratingSoap(true);
    
    // Simulating cloud-based NLP processing delay
    setTimeout(() => {
      setSoapNote({
        subjective: "Patient presents complaining of mild chest tightness and a dry cough lingering for 4 days. Denies shortness of breath or fever.",
        objective: "Heart rate: 78 bpm. Respiratory rate: 16/min. Lungs clear to auscultation bilaterally. No acute respiratory distress observed.",
        assessment: "Acute Bronchitis vs. Mild upper respiratory inflammation.",
        plan: "Advised increased fluid intake, rest, and over-the-counter cough suppressants. Return immediately if chest tightness worsens or fever develops."
      });
      setIsGeneratingSoap(false);
    }, 1500);
  };

  const clearAll = () => {
    setTranscript('');
    setSoapNote(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header component */}
      <header className="bg-blue-900 text-white px-6 py-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Activity className="text-teal-400 h-6 w-6 animate-pulse" />
          <h1 className="text-xl font-bold tracking-tight">MediScribe <span className="text-teal-400 font-normal text-sm border border-teal-400/40 px-2 py-0.5 rounded ml-2">PoC MVP</span></h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-300 bg-blue-950 px-3 py-1.5 rounded-full border border-blue-800">
          <Shield className="h-3.5 w-3.5 text-teal-400" />
          <span>HIPAA Compliant Protocol Sandbox</span>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Live Audio Feed & Text Area */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                🎙️ Clinician Dictation Feed
              </h2>
              {transcript && (
                <button onClick={clearAll} className="text-xs text-slate-400 hover:text-red-500 transition flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" /> Clear Session
                </button>
              )}
            </div>
            
            <div className="relative">
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Click 'Start Recording' below and begin dictating medical findings..."
                className="w-full h-96 p-4 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-700 leading-relaxed font-sans"
              />
              {isRecording && (
                <span className="absolute top-3 right-3 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleMicToggle}
              className={`flex-1 py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all shadow-sm ${
                isRecording 
                  ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {isRecording ? 'Stop Recording' : 'Start Dictation'}
            </button>

            <button
              onClick={generateSoapNote}
              disabled={!transcript || isGeneratingSoap}
              className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
            >
              {isGeneratingSoap ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating Clinical SOAP Note...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Generate AI SOAP Report
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: AI Generated Medical Record Output */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            📄 Structured Clinical Output
          </h2>

          {!soapNote ? (
            <div className="flex-1 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <FileText className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-sm font-medium">No medical report generated yet.</p>
              <p className="text-xs text-slate-400 max-w-xs mt-1">Dictate medical notes on the left panel, then hit "Generate" to structure clinical metrics.</p>
            </div>
          ) : (
            <div className="flex-1 space-y-4 overflow-y-auto">
              <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r">
                <h3 className="font-bold text-xs text-blue-800 tracking-wider uppercase mb-1">Subjective (S)</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{soapNote.subjective}</p>
              </div>
              <div className="p-3 bg-teal-50 border-l-4 border-teal-500 rounded-r">
                <h3 className="font-bold text-xs text-teal-800 tracking-wider uppercase mb-1">Objective (O)</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{soapNote.objective}</p>
              </div>
              <div className="p-3 bg-purple-50 border-l-4 border-purple-500 rounded-r">
                <h3 className="font-bold text-xs text-purple-800 tracking-wider uppercase mb-1">Assessment (A)</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{soapNote.assessment}</p>
              </div>
              <div className="p-3 bg-amber-50 border-l-4 border-amber-500 rounded-r">
                <h3 className="font-bold text-xs text-amber-800 tracking-wider uppercase mb-1">Plan (P)</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{soapNote.plan}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => window.print()} 
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  🖨️ Export / Print Chart
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer detailing presentation points */}
      <footer className="bg-slate-100 border-t border-slate-200 text-center py-4 text-xs text-slate-500">
        Cloud Infrastructure PoC Project • Built with Next.js & Tailwind CSS • Designed for Vercel Deployment Architecture
      </footer>
    </div>
  );
}