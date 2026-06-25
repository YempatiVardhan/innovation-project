"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface AnalysisResult {
  animalType: string;
  healthScore: number;
  healthStatus: "Excellent" | "Good" | "Fair" | "Poor" | "Critical";
  observations: string[];
  concerns: string[];
  recommendations: string[];
  summary: string;
}

const STATUS_COLORS: Record<string, string> = {
  Excellent: "text-emerald-600 bg-emerald-50 border-emerald-200",
  Good: "text-green-600 bg-green-50 border-green-200",
  Fair: "text-yellow-600 bg-yellow-50 border-yellow-200",
  Poor: "text-orange-600 bg-orange-50 border-orange-200",
  Critical: "text-red-600 bg-red-50 border-red-200",
};

const SCORE_BAR_COLORS: Record<string, string> = {
  Excellent: "bg-emerald-500",
  Good: "bg-green-500",
  Fair: "bg-yellow-500",
  Poor: "bg-orange-500",
  Critical: "bg-red-500",
};

export default function Home() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const baseTextRef = useRef<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const SR = typeof window !== "undefined"
      ? (window.SpeechRecognition || (window as any).webkitSpeechRecognition)
      : null;
    setSpeechSupported(!!SR);
  }, []);

  const toggleListening = useCallback(() => {
    const SR = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition: SpeechRecognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    baseTextRef.current = description.trimEnd();
    let sessionFinal = "";

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) sessionFinal += t;
        else interim = t;
      }
      const spoken = (sessionFinal + interim).trim();
      const base = baseTextRef.current;
      setDescription(base ? `${base} ${spoken}` : spoken);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10MB.");
      return;
    }
    setImageFile(file);
    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleSubmit = async () => {
    if (!imageFile) {
      setError("Please upload an image of your animal.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("description", description);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setResult(data.analysis);

      // persist to history
      try {
        const entry = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          imagePreview: imagePreview,
          analysis: data.analysis,
        };
        const existing = JSON.parse(localStorage.getItem("vetHistory") || "[]");
        localStorage.setItem("vetHistory", JSON.stringify([entry, ...existing].slice(0, 50)));
      } catch {
        // storage quota exceeded — skip silently
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    recognitionRef.current?.stop();
    setIsListening(false);
    setImageFile(null);
    setImagePreview(null);
    setDescription("");
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const speak = (analysis: AnalysisResult) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const lines = [
      `Health analysis for ${analysis.animalType}.`,
      `Health status: ${analysis.healthStatus}. Score: ${analysis.healthScore} out of 10.`,
      analysis.summary,
    ];

    if (analysis.concerns.length > 0) {
      lines.push(`Concerns: ${analysis.concerns.join(". ")}.`);
    }

    if (analysis.recommendations.length > 0) {
      lines.push(`Recommendations: ${analysis.recommendations.join(". ")}.`);
    }

    const utterance = new SpeechSynthesisUtterance(lines.join(" "));
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="AI Vet Doctor" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI Vet Doctor</h1>
              <p className="text-xs text-gray-500">Smart Care. Healthier Pets.</p>
            </div>
          </div>
          <a
            href="/history"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 font-medium transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            History
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {!result ? (
          <div className="space-y-8">
            {/* Hero */}
            <div className="text-center space-y-3">
              <h2 className="text-4xl font-bold text-gray-900">
                How is your pet doing?
              </h2>
              <p className="text-lg text-gray-500 max-w-xl mx-auto">
                Upload a photo of your pet and describe any concerns. Our AI vet will assess their health and give you actionable advice.
              </p>
            </div>

            {/* Upload Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-6">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Animal Photo <span className="text-red-500">*</span>
                </label>

                {imagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden bg-gray-50 border border-gray-200">
                    <img
                      src={imagePreview}
                      alt="Uploaded animal"
                      className="w-full max-h-72 object-contain"
                    />
                    <button
                      onClick={reset}
                      className="absolute top-3 right-3 bg-white/90 hover:bg-white text-gray-700 rounded-full w-8 h-8 flex items-center justify-center shadow-md text-sm transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={onDrop}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                      dragOver
                        ? "border-teal-400 bg-teal-50"
                        : "border-gray-200 hover:border-teal-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="text-5xl mb-4">📷</div>
                    <p className="text-gray-700 font-medium">
                      Drop your photo here or{" "}
                      <span className="text-teal-600 underline">browse</span>
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      JPG, PNG, WebP — up to 10MB
                    </p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                  className="hidden"
                />
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    Describe symptoms or ask a question
                  </label>
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={toggleListening}
                      title={isListening ? "Stop recording" : "Speak your description"}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        isListening
                          ? "bg-red-50 border-red-300 text-red-600 hover:bg-red-100"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {isListening ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          Listening...
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm6.364 9.636a.75.75 0 0 1 .736.912A7.003 7.003 0 0 1 12.75 18.93V21h2.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5h2.5v-2.07a7.003 7.003 0 0 1-6.35-7.382.75.75 0 0 1 1.486.176 5.5 5.5 0 0 0 10.928 0 .75.75 0 0 1 .75-.638z"/>
                          </svg>
                          Speak
                        </>
                      )}
                    </button>
                  )}
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. My dog has been vomiting since this morning and seems very tired. Is this serious?"
                  rows={4}
                  className={`w-full rounded-2xl border px-5 py-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent resize-none text-sm transition-shadow ${
                    isListening ? "border-red-300 bg-red-50/30" : "border-gray-200"
                  }`}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !imageFile}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-blue-600 text-white font-semibold text-base transition-all hover:from-teal-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing your animal...
                  </span>
                ) : (
                  "Analyze Now"
                )}
              </button>
            </div>

            {/* How it works */}
            <div className="grid grid-cols-3 gap-6 text-center">
              {[
                { icon: "📸", title: "Upload Photo", desc: "Take or upload a clear photo of your animal" },
                { icon: "🤖", title: "AI Analysis", desc: "Claude AI examines health indicators in the image" },
                { icon: "💊", title: "Get Advice", desc: "Receive a health score and actionable recommendations" },
              ].map((step) => (
                <div key={step.title} className="bg-white/60 rounded-2xl p-5 space-y-2 border border-gray-100">
                  <div className="text-3xl">{step.icon}</div>
                  <p className="font-semibold text-gray-800 text-sm">{step.title}</p>
                  <p className="text-xs text-gray-500">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Results */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Health Analysis Report</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => isSpeaking ? stopSpeaking() : speak(result)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                    isSpeaking
                      ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                      : "bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100"
                  }`}
                >
                  {isSpeaking ? (
                    <>
                      <span className="w-3 h-3 bg-red-500 rounded-sm" />
                      Stop
                    </>
                  ) : (
                    <>
                      <span className="text-base">🔊</span>
                      Listen
                    </>
                  )}
                </button>
                <button
                  onClick={reset}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                >
                  ← Analyze another
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Left: Image + Score */}
              <div className="space-y-4">
                {imagePreview && (
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <img
                      src={imagePreview}
                      alt="Analyzed animal"
                      className="w-full max-h-60 object-contain bg-gray-50"
                    />
                  </div>
                )}

                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Animal</p>
                      <p className="text-lg font-bold text-gray-900 mt-0.5">{result.animalType}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${STATUS_COLORS[result.healthStatus] || "text-gray-600 bg-gray-50 border-gray-200"}`}>
                      {result.healthStatus}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between mb-2">
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Health Score</p>
                      <span className="text-3xl font-bold text-gray-900">
                        {result.healthScore}
                        <span className="text-base font-normal text-gray-400">/10</span>
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${SCORE_BAR_COLORS[result.healthStatus] || "bg-gray-400"}`}
                        style={{ width: `${result.healthScore * 10}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 leading-relaxed">{result.summary}</p>
                </div>
              </div>

              {/* Right: Details */}
              <div className="space-y-4">
                {result.observations.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <span className="text-blue-500">👁</span> Observations
                    </h3>
                    <ul className="space-y-2">
                      {result.observations.map((obs, i) => (
                        <li key={i} className="text-sm text-gray-600 flex gap-2">
                          <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                          {obs}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.concerns.length > 0 && (
                  <div className="bg-orange-50 rounded-2xl border border-orange-100 p-5">
                    <h3 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                      <span>⚠️</span> Concerns
                    </h3>
                    <ul className="space-y-2">
                      {result.concerns.map((concern, i) => (
                        <li key={i} className="text-sm text-orange-700 flex gap-2">
                          <span className="mt-0.5 shrink-0">•</span>
                          {concern}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.recommendations.length > 0 && (
                  <div className="bg-teal-50 rounded-2xl border border-teal-100 p-5">
                    <h3 className="font-semibold text-teal-800 mb-3 flex items-center gap-2">
                      <span>💊</span> Recommendations
                    </h3>
                    <ul className="space-y-2">
                      {result.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-teal-700 flex gap-2">
                          <span className="shrink-0 font-bold">{i + 1}.</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <p className="text-center text-xs text-gray-400 pt-2">
              This analysis is for informational purposes only. Always consult a licensed veterinarian for medical decisions.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
