import { useRef, useCallback, useEffect } from "react";

interface VoiceMessage {
  text: string;
  id: string;
}

export const useVoiceQueue = () => {
  const queueRef = useRef<VoiceMessage[]>([]);
  const isSpeakingRef = useRef(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    return () => {
      synthRef.current?.cancel();
    };
  }, []);

  const processQueue = useCallback(() => {
    if (isSpeakingRef.current || queueRef.current.length === 0 || !synthRef.current) return;

    const message = queueRef.current.shift()!;
    isSpeakingRef.current = true;

    const utterance = new SpeechSynthesisUtterance(message.text);
    utterance.lang = "es-CL";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to find a Spanish voice
    const voices = synthRef.current.getVoices();
    const spanishVoice = voices.find(v => v.lang.startsWith("es"));
    if (spanishVoice) utterance.voice = spanishVoice;

    utterance.onend = () => {
      isSpeakingRef.current = false;
      // Small delay between messages
      setTimeout(() => processQueue(), 500);
    };

    utterance.onerror = () => {
      isSpeakingRef.current = false;
      setTimeout(() => processQueue(), 500);
    };

    synthRef.current.speak(utterance);
  }, []);

  const enqueue = useCallback((text: string) => {
    const id = Date.now().toString();
    queueRef.current.push({ text, id });
    processQueue();
  }, [processQueue]);

  const announcePatient = useCallback((patientName: string, boxName: string) => {
    const message = `${patientName}, por favor dirigirse al Box ${boxName}`;
    enqueue(message);
  }, [enqueue]);

  return { announcePatient, enqueue };
};
