import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { Eye, EyeOff, LoaderCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import './StudentRegistrationModal.css';

const BRANCHES = ['CSE', 'IT', 'ECE', 'EEE', 'ME', 'CE', 'AI', 'AIDS', 'CSBS', 'BBA', 'BCA', 'MCA', 'MBA', 'Other'];
const INTERESTS = [
  'Technical', 'Dance', 'Drama', 'Art', 'Singing', 'Literature', 'Social Service', 'Finance',
  'Entrepreneurship', 'Sports', 'Photography', 'Content Creation', 'Public Speaking', 'Design',
  'Gaming', 'Robotics', 'AI & ML', 'Cyber Security', 'Open Source', 'Other',
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 11 }, (_, index) => CURRENT_YEAR - index);
const emailDomain = import.meta.env.VITE_COLLEGE_EMAIL_DOMAIN?.replace(/^@/, '').toLowerCase();

const registrationSchema = z.object({
  enrolment_id: z.string()
    .min(8, 'Enrolment ID must contain at least 8 digits.')
    .max(20, 'Enrolment ID cannot exceed 20 digits.')
    .regex(/^\d+$/, 'Enrolment ID must contain digits only.'),
  name: z.string().trim()
    .min(3, 'Full name must contain at least 3 characters.')
    .max(100, 'Full name cannot exceed 100 characters.'),
  college_email_id: z.string().trim().email('Enter a valid college email address.')
    .refine((email) => !emailDomain || email.toLowerCase().endsWith(`@${emailDomain}`), {
      message: `Use your @${emailDomain} email address.`,
    }),
  password: z.string()
    .min(8, 'Password must contain at least 8 characters.')
    .regex(/[A-Z]/, 'Include at least one uppercase letter.')
    .regex(/[a-z]/, 'Include at least one lowercase letter.')
    .regex(/\d/, 'Include at least one number.')
    .regex(/[^A-Za-z0-9]/, 'Include at least one special character.'),
  year: z.string()
    .min(1, 'Select your year of admission.')
    .transform(Number)
    .pipe(z.number().int()
      .min(YEARS.at(-1), 'Choose a year within the last 10 years.')
      .max(CURRENT_YEAR, 'Choose a year no later than the current year.')),
  branch: z.string().min(1, 'Select your branch.'),
  interests: z.array(z.string()).min(1, 'Select at least one interest.'),
});

