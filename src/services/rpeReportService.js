import { scheduleService } from './scheduleService';
import { practiceDataService } from './practiceDataService';

/**
 * Calculates average RPE from survey responses
 * @param {Object} surveyResponses Object with player responses
 * @returns {number|null} Average RPE rounded to 1 decimal or null if no responses
 */
const calculateAverageRPE = (surveyResponses) => {
  if (!surveyResponses || typeof surveyResponses !== 'object') {
    return null;
  }

  const rpeValues = Object.values(surveyResponses)
    .filter(response => response && typeof response.rpe === 'number')
    .map(response => response.rpe);

  if (rpeValues.length === 0) {
    return null;
  }

  const sum = rpeValues.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / rpeValues.length) * 10) / 10;
};

/**
 * Fetches planned RPE data for date range
 * @param {string} startDate ISO date string
 * @param {string} endDate ISO date string
 * @returns {Promise<Array>} Array of planned RPE data objects
 */
const getPlannedRPEData = async (startDate, endDate) => {
  try {
    const sessions = await scheduleService.getScheduleEvents();
    
    return sessions
      .filter(session => {
        return session.date >= startDate && session.date <= endDate;
      })
      .map(session => ({
        date: session.date,
        plannedCourtRPE: session.plannedCourtRPE || null,
        plannedGymRPE: session.plannedGymRPE || null,
        sessionId: session.id
      }));
  } catch (error) {
    console.error('Error fetching planned RPE data:', error);
    return [];
  }
};

/**
 * Fetches actual RPE data for date range
 * @param {string} startDate ISO date string
 * @param {string} endDate ISO date string
 * @returns {Promise<Array>} Array of actual RPE data objects
 */
const getActualRPEData = async (startDate, endDate) => {
  try {
    const sessions = await scheduleService.getScheduleEvents();
    const dateRangeSessions = sessions.filter(session =>
      session.date >= startDate && session.date <= endDate
    );

    const rpeData = await Promise.all(
      dateRangeSessions.map(async session => {
        try {
          // Safely fetch survey data with error handling
          let courtSurvey = null;
          let gymSurvey = null;

          try {
            courtSurvey = await practiceDataService.getSurveyData(session.id);
          } catch (courtError) {
            console.warn(`Failed to fetch court survey for session ${session.id}:`, courtError);
          }

          try {
            gymSurvey = await practiceDataService.getGymSurveyData(session.id);
          } catch (gymError) {
            console.warn(`Failed to fetch gym survey for session ${session.id}:`, gymError);
          }

          const actualCourtRPE = calculateAverageRPE(courtSurvey);
          const actualGymRPE = calculateAverageRPE(gymSurvey);

          const courtResponseCount = (courtSurvey && typeof courtSurvey === 'object') ? Object.keys(courtSurvey).length : 0;
          const gymResponseCount = (gymSurvey && typeof gymSurvey === 'object') ? Object.keys(gymSurvey).length : 0;

          return {
            date: session.date,
            actualCourtRPE,
            actualGymRPE,
            sessionId: session.id,
            courtResponseCount,
            gymResponseCount
          };
        } catch (error) {
          console.error(`Error processing RPE data for session ${session.id}:`, error);
          return {
            date: session.date,
            actualCourtRPE: null,
            actualGymRPE: null,
            sessionId: session.id,
            courtResponseCount: 0,
            gymResponseCount: 0
          };
        }
      })
    );

    return rpeData;
  } catch (error) {
    console.error('Error fetching actual RPE data:', error);
    return [];
  }
};

/**
 * Combines planned and actual RPE data for reporting
 * @param {string} startDate ISO date string
 * @param {string} endDate ISO date string
 * @returns {Promise<Array>} Combined RPE report data
 */
const getRPEReportData = async (startDate, endDate) => {
  try {
    const [plannedData, actualData] = await Promise.all([
      getPlannedRPEData(startDate, endDate),
      getActualRPEData(startDate, endDate)
    ]);

    // Create a map of actual data by date for easier lookup
    const actualDataMap = new Map(
      actualData.map(item => [item.date, item])
    );

    // Merge planned and actual data
    return plannedData.map(planned => {
      const actual = actualDataMap.get(planned.date) || {};
      
      return {
        date: planned.date,
        sessionId: planned.sessionId,
        plannedCourtRPE: planned.plannedCourtRPE,
        actualCourtRPE: actual.actualCourtRPE || null,
        plannedGymRPE: planned.plannedGymRPE,
        actualGymRPE: actual.actualGymRPE || null,
        courtResponseCount: actual.courtResponseCount || 0,
        gymResponseCount: actual.gymResponseCount || 0
      };
    });

  } catch (error) {
    console.error('Error generating RPE report:', error);
    return [];
  }
};

export const rpeReportService = {
  getPlannedRPEData,
  getActualRPEData,
  getRPEReportData,
  calculateAverageRPE
};
