import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storage';
import { ProfessionalSettings } from '../types';
import { Save, User, Clock, Calendar, CheckCircle, Upload, AlertCircle, Mail, MessageSquare, Bell } from 'lucide-react';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<ProfessionalSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSettings(StorageService.getSettings());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    StorageService.saveSettings(settings);
    
    setTimeout(() => {
      setIsSaving(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }, 600);
  };

  const updateProfile = (field: keyof ProfessionalSettings['profile'], value: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      profile: { ...settings.profile, [field]: value }
    });
  };

  const updateAvailability = (field: keyof ProfessionalSettings['availability'], value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      availability: { ...settings.availability, [field]: value }
    });
  };

  const updateScheduling = (field: keyof ProfessionalSettings['scheduling'], value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      scheduling: { 
        ...settings.scheduling || { minNoticeHours: 2, maxFutureDays: 30, lateArrivalTolerance: 15 }, 
        [field]: value 
      }
    });
  };

  const updateReminder = (field: keyof NonNullable<ProfessionalSettings['reminder']>, value: any) => {
    if (!settings) return;
    const defaultReminder = { enabled: true, timeBeforeHours: 24, messageTemplate: '' };
    setSettings({
      ...settings,
      reminder: {
        ...(settings.reminder || defaultReminder),
        [field]: value
      }
    });
  };

  const toggleWeekDay = (dayIndex: number) => {
    if (!settings) return;
    const currentDays = settings.availability.weekDays;
    const newDays = currentDays.includes(dayIndex)
      ? currentDays.filter(d => d !== dayIndex)
      : [...currentDays, dayIndex].sort();
    
    updateAvailability('weekDays', newDays);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 500000) { // Limit 500kb for localStorage safety
            alert("A imagem é muito grande. Por favor, use uma imagem menor que 500KB.");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            updateProfile('avatarUrl', reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  if (!settings) return <div className="p-8 text-skin-muted">Carregando configurações...</div>;

  const weekDays = [
    { label: 'Dom', index: 0 },
    { label: 'Seg', index: 1 },
    { label: 'Ter', index: 2 },
    { label: 'Qua', index: 3 },
    { label: 'Qui', index: 4 },
    { label: 'Sex', index: 5 },
    { label: 'Sáb', index: 6 },
  ];

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-skin-base">Configurações</h1>
          <p className="text-skin-muted">Personalize seu Booking Público e horários.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-skin-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-skin-primary-hover flex items-center gap-2 transition-all disabled:opacity-70 shadow-lg shadow-skin-primary/20"
        >
          {isSaving ? 'Salvando...' : <><Save size={18} /> Salvar Alterações</>}
        </button>
      </div>

      <div className="grid gap-8">
        {/* Profile Section */}
        <section className="bg-skin-surface rounded-2xl border border-skin-border shadow-sm overflow-hidden">
          <div className="p-6 border-b border-skin-border bg-skin-fill/30 flex items-center gap-2">
            <User className="text-skin-primary" size={20} />
            <h2 className="font-bold text-skin-base">Perfil Profissional</h2>
          </div>
          
          <div className="p-6 grid md:grid-cols-3 gap-8">
             {/* Avatar Column */}
             <div className="flex flex-col items-center gap-4">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <img 
                        src={settings.profile.avatarUrl} 
                        alt="Avatar" 
                        className="w-32 h-32 rounded-full border-4 border-skin-border object-cover bg-skin-fill shadow-inner" 
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="text-white" size={24} />
                    </div>
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageUpload}
                />
                <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold text-skin-primary hover:underline"
                >
                    Alterar Foto
                </button>
             </div>

             {/* Fields Column */}
             <div className="md:col-span-2 space-y-4">
                <div>
                   <label className="block text-sm font-bold text-skin-base mb-2">Nome de Exibição</label>
                   <input 
                      type="text"
                      className="w-full bg-skin-fill border border-skin-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-skin-primary outline-none transition-all"
                      value={settings.profile.name}
                      onChange={e => updateProfile('name', e.target.value)}
                   />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-bold text-skin-base mb-2">Especialidade</label>
                       <input 
                          type="text"
                          className="w-full bg-skin-fill border border-skin-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-skin-primary outline-none transition-all"
                          value={settings.profile.specialty}
                          onChange={e => updateProfile('specialty', e.target.value)}
                      />
                    </div>
                    <div>
                       <label className="block text-sm font-bold text-skin-base mb-2">Email de Contato</label>
                       <div className="relative">
                           <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-skin-muted" size={16} />
                           <input 
                              type="email"
                              className="w-full bg-skin-fill border border-skin-border rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-skin-primary outline-none transition-all"
                              value={settings.profile.email}
                              onChange={e => updateProfile('email', e.target.value)}
                           />
                       </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-skin-base mb-2">Biografia</label>
                    <textarea 
                        className="w-full bg-skin-fill border border-skin-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-skin-primary outline-none h-24 resize-none transition-all"
                        value={settings.profile.bio}
                        onChange={e => updateProfile('bio', e.target.value)}
                        placeholder="Conte um pouco sobre sua experiência, abordagem clínica e formação..."
                    />
                    <p className="text-xs text-skin-muted mt-1 text-right">Exibido na página pública de agendamento</p>
                </div>
             </div>
          </div>
        </section>

        {/* Reminder Settings (New) */}
        <section className="bg-skin-surface rounded-2xl border border-skin-border shadow-sm overflow-hidden">
             <div className="p-6 border-b border-skin-border bg-skin-fill/30 flex items-center gap-2">
                <MessageSquare className="text-skin-primary" size={20} />
                <h2 className="font-bold text-skin-base">Lembretes & Notificações (WhatsApp)</h2>
             </div>
             
             <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="font-bold text-skin-base">Lembrete Automático</h3>
                        <p className="text-xs text-skin-muted">Enviar mensagem para o paciente antes da consulta.</p>
                    </div>
                    <button 
                        onClick={() => updateReminder('enabled', !settings.reminder?.enabled)}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.reminder?.enabled ? 'bg-skin-primary' : 'bg-gray-300'}`}
                    >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.reminder?.enabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                </div>

                {settings.reminder?.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                        <div className="md:col-span-1">
                            <label className="block text-sm font-bold text-skin-base mb-2 flex items-center gap-2">
                                <Clock size={16} className="text-skin-muted"/> Antecedência
                            </label>
                            <div className="relative">
                                <input 
                                    type="number"
                                    min="1"
                                    className="w-full bg-skin-fill border border-skin-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-skin-primary outline-none"
                                    value={settings.reminder.timeBeforeHours}
                                    onChange={e => updateReminder('timeBeforeHours', parseInt(e.target.value))}
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-skin-muted font-medium">horas</span>
                            </div>
                            <p className="text-[10px] text-skin-muted mt-2 leading-tight">
                                Ex: 24 horas enviará o lembrete 1 dia antes do horário agendado.
                            </p>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-skin-base mb-2">Modelo da Mensagem</label>
                            <textarea 
                                className="w-full bg-skin-fill border border-skin-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-skin-primary outline-none h-24 resize-none transition-all font-mono text-sm"
                                value={settings.reminder.messageTemplate}
                                onChange={e => updateReminder('messageTemplate', e.target.value)}
                                placeholder="Olá {paciente}, lembrete da sua consulta..."
                            />
                            <div className="flex gap-2 mt-2">
                                <span className="text-[10px] bg-skin-fill border border-skin-border px-2 py-1 rounded text-skin-muted cursor-help" title="Nome do paciente">{`{paciente}`}</span>
                                <span className="text-[10px] bg-skin-fill border border-skin-border px-2 py-1 rounded text-skin-muted cursor-help" title="Data da consulta">{`{data}`}</span>
                                <span className="text-[10px] bg-skin-fill border border-skin-border px-2 py-1 rounded text-skin-muted cursor-help" title="Hora da consulta">{`{hora}`}</span>
                            </div>
                        </div>
                    </div>
                )}
             </div>
        </section>

        {/* Availability & Rules Section */}
        <section className="bg-skin-surface rounded-2xl border border-skin-border shadow-sm overflow-hidden">
          <div className="p-6 border-b border-skin-border bg-skin-fill/30 flex items-center gap-2">
            <Calendar className="text-skin-primary" size={20} />
            <h2 className="font-bold text-skin-base">Agenda & Disponibilidade</h2>
          </div>
          <div className="p-6 grid gap-8">
             
             {/* Week Days */}
             <div>
                <label className="block text-sm font-bold text-skin-base mb-3">Dias de Atendimento</label>
                <div className="flex flex-wrap gap-2">
                  {weekDays.map(day => {
                    const isActive = settings.availability.weekDays.includes(day.index);
                    return (
                      <button
                        key={day.index}
                        onClick={() => toggleWeekDay(day.index)}
                        className={`
                          w-12 h-12 rounded-xl font-bold text-sm transition-all border
                          ${isActive 
                            ? 'bg-skin-primary text-white border-skin-primary shadow-md' 
                            : 'bg-skin-fill text-skin-muted border-skin-border hover:border-skin-primary hover:text-skin-primary'}
                        `}
                      >
                        {day.label}
                      </button>
                    )
                  })}
                </div>
             </div>

             <div className="h-px bg-skin-border"></div>

             {/* Hours & Duration */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                   <label className="block text-sm font-bold text-skin-base mb-2 flex items-center gap-2">
                     <Clock size={16} className="text-skin-muted"/> Início
                   </label>
                   <input 
                      type="time"
                      className="w-full bg-skin-fill border border-skin-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-skin-primary outline-none"
                      value={settings.availability.startHour}
                      onChange={e => updateAvailability('startHour', e.target.value)}
                   />
                </div>
                <div>
                   <label className="block text-sm font-bold text-skin-base mb-2 flex items-center gap-2">
                     <Clock size={16} className="text-skin-muted"/> Fim
                   </label>
                   <input 
                      type="time"
                      className="w-full bg-skin-fill border border-skin-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-skin-primary outline-none"
                      value={settings.availability.endHour}
                      onChange={e => updateAvailability('endHour', e.target.value)}
                   />
                </div>
                <div>
                   <label className="block text-sm font-bold text-skin-base mb-2">Duração da Consulta</label>
                   <select 
                      className="w-full bg-skin-fill border border-skin-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-skin-primary outline-none"
                      value={settings.availability.slotDuration}
                      onChange={e => updateAvailability('slotDuration', parseInt(e.target.value))}
                   >
                     <option value={30}>30 min</option>
                     <option value={45}>45 min</option>
                     <option value={50}>50 min</option>
                     <option value={60}>60 min (1 hora)</option>
                     <option value={90}>90 min (1h 30m)</option>
                   </select>
                </div>
             </div>

             <div className="h-px bg-skin-border"></div>

             {/* Scheduling Rules (Tolerance) */}
             <div>
                 <h3 className="font-bold text-skin-base mb-4 flex items-center gap-2">
                    <AlertCircle size={16} className="text-skin-primary" /> Regras de Agendamento
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-skin-base mb-1">Antecedência Mínima (Horas)</label>
                        <p className="text-xs text-skin-muted mb-2">Quanto tempo antes o paciente pode agendar?</p>
                        <input 
                            type="number"
                            min="0"
                            className="w-full bg-skin-fill border border-skin-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-skin-primary outline-none"
                            value={settings.scheduling?.minNoticeHours || 0}
                            onChange={e => updateScheduling('minNoticeHours', parseInt(e.target.value))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-skin-base mb-1">Janela de Agendamento (Dias)</label>
                        <p className="text-xs text-skin-muted mb-2">Quantos dias futuros aparecem na agenda?</p>
                        <input 
                            type="number"
                            min="1"
                            className="w-full bg-skin-fill border border-skin-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-skin-primary outline-none"
                            value={settings.scheduling?.maxFutureDays || 30}
                            onChange={e => updateScheduling('maxFutureDays', parseInt(e.target.value))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-skin-base mb-1">Tolerância de Atraso (Min)</label>
                        <p className="text-xs text-skin-muted mb-2">Tempo permitido de atraso do paciente.</p>
                        <input 
                            type="number"
                            min="0"
                            className="w-full bg-skin-fill border border-skin-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-skin-primary outline-none"
                            value={settings.scheduling?.lateArrivalTolerance || 0}
                            onChange={e => updateScheduling('lateArrivalTolerance', parseInt(e.target.value))}
                        />
                    </div>
                 </div>
             </div>
          </div>
        </section>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-skin-inverted text-skin-surface px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in z-50">
            <div className="bg-green-500 rounded-full p-1 text-skin-inverted">
                <CheckCircle size={16} strokeWidth={3} />
            </div>
            <div>
                <p className="font-bold text-sm">Configurações salvas!</p>
                <p className="text-xs opacity-80">As alterações já estão valendo.</p>
            </div>
        </div>
      )}
    </div>
  );
};

export default Settings;