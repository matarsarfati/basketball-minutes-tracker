// src/utils/dateUtils.js

const getMonthDays = (year, month) => {
  // Create date for first of the month
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  
  // Get the day of week for 1st of month (0-6)
  const firstDayOfWeek = firstOfMonth.getUTCDay();
  
  // Calculate the date to start from (the Sunday before or on 1st)
  const startDate = new Date(firstOfMonth);
  startDate.setUTCDate(1 - firstDayOfWeek);
  
  // Generate 42 days (6 weeks) starting from the calculated Sunday
  const days = [];
  for (let i = 0; i < 42; i++) {
    const currentDate = new Date(startDate);
    currentDate.setUTCDate(startDate.getUTCDate() + i);
    
    days.push({
      date: currentDate.getUTCDate(),
      month: currentDate.getUTCMonth(),
      year: currentDate.getUTCFullYear(),
      isCurrentMonth: currentDate.getUTCMonth() === month,
      timestamp: currentDate.getTime()
    });
  }
  
  return days;
};

export { getMonthDays };