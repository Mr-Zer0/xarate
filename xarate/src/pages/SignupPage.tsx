// Signup page component
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout, SignupForm } from '../components/auth';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/setup');
  };

  const handleSwitchToLogin = () => {
    navigate('/login');
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Start tracking your expenses today"
    >
      <SignupForm
        onSuccess={handleSuccess}
        onSwitchToLogin={handleSwitchToLogin}
      />
    </AuthLayout>
  );
};
