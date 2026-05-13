export function buildGmailUrl(to: string, subject: string, body: string): string {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to,
    su: subject,
    body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

export function buildGoogleCalendarUrl(
  title: string,
  startDate: Date,
  endDate: Date,
  details: string,
  location = ''
): string {
  const format = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dates = `${format(startDate)}/${format(endDate)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates,
    details,
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}