export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  
  // Get today's date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get yesterday's date
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Check if the date is today
  if (date >= today) {
    return `Today, ${formatTime(date)}`;
  }
  
  // Check if the date is yesterday
  if (date >= yesterday && date < today) {
    return `Yesterday, ${formatTime(date)}`;
  }
  
  // Otherwise, return the full date
  return `${date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
  })}, ${formatTime(date)}`;
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};