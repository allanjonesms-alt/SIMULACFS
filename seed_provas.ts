import { db } from './src/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const seed = async () => {
  const q = {
    text: "1. (IDECAN-CFSD 2022) Acerca da Polícia Militar de Mato Grosso do Sul (PMMS), analise os itens abaixo:\n\nI. A PMMS é uma instituição permanente destinada à manutenção da Ordem Pública, sendo Força Essencial Reservada do Exército Brasileiro.\n\nII. O Comandante-Geral da Polícia Militar de Mato Grosso do Sul será escolhido livremente pelo Governador do Estado, dentre os oficiais do QOPM, ocupantes do último posto da hierarquia Policial-Militar.\n\nIII. A PMMS subordina-se operacionalmente ao Secretário de Estado e administrativamente ao Governador do Estado.\n\nEstá(ão) correto(s) o(s) item(ns):",
    options: [
      "apenas I.",
      "apenas II.",
      "apenas III.",
      "I e II.",
      "II e III."
    ],
    correctOption: 1,
    law: "Leis",
    category: "Provas Anteriores",
    justification: "Análise dos Itens\n\nItem I (Incorreto): A Polícia Militar é considerada Força Auxiliar e Reserva do Exército, conforme estabelece a Constituição Federal (Art. 144, § 6º) e o Estatuto dos Policiais Militares. O termo \"Força Essencial Reservada\" não existe na legislação.\n\nItem II (Correto): Conforme a Lei Complementar Estadual nº 190/2014 (Estatuto dos PMMS) e a Constituição Estadual, o Comandante-Geral é de livre escolha do Governador, devendo ser Oficial Superior do último posto (Coronel) do Quadro de Oficiais Policiais Militares (QOPM).\n\nItem III (Incorreto): A subordinação é inversa. A PMMS subordina-se ADMINISTRATIVAMENTE ao Secretário de Estado de Justiça e Segurança Pública (SEJUSP) e OPERACIONALMENTE ao Governador do Estado (que é o Comandante Supremo das Forças Estaduais).\n\nA alternativa correta é a B) apenas II.",
    difficulty: 3,
    createdAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, 'questions'), q);
    console.log('Question seeded successfully');
  } catch (e) {
    console.error('Error seeding question:', e);
  }
};

seed();
