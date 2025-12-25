
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Clipboard, 
  Image as ImageIcon, 
  Plus, 
  BrainCircuit, 
  AlertCircle, 
  Loader2, 
  X,
  CheckCircle2,
  Trash2,
  HelpCircle
} from 'lucide-react';
import { AttendanceRecord, LearningRule, ClarificationRequest } from './types';
import { parseAttendanceData } from './services/geminiService';
import Spreadsheet from './components/Spreadsheet';

const App: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [learningRules, setLearningRules] = useState<LearningRule[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uncertainties, setUncertainties] = useState<ClarificationRequest[]>([]);
  const [showLearningModal, setShowLearningModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onloadend = () => {
              setSelectedImages(prev => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      fileArray.forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const processData = async () => {
    if (!inputText.trim() && selectedImages.length === 0) return;
    
    setIsProcessing(true);
    try {
      const result = await parseAttendanceData(inputText, selectedImages, learningRules);
      
      const newRecords: AttendanceRecord[] = result.records.map((r, i) => {
        const baseSalary = r.baseSalary || 0;
        const otHours = r.otHours || 0;
        const dayMultiplier = r.day || 1;
        const otAmount = (baseSalary / 8) * otHours;
        
        return {
          id: `${Date.now()}-${i}`,
          date: r.date || new Date().toISOString().split('T')[0],
          labourName: r.labourName || 'Unknown Labour',
          siteName: r.siteName || 'Unknown Site',
          baseSalary,
          day: dayMultiplier,
          otHours,
          otAmount,
          totalPayable: (baseSalary * dayMultiplier) + otAmount,
          source: selectedImages.length > 0 ? 'image' : 'text',
          timestamp: Date.now(),
          isConfirmed: result.uncertainties.length === 0
        };
      });

      setRecords(prev => {
        const existingMap = new Map();
        prev.forEach(r => existingMap.set(`${r.date}-${r.labourName}-${r.siteName}`, r));
        
        const updated = [...prev];
        newRecords.forEach(nr => {
          const key = `${nr.date}-${nr.labourName}-${nr.siteName}`;
          const existing = existingMap.get(key);
          
          if (!existing) {
            updated.push(nr);
          } else {
            const hasChanges = 
              existing.baseSalary !== nr.baseSalary || 
              existing.otHours !== nr.otHours ||
              existing.day !== nr.day;
            
            if (hasChanges) {
              const idx = updated.findIndex(r => r.id === existing.id);
              updated[idx] = { ...nr, id: existing.id };
            }
          }
        });
        return updated;
      });

      if (result.uncertainties.length > 0) {
        const newUncertainties: ClarificationRequest[] = result.uncertainties.map(u => ({
          id: Math.random().toString(36).substr(2, 9),
          content: u,
          context: { text: inputText, images: selectedImages },
          status: 'pending'
        }));
        setUncertainties(prev => [...prev, ...newUncertainties]);
      }

      setInputText('');
      setSelectedImages([]);
    } catch (error) {
      console.error("Processing failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const resolveClarification = (id: string, answer: string) => {
    const clarification = uncertainties.find(u => u.id === id);
    if (!clarification) return;

    const newRule: LearningRule = {
      id: Math.random().toString(36).substr(2, 9),
      pattern: clarification.content,
      explanation: answer,
      createdAt: Date.now()
    };

    setLearningRules(prev => [...prev, newRule]);
    setUncertainties(prev => prev.filter(u => u.id !== id));
    setRecords(prev => prev.map(r => ({ ...r, isConfirmed: true })));
  };

  const removeRule = (id: string) => {
    setLearningRules(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
              <Clipboard size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">AttendancePro</h1>
              <p className="text-xs text-slate-500 font-medium">WhatsApp-to-Sheet AI</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <button 
                onClick={() => setShowLearningModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
              >
                <BrainCircuit size={18} className="text-indigo-500" />
                Knowledge Base ({learningRules.length})
              </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Plus size={20} className="text-indigo-600" />
              Process New Messages
            </h2>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paste Text Messages</label>
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste the WhatsApp text or use Ctrl+V to add images..."
                className="w-full h-40 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none text-sm font-mono bg-slate-50"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upload or Paste Screenshots</label>
                <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 px-2 py-0.5 rounded">Ctrl + V Supported</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {selectedImages.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100 group">
                    <img src={img} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-400 transition-all bg-slate-50/50"
                >
                  <ImageIcon size={24} />
                  <span className="text-[10px] mt-1 font-bold uppercase">Add Photo</span>
                </button>
              </div>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                className="hidden" 
              />
            </div>

            <button 
              disabled={isProcessing || (!inputText && selectedImages.length === 0)}
              onClick={processData}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Processing with Gemini...
                </>
              ) : (
                <>
                  Process Attendance
                </>
              )}
            </button>
          </div>

          {uncertainties.length > 0 && (
            <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200 space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <h3 className="text-amber-800 font-bold flex items-center gap-2">
                  <AlertCircle size={20} />
                  Clarifications Needed
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full">
                  {uncertainties.length} Pending
                </span>
              </div>
              <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                {uncertainties.map((u) => (
                  <ClarificationCard key={u.id} query={u} onResolve={resolveClarification} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-7">
          <Spreadsheet 
            records={records} 
            onDelete={(id) => setRecords(prev => prev.filter(r => r.id !== id))}
            onUpdate={(updated) => setRecords(prev => prev.map(r => r.id === updated.id ? updated : r))}
          />
        </div>
      </main>

      {showLearningModal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
              <div className="flex items-center gap-3">
                <BrainCircuit className="text-indigo-600" />
                <h3 className="text-xl font-bold text-slate-800">Knowledge Base</h3>
              </div>
              <button onClick={() => setShowLearningModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <HelpCircle size={16} className="text-indigo-500" />
                  What is this?
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  These rules are learned automatically when you resolve ambiguities. Gemini uses these to interpret your specific formats better next time.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Learned Logic</h4>
                {learningRules.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 italic text-sm">
                    No rules added yet. Start processing data!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {learningRules.map((rule) => (
                      <div key={rule.id} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex items-start justify-between group">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-indigo-600">PATTERN</p>
                          <p className="text-sm text-slate-700 font-medium">"{rule.pattern}"</p>
                          <p className="text-xs font-bold text-slate-400 mt-2">INTERPRETATION</p>
                          <p className="text-sm text-slate-600">{rule.explanation}</p>
                        </div>
                        <button 
                          onClick={() => removeRule(rule.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50">
               <button 
                onClick={() => setShowLearningModal(false)}
                className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ClarificationCardProps {
  query: ClarificationRequest;
  onResolve: (id: string, answer: string) => void;
}

const ClarificationCard: React.FC<ClarificationCardProps> = ({ query, onResolve }) => {
  const [answer, setAnswer] = useState('');

  return (
    <div className="p-4 bg-white rounded-xl border border-amber-100 shadow-sm space-y-3">
      <p className="text-sm text-amber-900 font-medium italic">
        " {query.content} "
      </p>
      <div className="flex gap-2">
        <input 
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Explain to Gemini..."
          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-amber-400"
          onKeyDown={(e) => e.key === 'Enter' && answer && onResolve(query.id, answer)}
        />
        <button 
          disabled={!answer}
          onClick={() => onResolve(query.id, answer)}
          className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700 disabled:bg-slate-200 transition-colors"
        >
          Teach
        </button>
      </div>
    </div>
  );
};

export default App;
