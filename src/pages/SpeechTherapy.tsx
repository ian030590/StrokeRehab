import React, { useState, useEffect, useRef } from 'react';
import { Mic, AlertCircle, Play, Square, CheckCircle } from 'lucide-react';

const SpeechTherapy: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [targetWord] = useState('蘋果');
  const [feedback, setFeedback] = useState('');
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.lang = 'zh-TW';
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            currentTranscript += trans;
          }
        }
        
        if (currentTranscript) {
          setTranscript(currentTranscript);
          if (currentTranscript.includes(targetWord)) {
            setFeedback('非常正確！您發音很棒。');
            speak('非常正確！');
            setIsListening(false);
            recognitionRef.current?.stop();
          } else {
            setFeedback('再試一次，或是點擊聽提示音。');
          }
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [targetWord]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      setFeedback('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-TW';
    utterance.rate = 0.8; // Slower rate for patients
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Mic size={32} color="var(--primary-hover)" />
        <h1>語音與語言復健</h1>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h2 style={{ marginBottom: '2rem' }}>看圖命名與詞彙提取</h2>
        
        <div style={{ 
          width: '200px', 
          height: '200px', 
          background: 'white', 
          borderRadius: '16px', 
          margin: '0 auto 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '5rem'
        }}>
          🍎
        </div>

        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          請看著上方的圖片，並清楚說出它的名稱。
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button 
            className={`btn ${isListening ? 'btn-secondary' : 'btn-primary'}`} 
            onClick={toggleListening}
          >
            {isListening ? (
              <><Square size={20} /> 停止錄音</>
            ) : (
              <><Mic size={20} /> 開始錄音</>
            )}
          </button>
          
          <button className="btn btn-secondary" onClick={() => speak(targetWord)}>
            <Play size={20} /> 聽提示音
          </button>
        </div>

        {transcript && (
          <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '1rem' }}>
            <p>您說的是：<strong>{transcript}</strong></p>
          </div>
        )}

        {feedback && (
          <div style={{ 
            padding: '1rem', 
            borderRadius: '8px', 
            background: feedback.includes('正確') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: feedback.includes('正確') ? 'var(--accent-color)' : 'var(--error-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}>
            {feedback.includes('正確') ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            {feedback}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeechTherapy;
