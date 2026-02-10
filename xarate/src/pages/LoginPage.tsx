// Login page component
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout, LoginForm } from '../components/auth';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/');
  };

  const handleSwitchToSignup = () => {
    navigate('/signup');
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your expense tracker"
    >
      <LoginForm
        onSuccess={handleSuccess}
        onSwitchToSignup={handleSwitchToSignup}
      />
    </AuthLayout>
  );
};
