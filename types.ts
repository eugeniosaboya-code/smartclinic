export enum AppointmentStatus {
  SCHEDULED = 'Agendado',
  CONFIRMED = 'Confirmado',
  COMPLETED = 'Realizado',
  CANCELLED = 'Cancelado'
}

export interface ClinicalNote {
  id: string;
  date: string;
  content: string;
  sentiment?: string;
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes: ClinicalNote[];
  createdAt: string;
  avatarUrl?: string;
}

export interface Appointment {
  id: string;
  patientId: string; // If null, it's a blocked slot or external
  patientName: string;
  date: string; // ISO string
  time: string; // HH:mm
  status: AppointmentStatus;
  notes?: string;
  read?: boolean; // Indicates if the admin has seen this notification
}

export interface User {
  id: string;
  name: string;
  role: 'psychologist' | 'admin';
}

export interface ProfessionalSettings {
  profile: {
    name: string;
    specialty: string;
    bio: string;
    avatarUrl: string;
    email: string;
  };
  availability: {
    weekDays: number[]; // 0 = Sunday, 1 = Monday, etc.
    startHour: string; // "09:00"
    endHour: string;   // "18:00"
    slotDuration: number; // minutes, e.g., 50
  };
  scheduling: {
    minNoticeHours: number; // Minimum hours before booking (e.g., 2 hours, 24 hours)
    maxFutureDays: number;  // How many days in the future to show (e.g., 30 days)
    lateArrivalTolerance: number; // Tolerance in minutes for late arrival
  };
  reminder?: {
    enabled: boolean;
    timeBeforeHours: number; // e.g., 24 hours before
    messageTemplate: string; // e.g., "Olá {paciente}, lembrete da sua consulta..."
  };
}