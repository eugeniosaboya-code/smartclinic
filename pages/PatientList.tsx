import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { StorageService } from '../services/storage';
import { Patient } from '../types';
import { Search, Plus, User as UserIcon, ChevronRight } from 'lucide-react';

const PatientList: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');

  useEffect(() => {
    setPatients(StorageService.getPatients());
  }, []);

  const handleAddPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim()) return;

    const newPatient: Patient = {
      id: Math.random().toString(36).substr(2, 9),
      name: newPatientName,
      email: '',
      phone: '',
      createdAt: new Date().toISOString(),
      notes: [],
      avatarUrl: `https://picsum.photos/200/200?random=${Date.now()}`
    };

    StorageService.savePatient(newPatient);
    setPatients(StorageService.getPatients());
    setNewPatientName('');
    setIsModalOpen(false);
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Pacientes</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} /> Novo Paciente
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar paciente por nome..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-shadow"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPatients.map(patient => (
          <Link 
            key={patient.id} 
            to={`/patients/${patient.id}`}
            className="group bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md hover:border-teal-300 transition-all duration-200"
          >
            <div className="flex items-center gap-4 mb-4">
              <img 
                src={patient.avatarUrl} 
                alt={patient.name} 
                className="w-14 h-14 rounded-full object-cover border-2 border-slate-100 group-hover:border-teal-100 transition-colors"
              />
              <div>
                <h3 className="font-bold text-slate-800 group-hover:text-teal-700 transition-colors">{patient.name}</h3>
                <p className="text-sm text-slate-500">Desde {new Date(patient.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex justify-between items-center text-sm text-slate-400 mt-2 pt-4 border-t border-slate-50">
               <span>{patient.notes.length} Prontuários</span>
               <ChevronRight size={16} />
            </div>
          </Link>
        ))}
      </div>

      {/* Simple Modal for New Patient */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Cadastrar Paciente</h2>
            <form onSubmit={handleAddPatient}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                <input 
                  autoFocus
                  type="text" 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientList;
