const fs = require('fs');
let code = fs.readFileSync('src/services/practiceDataService.js', 'utf8');

const anchor = 'updateGymSurveyResponse = async (sessionId, playerName, surveyData) => {';

const newMethod = `  // Update wellness survey response for a player
  updateWellnessSurveyResponse = async (sessionId, playerName, surveyData) => {
    if (!sessionId || !playerName) {
      throw new Error('Session ID and player name are required');
    }

    try {
      const docRef = doc(db, 'practiceSessions', sessionId);
      
      const sessionDoc = await getDoc(docRef);
      // Ensure we have a base document structure
      const currentData = sessionDoc.exists() ? sessionDoc.data() : { attendance: {}, metrics: {}, surveyData: {}, gymSurveyData: {}, wellnessData: {} };
      
      const newWellnessData = {
        ...(currentData.wellnessData || {}),
        [playerName]: surveyData
      };

      await setDoc(docRef, {
        wellnessData: newWellnessData,
        lastUpdated: serverTimestamp()
      }, { merge: true });

      return true;
    } catch (error) {
      console.error('Error updating wellness survey response:', error);
      throw error;
    }
  };

  `;

code = code.replace(anchor, newMethod + anchor);

fs.writeFileSync('src/services/practiceDataService.js', code);
console.log("Success");
