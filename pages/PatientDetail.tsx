import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StorageService } from '../services/storage';
import { AIService } from '../services/ai';
import { Patient, ClinicalNote } from '../types';
import { ArrowLeft, Save, Sparkles, BookOpen, Clock, StickyNote, CheckCircle, Mail, Phone, User, AlertCircle } from 'lucide-react';

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'notes' | 'info'>('notes');
  const [newNote, setNewNote] = useState('');
  
  // Edit State
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [errors, setErrors] = useState<{ email?: string; phone?: string }>({});

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (id) {
      const p = StorageService.getPatientById(id);
      if (p) {
        setPatient(p);
        setEditEmail(p.email || '');
        setEditPhone(p.phone || '');
      }
    }
  }, [id]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  const handleSaveNote = () => {
    if (!newNote.trim() || !patient) return;
    
    StorageService.addClinicalNote(patient.id, newNote);
    // Refresh
    setPatient(StorageService.getPatientById(patient.id));
    setNewNote('');
    // Invalidate AI summary as data changed
    setAiSummary(null);

    triggerToast('Nota salva no prontuário.');
  };

  const handleSaveInfo = () => {
    if (!patient) return;

    // Validation Logic
    const newErrors: { email?: string; phone?: string } = {};
    let hasError = false;

    // Email Validation (allow empty, but if present must be valid)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (editEmail && !emailRegex.test(editEmail)) {
        newErrors.email = 'Por favor, insira um email válido.';
        hasError = true;
    }

    // Phone Validation (Brazil format)
    const phoneRegex = /^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/;
    if (editPhone && !phoneRegex.test(editPhone)) {
        newErrors.phone = 'Formato inválido. Use (DD) 99999-9999';
        hasError = true;
    }

    setErrors(newErrors);
    if (hasError) return;

    const updatedPatient: Patient = {
        ...patient,
        email: editEmail,
        phone: editPhone
    };

    StorageService.savePatient(updatedPatient);
    setPatient(updatedPatient);
    triggerToast('Dados de contato atualizados com sucesso.');
  };

  const handleGenerateSummary = async () => {
    if (!patient) return;
    setIsSummarizing(true);
    const summary = await AIService.summarizeNotes(patient.name, patient.notes);
    setAiSummary(summary);
    setIsSummarizing(false);
  };

  if (!patient) return <div>Carregando...</div>;

  return (
    <div className="space-y-6 relative">
      <button 
        onClick={() => navigate('/patients')} 
        className="flex items-center text-slate-500 hover:text-teal-600 transition-colors"
      >
        <ArrowLeft size={18} className="mr-1" /> Voltar
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <img 
          src={patient.avatarUrl} 
          alt={patient.name} 
          className="w-24 h-24 rounded-full object-cover border-4 border-slate-50"
        />
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-2xl font-bold text-slate-800">{patient.name}</h1>
          <div className="mt-2 text-slate-500 space-y-1">
             <p className="text-sm flex items-center justify-center md:justify-start gap-2">
                <Mail size={14}/> {patient.email || 'Email não cadastrado'}
             </p>
             <p className="text-sm flex items-center justify-center md:justify-start gap-2">
                <Phone size={14}/> {patient.phone || 'Telefone não cadastrado'}
             </p>
          </div>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setActiveTab('notes')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'notes' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'}`}
            >
                Prontuários
            </button>
            <button 
                onClick={() => setActiveTab('info')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'info' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'}`}
            >
                Dados Pessoais
            </button>
        </div>
      </div>

      {activeTab === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Col: Note Input & AI */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* New Note Input */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <StickyNote size={18} /> Nova Anotação
                    </h3>
                    <textarea 
                        className="w-full border border-slate-200 rounded-lg p-4 h-32 focus:ring-2 focus:ring-teal-500 outline-none resize-none bg-slate-50 focus:bg-white transition-colors"
                        placeholder="Descreva a sessão, observações clínicas ou evolução do paciente..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                    ></textarea>
                    <div className="mt-3 flex justify-end">
                        <button 
                            onClick={handleSaveNote}
                            disabled={!newNote.trim()}
                            className="bg-teal-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                        >
                            <Save size={18} /> Salvar no Prontuário
                        </button>
                    </div>
                </div>

                {/* AI Summary Block - Positioned below new note form */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2 text-indigo-800 font-bold">
                            <Sparkles size={18} />
                            <h2>Resumo Clínico (IA)</h2>
                        </div>
                        <button 
                            onClick={handleGenerateSummary}
                            disabled={isSummarizing || patient.notes.length === 0}
                            className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                            {isSummarizing ? 'Gerando...' : 'Gerar Resumo'}
                        </button>
                    </div>
                    
                    {aiSummary ? (
                        <div className="bg-white/60 p-4 rounded-lg text-slate-700 text-sm leading-relaxed animate-fade-in">
                            {aiSummary}
                        </div>
                    ) : (
                        <p className="text-sm text-indigo-400 italic">
                            {patient.notes.length > 0 
                                ? "Clique em gerar para analisar o histórico de prontuários com IA." 
                                : "Adicione notas ao prontuário para usar a IA."}
                        </p>
                    )}
                </div>

                {/* Notes History */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-700 ml-1">Histórico de Atendimentos</h3>
                    {patient.notes.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            Nenhum registro encontrado.
                        </div>
                    ) : (
                        patient.notes.map((note) => (
                            <div key={note.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-2 mb-3 text-slate-400 text-xs uppercase font-bold tracking-wider">
                                    <Clock size={14} />
                                    {new Date(note.date).toLocaleString('pt-BR')}
                                </div>
                                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Col: Stats/Quick Info */}
            <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <BookOpen size={18} className="text-teal-600"/>
                        Estatísticas
                    </h3>
                    <ul className="space-y-3">
                        <li className="flex justify-between text-sm">
                            <span className="text-slate-500">Total de Sessões</span>
                            <span className="font-medium text-slate-800">{patient.notes.length}</span>
                        </li>
                        <li className="flex justify-between text-sm">
                            <span className="text-slate-500">Primeira Visita</span>
                            <span className="font-medium text-slate-800">{new Date(patient.createdAt).toLocaleDateString()}</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'info' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm max-w-2xl mx-auto">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <h2 className="font-bold text-slate-700 flex items-center gap-2">
                      <User size={20} className="text-teal-600"/> Editar Dados Pessoais
                  </h2>
              </div>
              <div className="p-8 space-y-6">
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label>
                      <input 
                          type="text" 
                          disabled
                          className="w-full bg-slate-100 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-500 cursor-not-allowed"
                          value={patient.name}
                      />
                      <p className="text-xs text-slate-400 mt-1">O nome não pode ser alterado por aqui.</p>
                  </div>

                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                      <div className="relative">
                          <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 ${errors.email ? 'text-red-400' : 'text-slate-400'}`} size={18} />
                          <input 
                              type="email" 
                              className={`w-full border rounded-lg pl-10 pr-4 py-2.5 outline-none transition-all ${errors.email ? 'border-red-300 focus:ring-2 focus:ring-red-200 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-teal-500'}`}
                              value={editEmail}
                              onChange={(e) => {
                                  setEditEmail(e.target.value);
                                  if(errors.email) setErrors({...errors, email: undefined});
                              }}
                              placeholder="exemplo@email.com"
                          />
                      </div>
                      {errors.email && (
                          <p className="flex items-center gap-1 text-xs text-red-500 mt-1 pl-1 animate-fade-in">
                              <AlertCircle size={12} /> {errors.email}
                          </p>
                      )}
                  </div>

                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Telefone</label>
                      <div className="relative">
                          <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 ${errors.phone ? 'text-red-400' : 'text-slate-400'}`} size={18} />
                          <input 
                              type="text" 
                              className={`w-full border rounded-lg pl-10 pr-4 py-2.5 outline-none transition-all ${errors.phone ? 'border-red-300 focus:ring-2 focus:ring-red-200 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-teal-500'}`}
                              value={editPhone}
                              onChange={(e) => {
                                  setEditPhone(e.target.value);
                                  if(errors.phone) setErrors({...errors, phone: undefined});
                              }}
                              placeholder="(00) 00000-0000"
                          />
                      </div>
                      {errors.phone && (
                          <p className="flex items-center gap-1 text-xs text-red-500 mt-1 pl-1 animate-fade-in">
                              <AlertCircle size={12} /> {errors.phone}
                          </p>
                      )}
                  </div>

                  <div className="pt-4 flex justify-end">
                      <button 
                          onClick={handleSaveInfo}
                          className="bg-slate-900 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-slate-800 flex items-center gap-2 transition-all shadow-lg shadow-slate-200"
                      >
                          <Save size={18} /> Salvar Alterações
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Success Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in z-50">
            <div className="bg-green-500 rounded-full p-1 text-slate-900">
                <CheckCircle size={16} strokeWidth={3} />
            </div>
            <div>
                <p className="font-bold text-sm">Sucesso!</p>
                <p className="text-xs text-slate-300">{toastMessage}</p>
            </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetail;