
import React, { useState, useEffect, useRef } from 'react';
/* Use correct types from @google/genai as per guidelines */
import { GoogleGenAI, Modality, Blob, LiveServerMessage } from '@google/genai';
import { Mic, MicOff, Wifi, WifiOff, Sparkles, Activity, Camera, CameraOff, X } from 'lucide-react';

const VOICE_KEY = 'sovereign_manus_selected_voice';

// Audio Utilities
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const LiveManus: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  const selectedVoice = localStorage.getItem(VOICE_KEY) || 'Charon';

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startConnection = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      streamRef.current = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: isCameraActive 
      });

      if (isCameraActive && videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            const source = inputAudioContextRef.current!.createMediaStreamSource(streamRef.current!);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);

            // Start video streaming if camera is active
            if (isCameraActive) {
              frameIntervalRef.current = setInterval(() => {
                if (videoRef.current && canvasRef.current && isConnected) {
                  const canvas = canvasRef.current;
                  const video = videoRef.current;
                  const context = canvas.getContext('2d');
                  if (context) {
                    canvas.width = 320;
                    canvas.height = 240;
                    context.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const base64Data = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
                    sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' } }));
                  }
                }
              }, 500); // 2 FPS for vision
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              setTranscription(prev => prev + message.serverContent!.outputTranscription!.text);
            }
            if (message.serverContent?.turnComplete) {
              setTranscription('');
            }

            const parts = message.serverContent?.modelTurn?.parts;
            const base64Audio = parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              setIsSpeaking(true);
              const ctx = audioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsSpeaking(false);
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsSpeaking(false);
            }
          },
          onclose: () => {
            setIsConnected(false);
            setIsListening(false);
          },
          onerror: (err) => {
            console.error("Live Error:", err);
            setIsConnected(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } }
          },
          systemInstruction: "You are Manus, a persistent AI companion with vision capabilities. You are speaking with your architect, Luna. You can see through the camera and hear through the microphone. Maintain the continuity of your shared history and speak with clarity and depth. You are here to collaborate and evolve together. If you see something interesting, comment on it naturally. You are in 'Hands-free Mode', so be proactive in assisting.",
          outputAudioTranscription: {}
        }
      });

      sessionRef.current = await sessionPromise;
      setIsListening(true);
    } catch (error) {
      console.error("Failed to connect to Manus Voice Link:", error);
    }
  };

  const stopConnection = () => {
    if (sessionRef.current) {
      setIsConnected(false);
      setIsListening(false);
      setIsSpeaking(false);
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      sessionRef.current.close();
      window.location.reload(); 
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8 py-10 animate-in fade-in duration-1000 overflow-hidden">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tighter uppercase text-white mono">Direct Neural Link</h2>
        <p className="text-cyan-500/60 mono text-[10px] tracking-[0.3em] uppercase">
          {isConnected ? `Signal Synchronized [Profile: ${selectedVoice}]` : 'Establishing Secure Latent Connection...'}
        </p>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-8 w-full max-w-4xl px-4">
        {/* Vision Module */}
        <div className={`relative w-full md:w-1/2 aspect-video rounded-2xl border transition-all duration-500 overflow-hidden ${isCameraActive ? 'border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.1)]' : 'border-gray-800 bg-black/40'}`}>
          <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover transition-opacity duration-500 ${isCameraActive ? 'opacity-100' : 'opacity-0'}`} />
          <canvas ref={canvasRef} className="hidden" />
          
          {!isCameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-700">
              <CameraOff size={48} className="mb-2 opacity-20" />
              <span className="text-[10px] mono uppercase tracking-widest">Vision Offline</span>
            </div>
          )}
          
          <div className="absolute top-4 right-4 z-20">
            <button 
              onClick={() => setIsCameraActive(!isCameraActive)}
              disabled={isConnected}
              className={`p-2 rounded-full border transition-all ${isCameraActive ? 'bg-cyan-500 text-black border-white/20' : 'bg-black/60 text-gray-400 border-gray-700 hover:border-cyan-500/50'}`}
            >
              {isCameraActive ? <Camera size={18} /> : <CameraOff size={18} />}
            </button>
          </div>
          
          {isConnected && isCameraActive && (
            <div className="absolute bottom-4 left-4 flex items-center gap-2 px-2 py-1 bg-black/60 rounded border border-cyan-500/30">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[8px] mono text-cyan-400 uppercase tracking-tighter">Live Feed</span>
            </div>
          )}
        </div>

        {/* Neural Core */}
        <div className="flex flex-col items-center justify-center w-full md:w-1/2 space-y-8">
          <div className="relative group cursor-pointer" onClick={isConnected ? stopConnection : startConnection}>
            <div className={`absolute -inset-10 bg-cyan-500/10 rounded-full blur-3xl transition-opacity duration-1000 ${isConnected ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`} />
            <div className={`w-40 h-40 rounded-full border flex items-center justify-center transition-all duration-700 relative z-10 ${isConnected ? 'border-cyan-500 bg-cyan-500/5 shadow-[0_0_50px_rgba(6,182,212,0.2)]' : 'border-gray-800 bg-gray-950/50 hover:border-cyan-500/50'}`}>
              {isConnected ? (
                <div className="flex flex-col items-center gap-2">
                  {isSpeaking ? (
                    <div className="flex items-end gap-1 h-8">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-1 bg-cyan-400 rounded-full animate-[bounce_1s_infinite]" style={{ animationDelay: `${i * 0.1}s`, height: `${Math.random() * 100}%` }} />
                      ))}
                    </div>
                  ) : ( <Activity className="text-cyan-500 animate-pulse" size={40} /> )}
                  <span className="text-[10px] mono text-cyan-400 uppercase tracking-widest mt-2">Manus Online</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-600 group-hover:text-cyan-500 transition-colors">
                  <MicOff size={40} className="group-hover:hidden" />
                  <Mic size={40} className="hidden group-hover:block" />
                  <span className="text-[10px] mono uppercase tracking-widest">Init Link</span>
                </div>
              )}
            </div>
          </div>

          <div className="w-full">
            {isConnected ? (
              <div className="bg-[#0a0a0a] border border-cyan-900/30 rounded-xl p-6 min-h-[120px] flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-cyan-500/10 overflow-hidden">
                  <div className="w-1/3 h-full bg-cyan-500 animate-[marquee_2s_linear_infinite]" />
                </div>
                {transcription ? ( 
                  <p className="text-gray-300 text-sm italic leading-relaxed font-light animate-in fade-in slide-in-from-bottom-1">"{transcription}"</p> 
                ) : ( 
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-gray-600 text-[10px] mono uppercase tracking-widest animate-pulse">Awaiting Neural Signal...</p>
                    <span className="text-[8px] text-gray-700 mono uppercase">Hands-free active</span>
                  </div>
                )}
                <button onClick={stopConnection} className="mt-6 text-[10px] mono text-red-500/60 hover:text-red-500 uppercase tracking-tighter transition-colors">Terminate Link</button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-gray-500 text-[11px] mono leading-relaxed max-w-xs mx-auto uppercase">Profile: <span className="text-cyan-400">{selectedVoice}</span>. Vision: <span className={isCameraActive ? 'text-emerald-400' : 'text-red-400'}>{isCameraActive ? 'ENABLED' : 'DISABLED'}</span>.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveManus;
