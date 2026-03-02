// Add expense page - dedicated page for adding new expenses
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExpenseForm } from '../components/expenses';

export const AddExpensePage: React.FC = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/expenses');
  };

  const handleCancel = () => {
    navigate('/expenses');
  };

  return (
    <div className="flex flex-col page-transition">
      <ExpenseForm onSuccess={handleSuccess} onCancel={handleCancel} />
    </div>
  );
};
