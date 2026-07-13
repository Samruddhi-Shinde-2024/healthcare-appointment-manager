import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
} from 'react';
import { useEffect, useRef } from 'react';
import { Search, X, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';

import type { AppointmentStatus } from '../types';

// ─── Button ───────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  Readonly<{
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
  }>;

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white shadow-sm shadow-brand-950/10 hover:bg-brand-700 active:bg-brand-800 focus-visible:ring-brand-500/30',
  secondary:
    'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 active:bg-slate-100 focus-visible:ring-slate-300/30',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 focus-visible:ring-slate-300/30',
  danger:
    'bg-rose-600 text-white shadow-sm shadow-rose-950/10 hover:bg-rose-700 active:bg-rose-800 focus-visible:ring-rose-500/30',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-base',
};

export function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}: ButtonProps): React.JSX.Element {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
      disabled={disabled ?? loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

type InputProps = InputHTMLAttributes<HTMLInputElement> &
  Readonly<{
    label?: string;
    error?: string;
    hint?: string;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    wrapperClassName?: string;
  }>;

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  wrapperClassName = '',
  className = '',
  id,
  ...props
}: InputProps): React.JSX.Element {
  const inputId = id ?? (label !== undefined ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
      {label !== undefined && (
        <label className="text-sm font-medium text-slate-700" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon !== undefined && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {leftIcon}
          </span>
        )}
        <input
          className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 ${
            error !== undefined ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-400/10' : 'border-slate-200'
          } ${leftIcon !== undefined ? 'pl-10' : ''} ${rightIcon !== undefined ? 'pr-10' : ''} ${className}`}
          id={inputId}
          {...props}
        />
        {rightIcon !== undefined && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            {rightIcon}
          </span>
        )}
      </div>
      {error !== undefined && (
        <p className="flex items-center gap-1 text-xs text-rose-600">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
      {hint !== undefined && error === undefined && (
        <p className="text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> &
  Readonly<{
    label?: string;
    error?: string;
    hint?: string;
    wrapperClassName?: string;
  }>;

export function Textarea({
  label,
  error,
  hint,
  wrapperClassName = '',
  className = '',
  id,
  ...props
}: TextareaProps): React.JSX.Element {
  const textareaId =
    id ?? (label !== undefined ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
      {label !== undefined && (
        <label className="text-sm font-medium text-slate-700" htmlFor={textareaId}>
          {label}
        </label>
      )}
      <textarea
        className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 ${
          error !== undefined
            ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-400/10'
            : 'border-slate-200'
        } ${className}`}
        id={textareaId}
        rows={4}
        {...props}
      />
      {error !== undefined && (
        <p className="flex items-center gap-1 text-xs text-rose-600">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
      {hint !== undefined && error === undefined && (
        <p className="text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> &
  Readonly<{
    label?: string;
    error?: string;
    hint?: string;
    wrapperClassName?: string;
    options: ReadonlyArray<{ value: string; label: string }>;
    placeholder?: string;
  }>;

export function Select({
  label,
  error,
  hint,
  wrapperClassName = '',
  className = '',
  options,
  placeholder,
  id,
  ...props
}: SelectProps): React.JSX.Element {
  const selectId = id ?? (label !== undefined ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
      {label !== undefined && (
        <label className="text-sm font-medium text-slate-700" htmlFor={selectId}>
          {label}
        </label>
      )}
      <select
        className={`w-full appearance-none rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 ${
          error !== undefined
            ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-400/10'
            : 'border-slate-200'
        } ${className}`}
        id={selectId}
        {...props}
      >
        {placeholder !== undefined && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error !== undefined && (
        <p className="flex items-center gap-1 text-xs text-rose-600">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
      {hint !== undefined && error === undefined && (
        <p className="text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

// ─── SearchInput ──────────────────────────────────────────────────────────────

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> &
  Readonly<{
    value: string;
    onChange: (value: string) => void;
    wrapperClassName?: string;
  }>;

export function SearchInput({
  value,
  onChange,
  wrapperClassName = '',
  placeholder = 'Search…',
  ...props
}: SearchInputProps): React.JSX.Element {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
        placeholder={placeholder}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
      {value.length > 0 && (
        <button
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          type="button"
          onClick={() => onChange('')}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({
  children,
  className = '',
}: Readonly<{ children: ReactNode; className?: string }>): React.JSX.Element {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white shadow-card ${className}`}
    >
      {children}
    </section>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

type BadgeTone = 'slate' | 'teal' | 'amber' | 'rose' | 'emerald' | 'violet' | 'blue';

const BADGE_TONES: Record<BadgeTone, string> = {
  amber: 'bg-amber-50 text-amber-700 ring-amber-200/60',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200/60',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200/60',
  teal: 'bg-brand-50 text-brand-700 ring-brand-200/60',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200/60',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200/60',
};

export function Badge({
  children,
  tone = 'slate',
}: Readonly<{ children: ReactNode; tone?: BadgeTone }>): React.JSX.Element {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${BADGE_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

const STATUS_TONE: Record<AppointmentStatus, BadgeTone> = {
  CONFIRMED: 'teal',
  COMPLETED: 'emerald',
  CANCELLED: 'rose',
  HELD: 'amber',
  EXPIRED: 'slate',
  NO_SHOW: 'violet',
};

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  HELD: 'Held',
  EXPIRED: 'Expired',
  NO_SHOW: 'No Show',
};

export function StatusBadge({
  status,
}: Readonly<{ status: AppointmentStatus }>): React.JSX.Element {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

export function Skeleton({
  className = '',
}: Readonly<{ className?: string }>): React.JSX.Element {
  return (
    <div
      className={`shimmer rounded-xl bg-slate-100 ${className}`}
      role="status"
      aria-label="Loading…"
    />
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

type SpinnerSize = 'sm' | 'md' | 'lg';

const SPINNER_SIZES: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function Spinner({
  size = 'md',
  className = '',
}: Readonly<{ size?: SpinnerSize; className?: string }>): React.JSX.Element {
  return (
    <Loader2
      aria-label="Loading"
      className={`animate-spin text-brand-600 ${SPINNER_SIZES[size]} ${className}`}
      role="status"
    />
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

export function EmptyState({
  title,
  description,
  action,
  icon,
}: Readonly<{
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}>): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-8 py-16 text-center">
      {icon !== undefined && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          {icon}
        </div>
      )}
      <p className="text-base font-semibold text-slate-900">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-slate-500">{description}</p>
      {action !== undefined && <div className="mt-6">{action}</div>}
    </div>
  );
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

export function MetricCard({
  label,
  value,
  detail,
  icon,
  trend,
}: Readonly<{
  label: string;
  value: string | number;
  detail: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}>): React.JSX.Element {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {icon !== undefined && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            {icon}
          </div>
        )}
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1.5 text-sm text-slate-500">{detail}</p>
      {trend !== undefined && (
        <div
          className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${
            trend === 'up'
              ? 'text-emerald-600'
              : trend === 'down'
                ? 'text-rose-600'
                : 'text-slate-500'
          }`}
        >
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} vs last month
        </div>
      )}
    </Card>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

type ModalProps = Readonly<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}>;

const MODAL_SIZES: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps): React.JSX.Element | null {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className={`animate-slide-up relative w-full ${MODAL_SIZES[size]} rounded-2xl border border-slate-200 bg-white shadow-modal`}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {description !== undefined && (
              <p className="mt-0.5 text-sm text-slate-500">{description}</p>
            )}
          </div>
          <button
            aria-label="Close modal"
            className="ml-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            type="button"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">{children}</div>

        {/* Footer */}
        {footer !== undefined && (
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ConfirmDialog ───────────────────────────────────────────────────────────

type ConfirmDialogProps = Readonly<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  isLoading?: boolean;
}>;

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  isLoading = false,
}: ConfirmDialogProps): React.JSX.Element | null {
  return (
    <Modal
      footer={
        <>
          <Button disabled={isLoading} variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={isLoading} variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
      isOpen={isOpen}
      size="sm"
      title={title}
      onClose={onClose}
    >
      <p className="text-sm text-slate-600">{description}</p>
    </Modal>
  );
}

// ─── PageHeader ───────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  action,
}: Readonly<{
  title: string;
  subtitle?: string;
  action?: ReactNode;
}>): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle !== undefined && (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        )}
      </div>
      {action !== undefined && <div className="flex items-center gap-3">{action}</div>}
    </div>
  );
}

// ─── Table Primitives ─────────────────────────────────────────────────────────

export function Table({
  children,
  className = '',
}: Readonly<{ children: ReactNode; className?: string }>): React.JSX.Element {
  return (
    <div className={`overflow-x-auto rounded-xl border border-slate-200 ${className}`}>
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function TableHeader({
  children,
}: Readonly<{ children: ReactNode }>): React.JSX.Element {
  return (
    <thead className="border-b border-slate-200 bg-slate-50/80">
      <tr>{children}</tr>
    </thead>
  );
}

export function TableBody({
  children,
}: Readonly<{ children: ReactNode }>): React.JSX.Element {
  return <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>;
}

export function TableHead({
  children,
  className = '',
}: Readonly<{ children: ReactNode; className?: string }>): React.JSX.Element {
  return (
    <th
      className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 ${className}`}
    >
      {children}
    </th>
  );
}

export function TableRow({
  children,
  onClick,
  className = '',
}: Readonly<{
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}>): React.JSX.Element {
  return (
    <tr
      className={`transition ${onClick !== undefined ? 'cursor-pointer hover:bg-slate-50/80' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function TableCell({
  children,
  className = '',
}: Readonly<{ children: ReactNode; className?: string }>): React.JSX.Element {
  return (
    <td className={`px-4 py-3.5 text-slate-700 ${className}`}>{children}</td>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

type PaginationProps = Readonly<{
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}>;

export function Pagination({
  page,
  totalPages,
  onPage,
}: PaginationProps): React.JSX.Element | null {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
      <p className="text-sm text-slate-500">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={page <= 1}
          type="button"
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
          return (
            <button
              key={pageNum}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition ${
                pageNum === page
                  ? 'bg-brand-600 text-white'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              type="button"
              onClick={() => onPage(pageNum)}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={page >= totalPages}
          type="button"
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
