import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Question } from '../types';

export const useQuestions = (filter?: (q: Question) => boolean) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        let qList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
        if (filter) {
          qList = qList.filter(filter);
        }
        setQuestions(qList);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'questions');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  return { questions, loading };
};
