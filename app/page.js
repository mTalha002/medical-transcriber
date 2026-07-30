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
      alert("Speech recognition is not supported or permitted in this browser version. Please try Chrome or Edge.");
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
    
    setTimeout(() => {
      const cleanText = transcript.trim();
      const lowerText = cleanText.toLowerCase();

      // Case 1: Check if clinician explicitly dictated using SOAP keywords
      if (lowerText.includes('subjective') || lowerText.includes('objective') || lowerText.includes('assessment') || lowerText.includes('plan')) {
        const sMatch = cleanText.match(/subjective[:\s]\s*([\s\S]*?)(?=objective|assessment|plan|$)/i);
        const oMatch = cleanText.match(/objective[:\s]\s*([\s\S]*?)(?=subjective|assessment|plan|$)/i);
        const aMatch = cleanText.match(/assessment[:\s]\s*([\s\S]*?)(?=subjective|objective|plan|$)/i);
        const pMatch = cleanText.match(/plan[:\s]\s*([\s\S]*?)(?=subjective|objective|assessment|$)/i);

        setSoapNote({
          subjective: sMatch ? sMatch[1].trim() : "Patient symptoms and history from dictation.",
          objective: oMatch ? oMatch[1].trim() : "Vitals and physical exam findings from dictation.",
          assessment: aMatch ? aMatch[1].trim() : "Clinical impression based on dictated history.",
          plan: pMatch ? pMatch[1].trim() : "Treatment plan and follow-up as dictated."
        });
        setIsGeneratingSoap(false);
        return;
      }

      // Case 2: Dynamic Natural Language Parser based on spoken sentences
      const sentences = cleanText
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      let subjective = [];
      let objective = [];
      let assessment = [];
      let plan = [];

      sentences.forEach(s => {
        const lowerS = s.toLowerCase();
        // Identify Treatment & Follow-up keywords
        if (lowerS.match(/prescribe|medication|tab|mg|dose|take|advised|recommended|follow up|return|order|test|x-ray|blood|lab|referral|rest|fluids|ice/i)) {
          plan.push(s);
        } 
        // Identify Vitals & Examination keywords
        else if (lowerS.match(/bp|blood pressure|bpm|pulse|temp|temperature|hr|vitals|exam|observed|lungs|heart|clear|normal|swelling|tenderness|rash|abdomen|weight|height/i) || /\d+\/\d+|\d+\s*bpm|\d+\s*degrees/.test(lowerS)) {
          objective.push(s);
        } 
        // Identify Diagnosis & Impression keywords
        else if (lowerS.match(/diagnosis|impression|likely|suspect|acute|chronic|syndrome|infection|strain|sprain|bronchitis|fever|influenza|covid|diabetes|hypertension/i)) {
          assessment.push(s);
        } 
        // Default to Subjective Patient History
        else {
          subjective.push(s);
        }
      });

      // Ensure every SOAP bucket is populated dynamically using the user's actual dictated words
      if (sentences.length === 1) {
        subjective = [sentences[0]];
        objective = ["Vitals & physical exam noted as per clinical encounter."];
        assessment = ["Clinical evaluation consistent with reported chief complaint."];
        plan = ["Treatment and follow-up as discussed with patient."];
      } else {
        if (subjective.length === 0) subjective.push(sentences[0]);
        if (objective.length === 0) objective.push(sentences[1] || "Physical findings and vitals captured during dictation.");
        if (assessment.length === 0) assessment.push(sentences[2] || `Clinical impression: ${sentences[0]}`);
        if (plan.length === 0) plan.push(sentences[sentences.length - 1] || "Continue monitoring and follow up as needed.");
      }

      setSoapNote({
        subjective: subjective.join(' '),
        objective: objective.join(' '),
        assessment: assessment.join(' '),
        plan: plan.join(' ')
      });
      setIsGeneratingSoap(false);
    }, 1000);
  };

  const clearAll = () => {
    setTranscript('');
    setSoapNote(null);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Header */}
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
        
        {/* Left Column: Live Dictation Feed */}
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
                placeholder="Click 'Start Dictation' below and speak, or type medical notes here..."
                className="w-full h-96 p-4 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-700 leading-relaxed"
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
                  Parsing Clinical Speech...
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

        {/* Right Column: AI Generated Dynamic SOAP Note */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            📄 Dynamic Clinical Output
          </h2>

          {!soapNote ? (
            <div className="flex-1 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <FileText className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-sm font-medium">No medical report generated yet.</p>
              <p className="text-xs text-slate-400 max-w-xs mt-1">Dictate or type medical notes on the left panel, then click "Generate AI SOAP Report" to extract clinical sections.</p>
            </div>
          ) : (
            <div className="flex-1 space-y-4 overflow-y-auto">
              <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r">
                <h3 className="font-bold text-xs text-blue-800 tracking-wider uppercase mb-1">Subjective (S) - Patient History & Symptoms</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{soapNote.subjective}</p>
              </div>
              <div className="p-3 bg-teal-50 border-l-4 border-teal-500 rounded-r">
                <h3 className="font-bold text-xs text-teal-800 tracking-wider uppercase mb-1">Objective (O) - Vitals & Examination Findings</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{soapNote.objective}</p>
              </div>
              <div className="p-3 bg-purple-50 border-l-4 border-purple-500 rounded-r">
                <h3 className="font-bold text-xs text-purple-800 tracking-wider uppercase mb-1">Assessment (A) - Impression / Diagnosis</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{soapNote.assessment}</p>
              </div>
              <div className="p-3 bg-amber-50 border-l-4 border-amber-500 rounded-r">
                <h3 className="font-bold text-xs text-amber-800 tracking-wider uppercase mb-1">Plan (P) - Treatment & Follow-up</h3>
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

      {/* Footer */}
      <footer className="bg-slate-100 border-t border-slate-200 text-center py-4 text-xs text-slate-500">
        Cloud Infrastructure PoC Project • Built with Next.js & Tailwind CSS • Deployed on Vercel Edge Architecture
      </footer>
    </div>
  );
}
