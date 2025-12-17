import { Patient, Appointment, AppointmentStatus, ClinicalNote, ProfessionalSettings } from '../types';

const PATIENTS_KEY = 'psi_patients';
const APPOINTMENTS_KEY = 'psi_appointments';
const SETTINGS_KEY = 'psi_settings';

// Seed data helper
const seedData = () => {
  if (!localStorage.getItem(PATIENTS_KEY)) {
    const initialPatients: Patient[] = [
      {
        id: '1',
        name: 'Ana Silva',
        email: 'ana.silva@example.com',
        phone: '(11) 99999-0000',
        createdAt: new Date().toISOString(),
        avatarUrl: 'https://picsum.photos/200/200?random=1',
        notes: [
          { id: 'n1', date: new Date(Date.now() - 86400000 * 7).toISOString(), content: 'Paciente relata ansiedade moderada devido ao trabalho.' },
          { id: 'n2', date: new Date(Date.now() - 86400000 * 2).toISOString(), content: 'Melhora no sono relatada após exercícios de respiração.' }
        ]
      },
      {
        id: '2',
        name: 'Carlos Oliveira',
        email: 'carlos.o@example.com',
        phone: '(11) 98888-1111',
        createdAt: new Date().toISOString(),
        avatarUrl: 'https://picsum.photos/200/200?random=2',
        notes: []
      }
    ];
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(initialPatients));
  }

  if (!localStorage.getItem(APPOINTMENTS_KEY)) {
    const initialAppointments: Appointment[] = [
      {
        id: 'a1',
        patientId: '1',
        patientName: 'Ana Silva',
        date: new Date().toISOString().split('T')[0], // Today
        time: '14:00',
        status: AppointmentStatus.SCHEDULED,
        read: true // Seed data is already "seen"
      }
    ];
    localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(initialAppointments));
  }

  if (!localStorage.getItem(SETTINGS_KEY)) {
    const defaultSettings: ProfessionalSettings = {
      profile: {
        name: 'Dr. Silva',
        specialty: 'Psicologia Clínica & TCC',
        bio: 'Especialista em ansiedade e desenvolvimento pessoal com 10 anos de experiência.',
        avatarUrl: 'https://i.pravatar.cc/300?img=11',
        email: 'contato@drsilva.com'
      },
      availability: {
        weekDays: [1, 2, 3, 4, 5], // Mon-Fri
        startHour: '09:00',
        endHour: '18:00',
        slotDuration: 60
      },
      scheduling: {
        minNoticeHours: 2,   // 2 hours minimum notice
        maxFutureDays: 30,   // Open agenda for 30 days
        lateArrivalTolerance: 15 // 15 minutes tolerance
      },
      reminder: {
        enabled: true,
        timeBeforeHours: 24,
        messageTemplate: "Olá {paciente}, lembrete da sua consulta amanhã às {hora}. Responda para confirmar."
      }
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
  }
};

seedData();

export const StorageService = {
  getPatients: (): Patient[] => {
    return JSON.parse(localStorage.getItem(PATIENTS_KEY) || '[]');
  },

  getPatientById: (id: string): Patient | undefined => {
    const patients = StorageService.getPatients();
    return patients.find(p => p.id === id);
  },

  savePatient: (patient: Patient) => {
    const patients = StorageService.getPatients();
    const existingIndex = patients.findIndex(p => p.id === patient.id);
    if (existingIndex >= 0) {
      patients[existingIndex] = patient;
    } else {
      patients.push(patient);
    }
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
  },

  addClinicalNote: (patientId: string, noteContent: string) => {
    const patients = StorageService.getPatients();
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      const newNote: ClinicalNote = {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString(),
        content: noteContent
      };
      patient.notes.unshift(newNote); // Newest first
      localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
      return newNote;
    }
    return null;
  },

  getAppointments: (): Appointment[] => {
    return JSON.parse(localStorage.getItem(APPOINTMENTS_KEY) || '[]');
  },

  createAppointment: (appointment: Appointment) => {
    const apps = StorageService.getAppointments();
    apps.push(appointment);
    localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(apps));
  },

  updateAppointmentStatus: (id: string, status: AppointmentStatus) => {
    const apps = StorageService.getAppointments();
    const index = apps.findIndex(a => a.id === id);
    if (index >= 0) {
      apps[index].status = status;
      localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(apps));
    }
  },

  markAppointmentAsRead: (id: string) => {
    const apps = StorageService.getAppointments();
    const index = apps.findIndex(a => a.id === id);
    if (index >= 0) {
      apps[index].read = true;
      localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(apps));
    }
  },

  getSettings: (): ProfessionalSettings => {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) {
        seedData();
        return JSON.parse(localStorage.getItem(SETTINGS_KEY)!);
    }
    const parsed = JSON.parse(stored);
    
    // Migration helper: ensure new fields exist if loading old data
    if (!parsed.scheduling) {
        parsed.scheduling = { minNoticeHours: 2, maxFutureDays: 30, lateArrivalTolerance: 15 };
    } else if (parsed.scheduling.lateArrivalTolerance === undefined) {
        parsed.scheduling.lateArrivalTolerance = 15;
    }

    if (!parsed.reminder) {
        parsed.reminder = {
            enabled: true,
            timeBeforeHours: 24,
            messageTemplate: "Olá {paciente}, lembrete da sua consulta amanhã às {hora}. Responda para confirmar."
        };
    }

    return parsed;
  },

  saveSettings: (settings: ProfessionalSettings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
};