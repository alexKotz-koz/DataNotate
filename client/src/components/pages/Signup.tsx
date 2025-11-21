import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSignupMutation } from '../../store';

const roleOptions = [
  { value: 'annotator', label: 'Annotator' },
  { value: 'researcher', label: 'Researcher' },
  { value: 'admin', label: 'Admin' }
] as const;

type RoleOption = typeof roleOptions[number]['value'];

interface SignupFormState {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  organization: string;
  role: RoleOption;
}

export default function Signup() {
  const navigate = useNavigate();
  const [signup, { isLoading }] = useSignupMutation();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<SignupFormState>({
    username: '',
    password: '',
    email: '',
    firstName: '',
    lastName: '',
    organization: '',
    role: 'annotator'
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await signup(form).unwrap();
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err?.data?.error || 'Signup failed');
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-7">
          <div className="card shadow-sm">
            <div className="card-body">
              <h3 className="mb-4">Create Account</h3>
              {error && <div className="alert alert-danger">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">First Name</label>
                    <input
                      className="form-control"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Last Name</label>
                    <input
                      className="form-control"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Organization</label>
                    <input
                      className="form-control"
                      value={form.organization}
                      onChange={(e) => setForm({ ...form, organization: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Role</label>
                    <select
                      className="form-select"
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value as RoleOption })}
                    >
                      {roleOptions.map((role) => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Username</label>
                    <input
                      className="form-control"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-md-12">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      className="form-control"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary w-100 mt-4" disabled={isLoading}>
                  {isLoading ? 'Creating account...' : 'Sign Up'}
                </button>
              </form>
              <div className="text-center mt-3">
                <span className="text-muted">Already have an account? </span>
                <Link to="/login">Sign in</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
