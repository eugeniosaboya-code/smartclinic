import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { AppointmentStatus, ProfessionalSettings } from '../types';
import { Clock, Check, ChevronRight, User, Mail, Phone, AlertCircle, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

const PublicBooking: React.FC = () => {
  const [settings, setSettings] = useState<ProfessionalSettings | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [patientName, setPatientName] = useState('');
  
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [errors, setErrors] = useState<{email?: string; phone?: string; dob?: string}>({});

  const [step, setStep] = useState(1);

  useEffect(() => {
    // 1. Load Settings
    const config = StorageService.getSettings();
    setSettings(config);

    // 2. Generate Dates based on settings
    const dates = [];
    const today = new Date();
    const maxDays = config.scheduling?.maxFutureDays || 30; // Default 30 if undefined
    
    // Start loop
    // We check day by day up to maxDays in the future
    for (let i = 1; i <= maxDays; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        
        const dayIndex = d.getDay();
        if (config.availability.weekDays.includes(dayIndex)) {
            dates.push(d.toISOString().split('T')[0]);
        }
    }
    setAvailableDates(dates);

  }, []);

  // Effect to update slots when Date changes (or initial load)
  useEffect(() => {
      if (!selectedDate || !settings) return;

      const slots = [];
      const { startHour, endHour, slotDuration } = settings.availability;
      const minNoticeHours = settings.scheduling?.minNoticeHours || 0;
      
      // Parse settings time
      // We create a base date for the selected date
      const [year, month, day] = selectedDate.split('-').map(Number);
      
      const start = new Date(year, month - 1, day);
      const [startH, startM] = startHour.split(':').map(Number);
      start.setHours(startH, startM, 0, 0);

      const end = new Date(year, month - 1, day);
      const [endH, endM] = endHour.split(':').map(Number);
      end.setHours(endH, endM, 0, 0);

      const currentSlot = new Date(start);

      // Now logic
      const now = new Date();
      // Add minimum notice to "now"
      const earliestBookingTime = new Date(now.getTime() + (minNoticeHours * 60 * 60 * 1000));

      while (currentSlot < end) {
        // Only add slot if it's in the future AND after the minimum notice time
        if (currentSlot > earliestBookingTime) {
            const timeString = currentSlot.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            slots.push(timeString);
        }
        
        currentSlot.setMinutes(currentSlot.getMinutes() + slotDuration);
      }
      setTimeSlots(slots);
      
      // Reset selected time if it's no longer valid in the new list (though rare in this flow)
      setSelectedTime('');

  }, [selectedDate, settings]);

  const validateForm = () => {
    const newErrors: {email?: string; phone?: string; dob?: string} = {};
    let isValid = true;

    // Email Regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
        newErrors.email = 'Email é obrigatório.';
        isValid = false;
    } else if (!emailRegex.test(email)) {
        newErrors.email = 'Digite um email válido.';
        isValid = false;
    }

    // Phone Regex
    const phoneRegex = /^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/;
    if (!phone) {
        newErrors.phone = 'Telefone é obrigatório.';
        isValid = false;
    } else if (!phoneRegex.test(phone)) {
        newErrors.phone = 'Formato inválido. Use (DD) 99999-9999';
        isValid = false;
    }

    // Date of Birth Validation
    if (!dob) {
        newErrors.dob = 'Data de nascimento é obrigatória.';
        isValid = false;
    } else {
        const date = new Date(dob);
        const today = new Date();
        if (date > today) {
            newErrors.dob = 'Data inválida (futuro).';
            isValid = false;
        }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (!selectedDate || !selectedTime || !patientName) return;

    // --- Validação de Horário Passado ---
    const [year, month, day] = selectedDate.split('-').map(Number);
    const [hours, minutes] = selectedTime.split(':').map(Number);
    // Cria data baseada na seleção local
    const appointmentDateTime = new Date(year, month - 1, day, hours, minutes);
    
    // Verifica se a data selecionada é anterior ao momento atual
    if (appointmentDateTime < new Date()) {
        alert("O horário selecionado já passou ou expirou. Por favor, escolha um novo horário.");
        // Retorna para o passo 1 para atualizar os slots
        setStep(1);
        setSelectedTime('');
        return;
    }
    // ------------------------------------

    const formattedDob = dob ? new Date(dob).toLocaleDateString('pt-BR') : 'Não informado';
    const contactInfo = `Contato: ${email} | Tel: ${phone} | Nascimento: ${formattedDob}`;

    StorageService.createAppointment({
      id: Math.random().toString(36).substr(2, 9),
      patientId: 'guest',
      patientName: patientName,
      date: selectedDate,
      time: selectedTime,
      status: AppointmentStatus.SCHEDULED,
      notes: contactInfo, 
      read: false
    });

    setStep(3);
  };

  const calculateLateToleranceTime = () => {
      if(!selectedTime || !settings?.scheduling?.lateArrivalTolerance) return null;
      
      const tolerance = settings.scheduling.lateArrivalTolerance;
      const [h, m] = selectedTime.split(':').map(Number);
      const date = new Date();
      date.setHours(h, m + tolerance);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (!settings) return <div className="min-h-screen flex items-center justify-center text-slate-500">Carregando agenda...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Customized Header */}
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-400 via-slate-900 to-slate-900"></div>
            
            <div className="relative z-10 flex flex-col items-center">
                <img 
                    src={settings.profile.avatarUrl} 
                    alt={settings.profile.name}
                    className="w-24 h-24 rounded-full border-4 border-white/20 shadow-xl object-cover mb-4 bg-white"
                />
                <h1 className="text-2xl font-bold text-white">{settings.profile.name}</h1>
                <p className="text-teal-400 font-medium text-sm mt-1">{settings.profile.specialty}</p>
                <p className="text-slate-400 text-sm mt-3 max-w-xs leading-relaxed">
                   {settings.profile.bio}
                </p>
            </div>
            
            {step < 3 && (
                 <Link to="/dashboard" className="absolute top-4 right-4 text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded transition-colors backdrop-blur-sm">Admin</Link>
            )}
        </div>

        <div className="p-8">
            {step === 1 && (
                <div className="space-y-8 animate-fade-in">
                    {availableDates.length === 0 ? (
                        <div className="text-center text-slate-500 py-10 bg-slate-50 rounded-lg border border-dashed">
                            Nenhum horário disponível nos próximos dias.
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3">
                                    <div className="bg-teal-100 text-teal-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</div>
                                    Escolha uma Data
                                </label>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                                    {availableDates.map(date => (
                                        <button
                                            key={date}
                                            onClick={() => setSelectedDate(date)}
                                            className={`p-2 rounded-xl text-sm border transition-all relative overflow-hidden group ${
                                                selectedDate === date 
                                                ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                                                : 'border-slate-200 text-slate-600 hover:border-teal-400'
                                            }`}
                                        >
                                            <div className="text-[10px] uppercase font-bold opacity-60 mb-0.5">
                                                {new Date(date).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                                            </div>
                                            <div className="font-bold text-xl">
                                                {new Date(date).getDate()}
                                            </div>
                                            {selectedDate === date && (
                                                <div className="absolute top-1 right-1 w-2 h-2 bg-teal-400 rounded-full"></div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={`transition-all duration-300 ${selectedDate ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3">
                                    <div className="bg-teal-100 text-teal-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</div>
                                    Escolha um Horário ({settings.availability.slotDuration} min)
                                </label>
                                {timeSlots.length > 0 ? (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {timeSlots.map(time => (
                                            <button
                                                key={time}
                                                onClick={() => setSelectedTime(time)}
                                                className={`py-2 rounded-lg text-sm font-medium border transition-all flex items-center justify-center gap-1 ${
                                                    selectedTime === time 
                                                    ? 'bg-teal-600 text-white border-teal-600 shadow-md' 
                                                    : 'border-slate-200 text-slate-600 hover:border-teal-300 hover:bg-teal-50'
                                                }`}
                                            >
                                                {time}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-sm text-slate-400 py-4 bg-slate-50 rounded border border-slate-100">
                                        Sem horários livres nesta data (considerando antecedência mínima de {settings.scheduling?.minNoticeHours}h).
                                    </div>
                                )}
                            </div>

                            <button 
                                disabled={!selectedDate || !selectedTime}
                                onClick={() => setStep(2)}
                                className="w-full mt-4 bg-slate-900 text-white py-4 rounded-xl font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition-all flex justify-between items-center px-6 group"
                            >
                                <span>Continuar Agendamento</span>
                                <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </>
                    )}
                </div>
            )}

            {step === 2 && (
                <form onSubmit={handleBooking} className="space-y-5 animate-fade-in">
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center relative overflow-hidden mb-6">
                        <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-2">Você selecionou</p>
                        <p className="text-2xl font-bold text-slate-800">
                            {new Date(selectedDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                        </p>
                        <p className="text-xl text-teal-600 font-medium mt-1">
                            às {selectedTime}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-1">
                         <div className="bg-teal-100 text-teal-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</div>
                         Seus Dados
                    </div>

                    {/* Name Field */}
                    <div>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18}/>
                            <input 
                                required
                                type="text" 
                                className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-teal-500 outline-none transition-shadow"
                                placeholder="Nome completo"
                                value={patientName}
                                onChange={(e) => setPatientName(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Email Field */}
                    <div>
                        <div className="relative">
                            <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${errors.email ? 'text-red-400' : 'text-slate-400'}`} size={18}/>
                            <input 
                                required
                                type="email" 
                                className={`w-full border rounded-xl pl-10 pr-4 py-3 outline-none transition-shadow ${errors.email ? 'border-red-300 focus:ring-2 focus:ring-red-200 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-teal-500'}`}
                                placeholder="Seu email (ex: nome@email.com)"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if(errors.email) setErrors({...errors, email: undefined});
                                }}
                            />
                        </div>
                        {errors.email && (
                            <p className="flex items-center gap-1 text-xs text-red-500 mt-1 pl-1">
                                <AlertCircle size={12} /> {errors.email}
                            </p>
                        )}
                    </div>

                    {/* Phone Field */}
                    <div>
                        <div className="relative">
                            <Phone className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${errors.phone ? 'text-red-400' : 'text-slate-400'}`} size={18}/>
                            <input 
                                required
                                type="tel" 
                                className={`w-full border rounded-xl pl-10 pr-4 py-3 outline-none transition-shadow ${errors.phone ? 'border-red-300 focus:ring-2 focus:ring-red-200 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-teal-500'}`}
                                placeholder="(DD) 99999-9999 ou (DD) 3333-4444"
                                value={phone}
                                onChange={(e) => {
                                    setPhone(e.target.value);
                                    if(errors.phone) setErrors({...errors, phone: undefined});
                                }}
                            />
                        </div>
                        {errors.phone && (
                            <p className="flex items-center gap-1 text-xs text-red-500 mt-1 pl-1">
                                <AlertCircle size={12} /> {errors.phone}
                            </p>
                        )}
                    </div>

                    {/* DOB Field */}
                    <div>
                        <div className="relative">
                            <Calendar className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${errors.dob ? 'text-red-400' : 'text-slate-400'}`} size={18}/>
                            <input 
                                required
                                type="date" 
                                className={`w-full border rounded-xl pl-10 pr-4 py-3 outline-none transition-shadow ${errors.dob ? 'border-red-300 focus:ring-2 focus:ring-red-200 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-teal-500'} text-slate-600`}
                                placeholder="Data de Nascimento"
                                value={dob}
                                onChange={(e) => {
                                    setDob(e.target.value);
                                    if(errors.dob) setErrors({...errors, dob: undefined});
                                }}
                            />
                        </div>
                        {errors.dob && (
                            <p className="flex items-center gap-1 text-xs text-red-500 mt-1 pl-1">
                                <AlertCircle size={12} /> {errors.dob}
                            </p>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button 
                            type="button"
                            onClick={() => setStep(1)}
                            className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                        >
                            Voltar
                        </button>
                        <button 
                            type="submit"
                            className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-bold hover:bg-teal-700 transition-colors shadow-lg shadow-teal-200"
                        >
                            Confirmar Agendamento
                        </button>
                    </div>
                </form>
            )}

            {step === 3 && (
                <div className="text-center py-8 animate-scale-in">
                    <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <Check size={48} strokeWidth={3} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Agendamento Confirmado!</h2>
                    <p className="text-slate-600 mb-2 max-w-xs mx-auto leading-relaxed">
                        Obrigado, <span className="font-bold text-slate-800">{patientName}</span>. 
                        Seu horário com {settings.profile.name} foi reservado.
                    </p>
                    
                    {/* Tolerance Info */}
                    {settings.scheduling?.lateArrivalTolerance && (
                        <div className="mb-8 inline-block bg-yellow-50 text-yellow-700 px-4 py-2 rounded-lg border border-yellow-200 text-sm">
                            <p className="font-bold flex items-center gap-2 justify-center">
                                <Clock size={16} /> Tolerância de Atraso
                            </p>
                            <p>
                                Chegada máxima permitida: <strong>{calculateLateToleranceTime()}</strong> ({settings.scheduling.lateArrivalTolerance} min).
                            </p>
                        </div>
                    )}

                    <div>
                        <Link 
                            to="/booking" 
                            onClick={() => { 
                                setStep(1); 
                                setSelectedDate(''); 
                                setSelectedTime(''); 
                                setPatientName('');
                                setEmail('');
                                setPhone('');
                                setDob('');
                            }}
                            className="inline-block bg-slate-100 text-slate-600 font-bold px-6 py-3 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            Fazer novo agendamento
                        </Link>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default PublicBooking;