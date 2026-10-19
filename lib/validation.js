const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pickString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function safeRedirect(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '';
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// The publishing wizard stores dates as "12 December 2024"
function dateToDisplay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return '';
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

module.exports = {
  pickString,
  safeRedirect,
  escapeRegex,
  dateToDisplay,
};
