const REPORT_REASONS = [
  { value: 'unsafe', label: 'Conduite dangereuse' },
  { value: 'late', label: 'Retard important' },
  { value: 'not_as_described', label: 'Trajet non conforme à la description' },
  { value: 'harassment', label: 'Harcèlement ou comportement inapproprié' },
  { value: 'other', label: 'Autre motif' },
];

function reportReasonLabel(value) {
  const found = REPORT_REASONS.find((reason) => reason.value === value);
  return found ? found.label : 'Autre motif';
}

module.exports = { REPORT_REASONS, reportReasonLabel };
