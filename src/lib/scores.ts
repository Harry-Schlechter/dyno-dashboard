interface ScoreInputs {
  sleep?: { hours: number; quality: number };
  nutrition?: { calories: number; protein: number };
  exerciseDone: boolean;
  mood?: number;
  hydration?: number; // oz
  journalDone: boolean;
}

interface ScoreBreakdown {
  sleep: number;
  nutrition: number;
  exercise: number;
  mood: number;
  hydration: number;
  journal: number;
  total: number;
}

const CALORIE_TARGET = 2250;
const PROTEIN_TARGET = 170;
const HYDRATION_TARGET = 100; // oz

export const calculateLifeScore = (inputs: ScoreInputs): ScoreBreakdown => {
  // Sleep (0-20): quality 1-5 mapped, plus hours factor
  let sleepScore = 0;
  if (inputs.sleep) {
    const qualityScore = (inputs.sleep.quality / 5) * 14;
    const hoursScore = inputs.sleep.hours >= 7 && inputs.sleep.hours <= 9 ? 6 : Math.max(0, 6 - Math.abs(inputs.sleep.hours - 8) * 2);
    sleepScore = Math.min(20, qualityScore + hoursScore);
  }

  // Nutrition (0-20): how close to targets
  let nutritionScore = 0;
  if (inputs.nutrition) {
    const calAdherence = 1 - Math.min(1, Math.abs(inputs.nutrition.calories - CALORIE_TARGET) / CALORIE_TARGET);
    const proteinAdherence = Math.min(1, inputs.nutrition.protein / PROTEIN_TARGET);
    nutritionScore = Math.min(20, (calAdherence * 10) + (proteinAdherence * 10));
  }

  // Exercise (0-20)
  const exerciseScore = inputs.exerciseDone ? 20 : 0;

  // Mood (0-15): 1-5 scale
  const moodScore = inputs.mood ? Math.min(15, (inputs.mood / 5) * 15) : 0;

  // Hydration (0-15)
  const hydrationScore = inputs.hydration ? Math.min(15, (inputs.hydration / HYDRATION_TARGET) * 15) : 0;

  // Journal (0-10)
  const journalScore = inputs.journalDone ? 10 : 0;

  const total = Math.round(sleepScore + nutritionScore + exerciseScore + moodScore + hydrationScore + journalScore);

  return {
    sleep: Math.round(sleepScore),
    nutrition: Math.round(nutritionScore),
    exercise: Math.round(exerciseScore),
    mood: Math.round(moodScore),
    hydration: Math.round(hydrationScore),
    journal: Math.round(journalScore),
    total: Math.min(100, total),
  };
};

export const getScoreColor = (score: number): string => {
  if (score >= 80) return '#4CAF50';
  if (score >= 60) return '#5B8DEF';
  if (score >= 40) return '#FF9800';
  return '#F44336';
};

export const getScoreLabel = (score: number): string => {
  if (score >= 80) return 'Crushing it';
  if (score >= 60) return 'Solid day';
  if (score >= 40) return 'Room to grow';
  return 'Rough day';
};