export default function StudentRegistrationModal({ onClose, onRegistered }) {
  const [showPassword, setShowPassword] = useState(false);
  const modalRef = useRef(null);
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registrationSchema),
    defaultValues: { enrolment_id: '', name: '', college_email_id: '', password: '', year: '', branch: '', interests: [] },
  });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement;
    document.body.style.overflow = 'hidden';
    const firstControl = modalRef.current.querySelector('input:not([type="checkbox"]), select');
    firstControl?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const elements = [...modalRef.current.querySelectorAll('button, input, select, [tabindex]:not([tabindex="-1"])')]
        .filter((element) => !element.disabled);
      const first = elements[0];
      const last = elements.at(-1);
      if (!modalRef.current.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  const submitRegistration = async (values) => {
    clearErrors('root.server');
    try {
      await axios.post('/api/auth/student-register', {
        ...values,
        enrolment_id: values.enrolment_id,
        college_email_id: values.college_email_id.trim().toLowerCase(),
      });
      toast.success('Account created successfully. Please sign in.');
      onRegistered(values.college_email_id.trim().toLowerCase());
    } catch (error) {
      if (!error.response || error.response.status === 502) {
        setError('root.server', { message: 'Unable to connect to server.' });
      } else if (error.response.status === 409) {
        if (error.response.data?.field === 'enrolment_id') {
          setError('enrolment_id', { message: error.response.data.message });
        } else {
          setError('college_email_id', { message: 'An account already exists with this email.' });
        }
      } else if (error.response.status === 400) {
        const message = error.response.data?.message || 'Please check the information you entered.';
        if (error.response.data?.field === 'enrolment_id') {
          setError('enrolment_id', { message });
        } else {
          setError('root.server', { message });
        }
      } else {
        setError('root.server', { message: 'Something went wrong. Please try again.' });
      }
    }
  };

  const fieldError = (name) => errors[name] && (
    <span className="registration-error" role="alert">{errors[name].message}</span>
  );

  return createPortal((
    <div className="registration-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !isSubmitting && onClose()}>
      <section
        ref={modalRef}
        className="registration-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="registration-title"
        aria-describedby="registration-subtitle"
      >
        <header className="registration-header">
          <div className="registration-mark" aria-hidden="true">CC</div>
          <div>
            <p className="registration-eyebrow">CLUBCONNECT · STUDENT</p>
            <h2 id="registration-title">Create Your Student Account</h2>
          </div>
          <button className="registration-close" type="button" onClick={onClose} aria-label="Close registration" disabled={isSubmitting}>
            <X size={19} />
          </button>
        </header>
        <p id="registration-subtitle" className="registration-subtitle">
          Join ClubConnect to discover societies, participate in events, and connect with campus opportunities.
        </p>

        <form className="registration-form" onSubmit={handleSubmit(submitRegistration)} noValidate>
          <div className="registration-fields">
            <div className="registration-field">
              <label htmlFor="registration-enrolment">Enrolment ID</label>
              <input id="registration-enrolment" type="number" inputMode="numeric" autoComplete="off" placeholder="e.g. 20260001" {...register('enrolment_id')} aria-invalid={!!errors.enrolment_id} />
              {fieldError('enrolment_id')}
            </div>
            <div className="registration-field">
              <label htmlFor="registration-name">Full Name</label>
              <input id="registration-name" type="text" autoComplete="name" maxLength={100} placeholder="Your full name" {...register('name')} aria-invalid={!!errors.name} />
              {fieldError('name')}
            </div>
            <div className="registration-field registration-field-wide">
              <label htmlFor="registration-email">College Email ID</label>
              <input id="registration-email" type="email" autoComplete="email" placeholder="you@college.edu" {...register('college_email_id')} aria-invalid={!!errors.college_email_id} />
              {fieldError('college_email_id')}
            </div>
            <div className="registration-field registration-field-wide">
              <label htmlFor="registration-password">Password</label>
              <div className="registration-password-wrap">
                <input id="registration-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Create a strong password" {...register('password')} aria-invalid={!!errors.password} />
                <button className="registration-password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldError('password')}
              <span className="registration-hint">8+ characters with uppercase, lowercase, number, and symbol</span>
            </div>
            <div className="registration-field">
              <label htmlFor="registration-year">Year of Admission</label>
              <select id="registration-year" {...register('year')} aria-invalid={!!errors.year}>
                <option value="">Select year</option>
                {YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
              {fieldError('year')}
            </div>
            <div className="registration-field">
              <label htmlFor="registration-branch">Branch</label>
              <select id="registration-branch" {...register('branch')} aria-invalid={!!errors.branch}>
                <option value="">Select branch</option>
                {BRANCHES.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
              </select>
              {fieldError('branch')}
            </div>
          </div>

          <fieldset className="registration-interests" aria-describedby={errors.interests ? 'registration-interests-error' : undefined}>
            <legend>What are you interested in?</legend>
            <div className="registration-interest-grid">
              {INTERESTS.map((interest) => (
                <label className="registration-interest" key={interest}>
                  <input type="checkbox" value={interest} {...register('interests')} />
                  <span>{interest}</span>
                </label>
              ))}
            </div>
            {errors.interests && <span id="registration-interests-error" className="registration-error" role="alert">{errors.interests.message}</span>}
          </fieldset>

          {errors.root?.server && <div className="registration-server-error" role="alert">{errors.root.server.message}</div>}
          <button className="registration-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <><LoaderCircle size={18} className="registration-spinner" /> Creating account…</> : 'Create account'}
          </button>
          <p className="registration-login-note">Already registered? Close this window to sign in.</p>
        </form>
      </section>
    </div>
  ), document.body);
}