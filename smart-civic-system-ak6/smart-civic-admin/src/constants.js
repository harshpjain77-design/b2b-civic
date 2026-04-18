export const STATUS = {
  open: { label: 'Open', color: 'var(--blue)', bg: 'var(--blueBg)', bd: 'var(--blueBd)' },
  assigned: { label: 'Assigned', color: 'var(--accent)', bg: 'var(--accentBg)', bd: 'var(--accentBd)' },
  in_progress: { label: 'In Progress', color: 'var(--orange)', bg: 'var(--orangeBg)', bd: 'var(--orangeBd)' },
  resolved: { label: 'Resolved', color: 'var(--green)', bg: 'var(--greenBg)', bd: 'var(--greenBd)' },
  rejected: { label: 'Rejected', color: 'var(--red)', bg: 'var(--redBg)', bd: 'var(--redBd)' },
};

export const PRIORITY = {
  urgent: { label: 'Urgent', color: 'var(--red)', bg: 'var(--redBg)', bd: 'var(--redBd)' },
  high: { label: 'High', color: 'var(--orange)', bg: 'var(--orangeBg)', bd: 'var(--orangeBd)' },
  normal: { label: 'Normal', color: 'var(--green)', bg: 'var(--greenBg)', bd: 'var(--greenBd)' },
};

export const DEPTS = [
  'Road Department', 'Electric Department', 'Sanitation Department',
  'Water Supply', 'Traffic Control', 'Tree Authority', 'General Administration',
];

export const STEPS = [
  { key: 'Reported', label: 'Complaint Registered' },
  { key: 'Forwarded', label: 'Forwarded to Department' },
  { key: 'Assigned', label: 'Acknowledge & Assigned' },
  { key: 'In Progress', label: 'Work in Progress' },
  { key: 'Resolved', label: 'Complaint Resolved' },
  { key: 'Rejected', label: 'Request Rejected' },
];
export const ESCALATION_HOURS = 48; // Hours before a complaint is considered 'stale'

export const CAT_COLORS = [
  'var(--accent)', 'var(--blue)', 'var(--green)',
  'var(--purple)', 'var(--teal)', 'var(--yellow)',
  'var(--red)', 'var(--pink)',
];
