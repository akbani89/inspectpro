export const colors = {
  primary:   '#1a56db',
  primaryDk: '#1340b0',
  accent:    '#0ea5e9',
  success:   '#16a34a',
  warning:   '#d97706',
  danger:    '#dc2626',
  bg:        '#f8fafc',
  surface:   '#ffffff',
  border:    '#e2e8f0',
  text:      '#0f172a',
  textMid:   '#475569',
  textLight: '#94a3b8',
  badge: {
    draft:     { bg: '#f1f5f9', text: '#475569' },
    submitted: { bg: '#dbeafe', text: '#1e40af' },
    approved:  { bg: '#dcfce7', text: '#166534' },
    rejected:  { bg: '#fee2e2', text: '#991b1b' },
  }
};

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32
};

export const radius = {
  sm: 6, md: 10, lg: 16, full: 999
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  }
};

export const font = {
  regular: { fontFamily: 'System', fontWeight: '400' as const },
  medium:  { fontFamily: 'System', fontWeight: '500' as const },
  bold:    { fontFamily: 'System', fontWeight: '700' as const },
};
