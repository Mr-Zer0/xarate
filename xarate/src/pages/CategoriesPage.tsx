// Categories management page
import React from 'react';
import { CategoryManager } from '../components/categories';

export const CategoriesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <CategoryManager />
    </div>
  );
};
