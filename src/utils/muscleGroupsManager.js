const STORAGE_KEY = 'muscle_groups';

export const defaultGroups = [
  "Plyometric",
  "Functional Power",
  "Legs",
  "Pull", 
  "Push",
  "Arms",
  "Calf",
  "Core",
  "Glutes",
  "Shoulders"
];

// Initialize localStorage with default groups if empty
const initializeStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultGroups));
      console.log('✅ Initialized muscle groups with defaults');
    }
  } catch (error) {
    console.error('Failed to initialize muscle groups:', error);
  }
};

// Initialize on import
initializeStorage();

export const getMuscleGroups = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultGroups;
  } catch (error) {
    console.error('Failed to load muscle groups:', error);
    return defaultGroups;
  }
};

export const addMuscleGroup = (name) => {
  try {
    const groups = getMuscleGroups();
    if (groups.includes(name)) {
      console.log('⚠️ Group already exists:', name);
      return groups;
    }

    const updated = [...groups, name];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    console.log('✅ Added new muscle group:', name);
    return updated;
  } catch (error) {
    console.error('Failed to add muscle group:', error);
    return getMuscleGroups();
  }
};

export const removeMuscleGroup = (name) => {
  try {
    const groups = getMuscleGroups();
    const updated = groups.filter(group => group !== name);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    console.log('✅ Removed muscle group:', name);
    return updated;
  } catch (error) {
    console.error('Failed to remove muscle group:', error);
    return getMuscleGroups();
  }
};

export const resetToDefault = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultGroups));
    console.log('✅ Reset to default muscle groups');
    return defaultGroups;
  } catch (error) {
    console.error('Failed to reset muscle groups:', error);
    return getMuscleGroups();
  }
};
