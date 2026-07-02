import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import type { LiveServerMessage, Blob } from '@google/genai';
import { encode, decode, decodeAudioData } from '../utils/audio.ts';
import { GeminiLiveStatus } from '../types.ts';

interface StartSessionOptions {
  onTurnComplete: (userTranscript: string, aiTranscript: string) => void;
  systemInstruction: string;
}

export const useGeminiLive = () => {
  const [status, setStatus] = useState<GeminiLiveStatus>(GeminiLiveStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [userTranscript, setUserTranscript] = useState('');
  const [aiTranscript, setAiTranscript] = useState('');

  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const onTurnCompleteCallbackRef = useRef<((user: string, ai: string) => void) | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef(0);
  
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const cleanup = useCallback(() => {
    if (sourcesRef.current) {
        for (const source of sourcesRef.current.values()) {
            source.stop(0);
        }
        sourcesRef.current.clear();
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close();
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close();
    }
    sessionPromiseRef.current?.then(session => session.close()).catch(console.error);
    sessionPromiseRef.current = null;
  }, []);

  const stopSession = useCallback(() => {
    cleanup();
    setStatus(GeminiLiveStatus.IDLE);
    setUserTranscript('');
    setAiTranscript('');
    setError(null);
  }, [cleanup]);

  const startSession = useCallback(async ({ onTurnComplete, systemInstruction }: StartSessionOptions) => {
    setStatus(GeminiLiveStatus.CONNECTING);
    setError(null);
    setUserTranscript('');
    setAiTranscript('');
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';
    onTurnCompleteCallbackRef.current = onTurnComplete;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      outputAudioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      nextStartTimeRef.current = 0;

      // Strictly obtain API key from environment variable as per guidelines.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            if (!inputAudioContextRef.current) return;
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

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

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);
            setStatus(GeminiLiveStatus.LISTENING);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
                currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                setAiTranscript(currentOutputTranscriptionRef.current);
            } 
            if (message.serverContent?.inputTranscription) {
                currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                setUserTranscript(currentInputTranscriptionRef.current);
            }
            if (message.serverContent?.turnComplete) {
                if (onTurnCompleteCallbackRef.current) {
                  onTurnCompleteCallbackRef.current(currentInputTranscriptionRef.current, currentOutputTranscriptionRef.current);
                }
                currentInputTranscriptionRef.current = '';
                currentOutputTranscriptionRef.current = '';
                setUserTranscript('');
                setAiTranscript('');
            }

            const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64EncodedAudioString && outputAudioContextRef.current) {
                const audioBytes = decode(base64EncodedAudioString);
                const audioBuffer = await decodeAudioData(audioBytes, outputAudioContextRef.current, 24000, 1);
                
                const source = outputAudioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputAudioContextRef.current.destination);
                
                source.addEventListener('ended', () => {
                    sourcesRef.current.delete(source);
                });

                const currentTime = outputAudioContextRef.current.currentTime;
                const startTime = Math.max(currentTime, nextStartTimeRef.current);

                source.start(startTime);
                nextStartTimeRef.current = startTime + audioBuffer.duration;
                sourcesRef.current.add(source);
            }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
                for (const source of sourcesRef.current.values()) {
                    source.stop(0);
                    sourcesRef.current.delete(source);
                }
                nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Gemini Live API Error:', e);
            setError('Connection error. Please try again.');
            setStatus(GeminiLiveStatus.ERROR);
            cleanup();
          },
          onclose: (e: CloseEvent) => {
            stopSession();
          },
        },
        config: {
          systemInstruction: systemInstruction,
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
        },
      });
      await sessionPromiseRef.current;
    } catch (err: any) {
      console.error('Failed to start session:', err);
      setError('Could not access microphone or connection failed.');
      setStatus(GeminiLiveStatus.ERROR);
      cleanup();
    }
  }, [cleanup, stopSession]);

  return { status, error, userTranscript, aiTranscript, startSession, stopSession };
};