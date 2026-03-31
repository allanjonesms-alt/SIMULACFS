import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, query, orderBy, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Save, Plus, Tag, FileText } from 'lucide-react';

interface Version {
  id: string;
  version: string;
  type: 'Atualização' | 'Correção';
  description: string;
  createdAt: any;
}

const VersionControl: React.FC<{ setNotification: any }> = ({ setNotification }) => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [newVersion, setNewVersion] = useState({ version: '', type: 'Atualização' as const, description: '' });
  const [implementations, setImplementations] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    console.log("Fetching versions...");
    try {
      const vSnap = await getDocs(query(collection(db, 'versions'), orderBy('createdAt', 'desc')));
      setVersions(vSnap.docs.map(d => ({ id: d.id, ...d.data() } as Version)));
      
      const iSnap = await getDocs(collection(db, 'settings'));
      const iDoc = iSnap.docs.find(d => d.id === 'implementations');
      if (iDoc) setImplementations(iDoc.data().text || '');
    } catch (e) {
      console.error("Erro ao buscar dados no VersionControl:", e);
    }
  };

  const saveImplementation = async () => {
    console.log("Salvando implementações...");
    try {
      await setDoc(doc(db, 'settings', 'implementations'), { text: implementations });
      setNotification({ message: 'Implementações salvas!', type: 'success' });
    } catch (e) {
      console.error("Erro ao salvar implementações:", e);
      setNotification({ message: 'Erro ao salvar implementações', type: 'error' });
    }
  };

  const addVersion = async () => {
    console.log("Adicionando versão...");
    try {
      await addDoc(collection(db, 'versions'), { ...newVersion, createdAt: serverTimestamp() });
      setNewVersion({ version: '', type: 'Atualização', description: '' });
      fetchData();
      setNotification({ message: 'Versão registrada!', type: 'success' });
    } catch (e) {
      console.error("Erro ao adicionar versão:", e);
      setNotification({ message: 'Erro ao registrar versão: ' + (e as Error).message, type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Implementações (Memorando)</h3>
        <textarea
          value={implementations}
          onChange={(e) => setImplementations(e.target.value)}
          className="w-full p-4 rounded-xl border border-slate-200 mb-4 h-32"
          placeholder="Ideias para a próxima atualização..."
        />
        <button onClick={saveImplementation} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700">
          <Save className="w-4 h-4" /> Salvar Implementações
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Registrar Nova Versão</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <input value={newVersion.version} onChange={e => setNewVersion({...newVersion, version: e.target.value})} placeholder="Versão (ex: 1.0.0)" className="p-3 rounded-xl border border-slate-200" />
          <select value={newVersion.type} onChange={e => setNewVersion({...newVersion, type: e.target.value as any})} className="p-3 rounded-xl border border-slate-200">
            <option>Atualização</option>
            <option>Correção</option>
          </select>
          <input value={newVersion.description} onChange={e => setNewVersion({...newVersion, description: e.target.value})} placeholder="Descrição" className="p-3 rounded-xl border border-slate-200" />
        </div>
        <button onClick={addVersion} className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700">
          <Plus className="w-4 h-4" /> Registrar Versão
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Histórico de Versões</h3>
        {versions.map(v => (
          <div key={v.id} className="flex items-center gap-4 p-4 border-b border-slate-100">
            <Tag className="text-indigo-500" />
            <div>
              <p className="font-bold">{v.version} - <span className="text-slate-500 text-sm">{v.type}</span></p>
              <p className="text-slate-600 text-sm">{v.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VersionControl;
