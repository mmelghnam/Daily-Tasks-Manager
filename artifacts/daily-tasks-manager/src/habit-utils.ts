export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function normalizeHabitDate(value: string | Date | null | undefined) {
  if (!value) return '';
  if (value instanceof Date) return localDateKey(value);
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? '';
}

export function calculateCurrentHabitStreak(values: Array<string | Date>, today = localDateKey()) {
  const completed = new Set(values.map(normalizeHabitDate).filter(Boolean));
  if (!completed.size) return 0;

  const todayDate = new Date(`${today}T12:00:00`);
  const yesterday = new Date(todayDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = localDateKey(yesterday);

  let cursor: Date;
  if (completed.has(today)) cursor = todayDate;
  else if (completed.has(yesterdayKey)) cursor = yesterday;
  else return 0;

  let streak = 0;
  while (completed.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
