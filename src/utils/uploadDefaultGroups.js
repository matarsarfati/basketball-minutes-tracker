/* eslint-disable no-unused-vars */
/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-undef */
import { doc, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";

const defaultGroups = [
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

export const uploadDefaultMuscleGroups = async () => {
  try {
    await setDoc(doc(db, "app_data", "muscle_groups"), {
      groups: defaultGroups,
      updated_at: new Date().toISOString()
    });
    
    console.log("✅ Default muscle groups uploaded successfully!");
    return defaultGroups;
  } catch (error) {
    console.error("Failed to upload muscle groups:", error);
    throw error;
  }
};

// Run once to initialize
if (process.env.NODE_ENV === 'development') {
  uploadDefaultMuscleGroups();
}
