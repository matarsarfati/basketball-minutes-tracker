export const debugStorage = () => {
  console.group('Storage Debug');
  console.log('All Keys:', Object.keys(localStorage));
  console.log('Exercises:', localStorage.getItem('basketball_exercises'));
  console.groupEnd();
};

export const clearStorage = () => {
  localStorage.clear();
  console.log('Storage cleared');
};
