// Expenses page - displays the list of expenses
import React from 'react';
import { ExpenseList, ExpenseFilters } from '../components/expenses';

export const ExpensesPage: React.FC = () => {
  return (
    <div className="flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
      </div>
      
      <ExpenseFilters />
      
      <div className="mt-4">
        <ExpenseList />
      </div>
    </div>
  );
};
