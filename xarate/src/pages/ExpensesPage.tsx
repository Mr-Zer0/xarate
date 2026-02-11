// Expenses page - displays the list of expenses
import React from 'react';
import { ExpenseList, ExpenseFilters } from '../components/expenses';

export const ExpensesPage: React.FC = () => {
  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        </div>
      </header>
      
      <ExpenseFilters />
      
      <main className="flex-1 overflow-hidden">
        <ExpenseList />
      </main>
    </div>
  );
};
