// Edit expense page - dedicated page for editing existing expenses
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ExpenseForm } from '../components/expenses';
import { db } from '../db/database';
import type { Expense } from '../types/models';

export const EditExpensePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadExpense = async () => {
      if (!id) {
        setError('No expense ID provided');
        setLoading(false);
        return;
      }

      try {
        const exp = await db.expenses.get(id);
        if (!exp) {
          setError('Expense not found');
        } else {
          setExpense(exp);
        }
      } catch (err) {
        console.error('Failed to load expense:', err);
        setError('Failed to load expense');
      } finally {
        setLoading(false);
      }
    };

    loadExpense();
  }, [id]);

  const handleSuccess = () => {
    navigate('/expenses');
  };

  const handleCancel = () => {
    navigate('/expenses');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading expense...</p>
        </div>
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {error || 'Expense not found'}
          </h2>
          <p className="text-gray-600 mb-4">
            The expense you're looking for doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => navigate('/expenses')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Expenses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col page-transition">
      <ExpenseForm expense={expense} onSuccess={handleSuccess} onCancel={handleCancel} />
    </div>
  );
};
