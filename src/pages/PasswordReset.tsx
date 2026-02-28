import { useState } from 'react';
import { resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import '../styles/PasswordReset.css';

export default function PasswordReset() {
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await resetPassword({ username: email });
      setMessage({ type: 'success', text: 'Check your email for the reset code.' });
      setStep('confirm');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send reset code' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword: newPassword,
      });
      setMessage({ type: 'success', text: 'Password reset successful! Redirecting to login...' });
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to reset password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="password-reset-container">
      <div className="password-reset-card">
        <div className="reset-header">
          <h1>🔐 Reset Password</h1>
          <p>Enter your email to receive a password reset code</p>
        </div>

        {message && (
          <div className={`message ${message.type}`}>
            {message.type === 'success' ? '✅' : '❌'} {message.text}
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleForgotPassword} className="reset-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Sending code...' : 'Send Reset Code'}
            </button>

            <p className="footer-text">
              Remember your password? <a href="/">Back to Login</a>
            </p>
          </form>
        ) : (
          <form onSubmit={handleConfirmReset} className="reset-form">
            <div className="form-group">
              <label htmlFor="code">Reset Code</label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter the code from your email"
                required
                disabled={loading}
              />
              <small>Check your email for the 6-digit code</small>
            </div>

            <div className="form-group">
              <label htmlFor="password">New Password</label>
              <input
                id="password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                disabled={loading}
              />
              <small>At least 8 characters, with uppercase, lowercase, numbers, and symbols</small>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                disabled={loading}
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Resetting password...' : 'Reset Password'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('request');
                setCode('');
                setNewPassword('');
                setConfirmPassword('');
                setMessage(null);
              }}
              className="btn btn-secondary"
              disabled={loading}
            >
              Back
            </button>

            <p className="footer-text">
              <a href="/">Back to Login</a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
