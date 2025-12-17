import React, { useEffect, useState, useRef } from 'react';
import { StorageService } from '../services/storage';
import { AIService } from '../services/ai';
import { Appointment, AppointmentStatus, ProfessionalSettings, Patient } from '../types';
import { Calendar as CalendarIcon, Clock, CheckCircle, ChevronLeft, ChevronRight, Bell, Check, User, MapPin, List, Grid, MessageCircle, AlertCircle, X, Repeat, Phone, Send, Sparkles } from 'lucide-react';

type ViewMode = 'list' | 'day' | 'week' | 'month';

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
}

const Dashboard: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0 });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [settings, setSettings] = useState<ProfessionalSettings | null>(null);
  
  // Notification State
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadAppointments, setUnreadAppointments] = useState<Appointment[]>([]);

  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'bot', text: 'Olá, Dr(a). Sou seu assistente virtual. Posso confirmar, cancelar ou ajudar a remarcar consultas. Como posso ajudar?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isBotThinking, setIsBotThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Current Time for Timeline Indicator
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    refreshData();
    const config = StorageService.getSettings();
    setSettings(config);

    // Update "now" indicator every minute
    const interval = setInterval(() => setNow(new Date()), 60000);
    
    // Polling System: Check for new appointments every 5 seconds
    const pollingInterval = setInterval(() => {
        refreshData();
    }, 5000);

    return () => {
        clearInterval(interval);
        clearInterval(pollingInterval);
    };
  }, []);

  useEffect(() => {
    if (isChatOpen) {
        scrollToBottom();
    }
  }, [chatMessages, isChatOpen]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const refreshData = () => {
    const allApps = StorageService.getAppointments();
    const allPatients = StorageService.getPatients();
    setAppointments(allApps);
    setPatients(allPatients);

    setStats({
      total: allApps.length,
      completed: allApps.filter(a => a.status === AppointmentStatus.COMPLETED || a.status === AppointmentStatus.CONFIRMED).length,
    });
    
    const unread = allApps.filter(a => a.read === false);
    setUnreadAppointments(unread);
  };

  const markAsRead = (id: string) => {
    StorageService.markAppointmentAsRead(id);
    refreshData();
  };

  const markAllAsRead = () => {
    unreadAppointments.forEach(app => {
        StorageService.markAppointmentAsRead(app.id);
    });
    refreshData();
    setIsNotifOpen(false);
  };

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.SCHEDULED: return 'border-blue-500 bg-blue-50 text-blue-700';
      case AppointmentStatus.CONFIRMED: return 'border-teal-500 bg-teal-50 text-teal-800 font-bold';
      case AppointmentStatus.COMPLETED: return 'border-gray-500 bg-gray-50 text-gray-700';
      case AppointmentStatus.CANCELLED: return 'border-red-500 bg-red-50 text-red-700 decoration-slice line-through opacity-70';
      default: return 'border-gray-500 bg-gray-50 text-gray-700';
    }
  };

  // --- WhatsApp Action Logic ---
  const handleAction = (app: Appointment, action: 'confirm' | 'cancel' | 'reschedule') => {
    let phone = '';
    const patient = patients.find(p => p.id === app.patientId);
    if (patient && patient.phone) {
        phone = patient.phone;
    } else {
        if (app.notes && app.notes.includes('Tel:')) {
            const match = app.notes.match(/Tel:\s*([\d\s()-]+)/);
            if (match) phone = match[1];
        }
    }

    if (!phone) {
        // If triggered by AI, we should probably inform the user via chat instead of alert, 
        // but for now alert is the existing mechanism.
        alert(`Telefone não encontrado para ${app.patientName}.`);
        return;
    }

    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
        cleanPhone = '55' + cleanPhone;
    }

    // Update Status Logic (if not just opening whatsapp)
    if (action === 'confirm') {
        StorageService.updateAppointmentStatus(app.id, AppointmentStatus.CONFIRMED);
        refreshData();
    } else if (action === 'cancel') {
        // Confirmation is handled by AI if called via AI
        StorageService.updateAppointmentStatus(app.id, AppointmentStatus.CANCELLED);
        refreshData();
    }

    const dateFormatted = new Date(app.date).toLocaleDateString('pt-BR');
    let message = '';

    if (action === 'confirm') {
        message = `Olá ${app.patientName}, confirmando sua consulta para o dia ${dateFormatted} às ${app.time}. Aguardamos você!`;
    } else if (action === 'cancel') {
        message = `Olá ${app.patientName}, sua consulta do dia ${dateFormatted} às ${app.time} foi cancelada. Entre em contato se precisar de algo.`;
    } else if (action === 'reschedule') {
        const baseUrl = window.location.href.split('#')[0];
        const publicUrl = `${baseUrl}#/booking`;
        message = `Olá ${app.patientName}, precisamos remarcar sua consulta. Por favor, acesse este link para escolher um novo horário: ${publicUrl}`;
    }
    
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // --- Chatbot Logic ---
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    // 1. Add User Message
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsBotThinking(true);

    // 2. Process with AI
    const result = await AIService.interpretSchedulingCommand(userMsg.text, appointments);
    
    // 3. Execute Action
    if (result.appointmentId) {
        const targetApp = appointments.find(a => a.id === result.appointmentId);
        if (targetApp) {
            // Use setTimeout to allow the bot's text reply to render first, then open WhatsApp/Actions
            setTimeout(() => {
                if (result.action === 'CONFIRM') {
                    handleAction(targetApp, 'confirm');
                } else if (result.action === 'CANCEL') {
                    handleAction(targetApp, 'cancel');
                } else if (result.action === 'RESCHEDULE_LINK') {
                    handleAction(targetApp, 'reschedule');
                }
            }, 1000);
        }
    }

    // 4. Add Bot Reply
    const botMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'bot', 
        text: result.reply 
    };
    
    setChatMessages(prev => [...prev, botMsg]);
    setIsBotThinking(false);
  };

  // --- Navigation Logic ---
  const navigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return appointments
      .filter(a => a.date === dateStr)
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  // --- Render Views (List, Day, Week, Month) ---
  
  const renderListView = () => {
    const sortedApps = [...appointments].sort((a, b) => {
        const da = new Date(`${a.date}T${a.time}`);
        const db = new Date(`${b.date}T${b.time}`);
        if (a.read === false && b.read !== false) return -1;
        if (a.read !== false && b.read === false) return 1;
        return db.getTime() - da.getTime(); 
    });
    
    const upcoming = sortedApps.filter(a => new Date(`${a.date}T${a.time}`) >= new Date());
    const past = sortedApps.filter(a => new Date(`${a.date}T${a.time}`) < new Date());

    upcoming.sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());

    const renderCard = (app: Appointment) => (
        <div key={app.id} className={`relative bg-white p-4 rounded-xl border transition-all flex flex-col md:flex-row gap-4 items-start md:items-center ${app.read === false ? 'border-l-4 border-l-blue-500 shadow-md border-y border-r border-slate-200' : 'border-slate-200 shadow-sm hover:shadow-md'} ${app.status === AppointmentStatus.CANCELLED ? 'opacity-60 bg-slate-50' : ''}`}>
            {app.read === false && (
                <span className="absolute -top-2 -left-2 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-sm z-10">NOVO</span>
            )}
            <div className="flex-shrink-0 flex flex-col items-center justify-center bg-slate-50 border border-slate-100 rounded-lg w-16 h-16">
                <span className="text-xs text-slate-500 uppercase font-bold">{new Date(app.date).toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}</span>
                <span className="text-xl font-bold text-slate-800">{new Date(app.date).getDate()}</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold font-mono">{app.time}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase font-bold tracking-wide ${getStatusColor(app.status)}`}>{app.status}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 truncate">{app.patientName}</h3>
                {app.notes && <p className="text-xs text-slate-500 truncate mt-0.5">{app.notes}</p>}
            </div>
        </div>
    );
    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Clock size={20} className="text-teal-600"/> Próximos Agendamentos</h3>
                {upcoming.length > 0 ? <div className="space-y-3">{upcoming.map(renderCard)}</div> : <div className="text-center py-8 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400">Nenhum agendamento futuro encontrado.</div>}
            </div>
            {past.length > 0 && (
                <div className="space-y-4 opacity-75">
                    <h3 className="font-bold text-slate-500 flex items-center gap-2"><CheckCircle size={20} /> Histórico Recente</h3>
                    <div className="space-y-3">{past.slice(0, 5).map(renderCard)}</div>
                </div>
            )}
        </div>
    );
  };

  const renderDayView = () => {
    const dailyApps = getAppointmentsForDate(currentDate);
    const startHour = settings ? parseInt(settings.availability.startHour.split(':')[0]) : 8;
    const endHour = settings ? parseInt(settings.availability.endHour.split(':')[0]) : 19;
    const slotDuration = settings?.availability.slotDuration || 60;
    const hours = Array.from({ length: (endHour - startHour) + 1 }, (_, i) => i + startHour);
    const isToday = new Date().toDateString() === currentDate.toDateString();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    return (
      <div className="relative py-4 pr-4">
        <div className="relative ml-16 border-l border-slate-200 space-y-0">
           {hours.map(hour => {
             const timeStr = `${hour.toString().padStart(2, '0')}:00`;
             const slotApps = dailyApps.filter(a => parseInt(a.time.split(':')[0]) === hour);
             return (
               <div key={hour} className="relative min-h-[120px] group">
                 <span className="absolute -left-16 -top-3 text-xs font-bold text-slate-400 font-mono w-12 text-right">{timeStr}</span>
                 <div className="absolute top-0 w-full h-px bg-slate-100 group-hover:bg-slate-200 transition-colors"></div>
                 {isToday && hour === currentHour && (
                    <div className="absolute w-full border-t-2 border-red-400 z-10 flex items-center pointer-events-none opacity-60" style={{ top: `${(currentMinute / 60) * 100}%` }}><div className="w-2 h-2 bg-red-500 rounded-full -ml-1"></div></div>
                 )}
                 <div className="pl-4 pt-2 pr-2 pb-2 w-full h-full">
                    {slotApps.length > 0 ? (
                       <div className="grid grid-cols-1 gap-2">
                          {slotApps.map(app => {
                             const [h, m] = app.time.split(':').map(Number);
                             const endDate = new Date();
                             endDate.setHours(h, m + slotDuration);
                             const endTime = endDate.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
                             return (
                                <div key={app.id} className={`relative rounded-lg border-l-4 p-3 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-2 ${getStatusColor(app.status)}`}>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1"><span className="font-mono font-bold text-sm opacity-80">{app.time} - {endTime}</span></div>
                                        <h4 className="font-bold text-lg">{app.patientName}</h4>
                                    </div>
                                </div>
                             );
                          })}
                       </div>
                    ) : (
                        <div className="h-full w-full rounded-lg border-2 border-dashed border-transparent group-hover:border-slate-100 transition-colors flex items-center justify-center"><span className="text-slate-300 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity select-none">Livre</span></div>
                    )}
                 </div>
               </div>
             );
           })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay(); 
    startOfWeek.setDate(currentDate.getDate() - day);
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });

    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDays.map((date, idx) => {
          const isToday = new Date().toDateString() === date.toDateString();
          const dayApps = getAppointmentsForDate(date);
          return (
            <div key={idx} className={`min-h-[300px] border rounded-xl p-3 ${isToday ? 'bg-teal-50/50 border-teal-200' : 'bg-white border-slate-200'}`}>
              <div className="text-center mb-3 pb-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase">{date.toLocaleDateString('pt-BR', { weekday: 'short' })}</p>
                <p className={`text-lg font-bold ${isToday ? 'text-teal-600' : 'text-slate-800'}`}>{date.getDate()}</p>
              </div>
              <div className="space-y-2">
                {dayApps.map(app => (
                  <div key={app.id} className={`p-2 rounded text-xs border-l-2 border-y border-r flex justify-between items-center ${getStatusColor(app.status)}`}>
                     <div className="overflow-hidden"><div className="font-bold truncate">{app.time}</div><div className="truncate">{app.patientName.split(' ')[0]}</div></div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayIndex = firstDayOfMonth.getDay(); 
    const blanks = Array.from({ length: startDayIndex }, (_, i) => i);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div className="w-full">
        <div className="grid grid-cols-7 mb-2">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase py-2">{day}</div>)}</div>
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {blanks.map(blank => <div key={`blank-${blank}`} className="h-24 bg-slate-50/50 rounded-lg"></div>)}
          {days.map(day => {
            const date = new Date(year, month, day);
            const dateStr = date.toISOString().split('T')[0];
            const isToday = new Date().toDateString() === date.toDateString();
            const dayApps = appointments.filter(a => a.date === dateStr);
            const isSelected = currentDate.getDate() === day && currentDate.getMonth() === month && currentDate.getFullYear() === year;

            return (
              <button key={day} onClick={() => { setCurrentDate(date); setViewMode('day'); }} className={`h-24 rounded-lg border p-2 flex flex-col items-start justify-start transition-all hover:shadow-md ${isToday ? 'bg-teal-50 border-teal-300' : 'bg-white border-slate-200'} ${isSelected ? 'ring-2 ring-teal-500 ring-offset-1' : ''}`}>
                <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-teal-600 text-white' : 'text-slate-700'}`}>{day}</span>
                <div className="mt-1 w-full space-y-1 overflow-hidden">
                  {dayApps.slice(0, 3).map(app => <div key={app.id} className={`text-[10px] px-1 py-0.5 rounded truncate w-full text-left ${app.status === AppointmentStatus.CONFIRMED ? 'bg-teal-100 text-teal-800' : 'bg-indigo-50 text-indigo-700'}`}>{app.time} {app.patientName.split(' ')[0]}</div>)}
                  {dayApps.length > 3 && <div className="text-[10px] text-slate-400 pl-1">+ {dayApps.length - 3} mais</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const formatDateTitle = () => {
    if (viewMode === 'list') return 'Lista de Agendamentos';
    if (viewMode === 'day') return currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (viewMode === 'month') return currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    if (startOfWeek.getMonth() === endOfWeek.getMonth()) return `${startOfWeek.getDate()} - ${endOfWeek.getDate()} de ${startOfWeek.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;
    return `${startOfWeek.getDate()} de ${startOfWeek.toLocaleDateString('pt-BR', { month: 'short' })} - ${endOfWeek.getDate()} de ${endOfWeek.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`;
  };

  return (
    <div className="space-y-6 relative">
      {/* Top Stats and Notifications */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Painel Geral</h1>
          <p className="text-slate-500">Bem-vindo, Dr. Silva. Gerencie sua agenda.</p>
        </div>
        
        <div className="flex gap-4 items-center">
            {/* Notification Bell */}
            <div className="relative">
                <button onClick={() => setIsNotifOpen(!isNotifOpen)} className={`p-3 rounded-lg border shadow-sm transition-colors relative ${isNotifOpen ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                    <Bell size={20} className={unreadAppointments.length > 0 ? "animate-swing" : ""} />
                    {unreadAppointments.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">{unreadAppointments.length}</span>}
                </button>
                {isNotifOpen && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsNotifOpen(false)} />
                        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden animate-fade-in ring-1 ring-black/5">
                            <div className="p-3 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center"><h3 className="font-bold text-slate-700 text-sm flex items-center gap-2"><Bell size={14} className="text-blue-500" /> Notificações</h3>{unreadAppointments.length > 0 && (<button onClick={markAllAsRead} className="text-[10px] text-blue-600 hover:underline font-medium">Marcar todas como lidas</button>)}</div>
                            <div className="max-h-64 overflow-auto custom-scrollbar">
                                {unreadAppointments.length === 0 ? <div className="p-8 text-center flex flex-col items-center gap-2 text-slate-400"><Bell size={24} className="opacity-20" /><span className="text-sm">Tudo em ordem.</span></div> : unreadAppointments.map(app => <div key={app.id} className="p-3 hover:bg-blue-50/30 border-b border-slate-50 last:border-0 flex gap-3 group transition-colors"><div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0 shadow-sm shadow-blue-300"></div><div className="flex-1"><p className="text-sm font-bold text-slate-800">Novo Agendamento</p><p className="text-xs text-slate-500 leading-snug"><span className="font-semibold text-slate-700">{app.patientName}</span> <br/>{new Date(app.date).toLocaleDateString('pt-BR')} às {app.time}</p></div><button onClick={() => markAsRead(app.id)} className="text-slate-300 hover:text-teal-600 hover:bg-teal-50 rounded-full p-1.5 self-center transition-all opacity-0 group-hover:opacity-100" title="Marcar como lido"><Check size={14} /></button></div>)}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Stats Cards */}
            <div className="flex gap-2">
                <div className="bg-white p-3 rounded-lg border shadow-sm flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-full text-blue-600"><CalendarIcon size={18} /></div><div><p className="text-xs text-slate-500 font-semibold uppercase">Total</p><p className="text-lg font-bold text-slate-800">{stats.total}</p></div></div>
                <div className="bg-white p-3 rounded-lg border shadow-sm flex items-center gap-3"><div className="p-2 bg-green-100 rounded-full text-green-600"><CheckCircle size={18} /></div><div><p className="text-xs text-slate-500 font-semibold uppercase">Realizados</p><p className="text-lg font-bold text-slate-800">{stats.completed}</p></div></div>
            </div>
        </div>
      </div>

      {/* Calendar/List Container */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 order-2 lg:order-1 w-full lg:w-auto overflow-x-auto">
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><List size={16} /> Lista</button>
              {(['day', 'week', 'month'] as ViewMode[]).map((mode) => <button key={mode} onClick={() => setViewMode(mode)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${viewMode === mode ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{mode === 'day' ? 'Dia' : mode === 'week' ? 'Semana' : 'Mês'}</button>)}
            </div>
            <button onClick={goToToday} className="text-sm font-bold text-teal-600 hover:bg-teal-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-teal-100 transition-colors whitespace-nowrap">Hoje</button>
          </div>
          <div className="flex items-center gap-4 order-1 lg:order-2">
             {viewMode !== 'list' && <button onClick={() => navigate('prev')} className="p-2 hover:bg-slate-100 rounded-full text-slate-600"><ChevronLeft size={20} /></button>}
             <h2 className="text-lg font-bold text-slate-800 w-full lg:w-48 text-center capitalize">{formatDateTitle()}</h2>
             {viewMode !== 'list' && <button onClick={() => navigate('next')} className="p-2 hover:bg-slate-100 rounded-full text-slate-600"><ChevronRight size={20} /></button>}
          </div>
          <div className="order-3 w-full lg:w-auto flex justify-end"><button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"><CalendarIcon size={16} /> Novo Agendamento</button></div>
        </div>

        {/* Body */}
        <div className="p-4 flex-1 overflow-auto bg-slate-50/30">
            {viewMode === 'list' && renderListView()}
            {viewMode === 'day' && renderDayView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'month' && renderMonthView()}
        </div>
      </div>

      {/* --- Chatbot Floating Button --- */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
          {isChatOpen && (
              <div className="bg-white w-80 h-96 rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-fade-in mb-2">
                  <div className="bg-slate-900 text-white p-3 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                          <Sparkles size={16} className="text-teal-400" />
                          <span className="font-bold text-sm">Assistente Virtual</span>
                      </div>
                      <button onClick={() => setIsChatOpen(false)} className="hover:bg-white/10 rounded p-1"><X size={16} /></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 custom-scrollbar">
                      {chatMessages.map(msg => (
                          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] p-3 rounded-xl text-sm ${msg.role === 'user' ? 'bg-teal-600 text-white rounded-br-none' : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-bl-none'}`}>
                                  {msg.text}
                              </div>
                          </div>
                      ))}
                      {isBotThinking && (
                          <div className="flex justify-start">
                              <div className="bg-white text-slate-500 shadow-sm border border-slate-100 p-3 rounded-xl rounded-bl-none text-xs flex gap-1 items-center">
                                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                              </div>
                          </div>
                      )}
                      <div ref={chatEndRef} />
                  </div>

                  <form onSubmit={handleChatSubmit} className="p-3 bg-white border-t border-slate-100 flex gap-2">
                      <input 
                          autoFocus
                          type="text" 
                          placeholder="Ex: Confirmar consulta da Ana..." 
                          className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-teal-500"
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                      />
                      <button type="submit" disabled={isBotThinking || !chatInput.trim()} className="bg-teal-600 text-white p-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors">
                          <Send size={16} />
                      </button>
                  </form>
              </div>
          )}

          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 ${isChatOpen ? 'bg-slate-700 text-white' : 'bg-teal-600 text-white'}`}
          >
              {isChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
          </button>
      </div>

    </div>
  );
};

export default Dashboard;