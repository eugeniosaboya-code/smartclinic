import { GoogleGenAI } from "@google/genai";
import { ClinicalNote, Appointment } from "../types";

const apiKey = process.env.API_KEY || ''; // Ensure this is set in your environment
const ai = new GoogleGenAI({ apiKey });

export const AIService = {
  summarizeNotes: async (patientName: string, notes: ClinicalNote[]): Promise<string> => {
    if (!notes || notes.length === 0) return "Não há notas suficientes para gerar um resumo.";
    if (!apiKey) return "Chave de API não configurada (Simulação: Resumo indisponível).";

    // Prepare context from notes
    const notesText = notes
      .map(n => `[Data: ${new Date(n.date).toLocaleDateString()}] Nota: ${n.content}`)
      .join('\n');

    const prompt = `
      Atue como um assistente clínico sênior para um psicólogo.
      Analise as seguintes notas de sessões do paciente ${patientName}.
      
      Notas:
      ${notesText}

      Por favor, gere um resumo clínico conciso (máximo 2 parágrafos) em Português.
      Foque na evolução do paciente, principais queixas recorrentes e progressos notáveis.
      Use uma linguagem profissional e objetiva.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text || "Não foi possível gerar o resumo.";
    } catch (error) {
      console.error("Erro ao chamar Gemini API:", error);
      return "Erro ao comunicar com o serviço de IA. Verifique sua conexão ou chave de API.";
    }
  },

  interpretSchedulingCommand: async (userMessage: string, appointments: Appointment[]): Promise<{
    action: 'CONFIRM' | 'CANCEL' | 'RESCHEDULE_LINK' | 'UNKNOWN';
    appointmentId?: string;
    reply: string;
  }> => {
    if (!apiKey) {
      return { 
        action: 'UNKNOWN', 
        reply: 'IA não configurada. Por favor, configure a API KEY no ambiente.' 
      };
    }

    // Filter only future or recent appointments to reduce context size and focus on relevant actions
    // Mapping to a simpler structure to save tokens
    const relevantApps = appointments.map(a => ({
      id: a.id,
      patient: a.patientName,
      date: a.date,
      time: a.time,
      status: a.status
    }));

    const prompt = `
      Você é um assistente de agendamento de uma clínica de psicologia.
      Hoje é: ${new Date().toLocaleDateString('pt-BR')} (Dia da semana: ${new Date().toLocaleDateString('pt-BR', {weekday: 'long'})}).
      
      Lista de Agendamentos Atuais:
      ${JSON.stringify(relevantApps)}

      Comando do Usuário: "${userMessage}"

      Instruções:
      1. Identifique a intenção do usuário: 
         - CONFIRM (Confirmar consulta)
         - CANCEL (Cancelar consulta)
         - RESCHEDULE_LINK (Pedir para remarcar/enviar link)
         - UNKNOWN (Não entendeu ou ambíguo)
      2. Identifique qual agendamento (ID) o usuário se refere baseando-se no nome do paciente e datas relativas (hoje, amanhã, dia X).
      3. Responda APENAS um JSON estrito seguindo o schema abaixo.
      
      Schema JSON esperado:
      {
        "action": "CONFIRM" | "CANCEL" | "RESCHEDULE_LINK" | "UNKNOWN",
        "appointmentId": "string_id_ou_null",
        "reply": "Uma resposta curta e amigável em português confirmando a ação realizada ou pedindo esclarecimento."
      }
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      
      const text = response.text;
      if (!text) throw new Error("Sem resposta da IA");
      
      return JSON.parse(text.trim());
    } catch (error) {
      console.error("Erro no chatbot:", error);
      return { 
        action: 'UNKNOWN', 
        reply: 'Desculpe, não consegui processar sua solicitação no momento.' 
      };
    }
  }
};