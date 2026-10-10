export interface LMSParameters {
  ageMonths: number;
  L: number;
  M: number;
  S: number;
}

export interface GrowthEvaluation {
  ageMonths: number;
  bmi: number;
  bmiForAgePercentile: number;
  bmiForAgeZScore: number;
  headCircumferencePercentile?: number;
  headCircumferenceZScore?: number;
  heightForAgePercentile: number;
  heightForAgeZScore: number;
  weightForAgePercentile: number;
  weightForAgeZScore: number;
}

export type WHOGrowthMetricType =
  | "weight"
  | "height"
  | "head_circumference"
  | "bmi";

export interface AgePercentiles {
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
}

export function zScoreToPercentile(z: number): number {
  if (Number.isNaN(z)) return 50;

  const b1 = 0.319_381_53;
  const b2 = -0.356_563_782;
  const b3 = 1.781_477_937;
  const b4 = -1.821_255_978;
  const b5 = 1.330_274_429;
  const p = 0.231_641_9;
  const c = 0.398_942_28;

  if (z >= 0) {
    const t = 1.0 / (1.0 + p * z);
    const val =
      1.0 -
      c *
        Math.exp((-z * z) / 2.0) *
        t *
        (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
    return Math.min(99.9, Math.max(0.1, Math.round(val * 1000) / 10));
  }
  const t = 1.0 / (1.0 - p * z);
  const val =
    c *
    Math.exp((-z * z) / 2.0) *
    t *
    (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
  return Math.min(99.9, Math.max(0.1, Math.round(val * 1000) / 10));
}

export function calculateZScore(
  measurement: number,
  lms: LMSParameters
): number {
  if (measurement <= 0 || lms.M <= 0) return 0;

  let z: number;
  if (Math.abs(lms.L) < 0.01) {
    z = Math.log(measurement / lms.M) / lms.S;
  } else {
    z = ((measurement / lms.M) ** lms.L - 1) / (lms.L * lms.S);
  }
  return Math.round(z * 100) / 100;
}

function calcLmsValue(lms: LMSParameters, z: number, linear: boolean): number {
  if (linear) {
    return lms.M * (1 + lms.S * z);
  }

  if (Math.abs(lms.L) < 0.01) return lms.M * Math.exp(lms.S * z);
  const inner = 1 + lms.L * lms.S * z;
  return inner > 0 ? lms.M * inner ** (1 / lms.L) : lms.M;
}

export function getPercentilesFromLMS(
  lms: LMSParameters,
  metricType: WHOGrowthMetricType
): AgePercentiles {
  const linear = metricType === "height" || metricType === "head_circumference";
  const calcValue = (z: number) => calcLmsValue(lms, z, linear);

  return {
    p3: Math.round(calcValue(-1.88) * 10) / 10,
    p15: Math.round(calcValue(-1.036) * 10) / 10,
    p50: Math.round(lms.M * 10) / 10,
    p85: Math.round(calcValue(1.036) * 10) / 10,
    p97: Math.round(calcValue(1.88) * 10) / 10,
  };
}

export function evaluateGrowthMetrics(
  lmsWeight: LMSParameters | null,
  lmsHeight: LMSParameters | null,
  lmsBmi: LMSParameters | null,
  lmsHeadCircumference: LMSParameters | null,
  ageMonths: number,
  weightKg: number,
  heightCm: number,
  headCircumferenceCm?: number
): GrowthEvaluation {
  const safeWeight = Math.max(0.5, weightKg);
  const safeHeight = Math.max(20, heightCm);
  const heightMeters = safeHeight / 100;
  const bmi =
    Math.round((safeWeight / (heightMeters * heightMeters)) * 10) / 10;

  let weightZ = 0;
  let weightPercentile = 50;
  let heightZ = 0;
  let heightPercentile = 50;
  let bmiZ = 0;
  let bmiPercentile = 50;
  let headZ: number | undefined;
  let headPercentile: number | undefined;

  if (lmsWeight) {
    weightZ = calculateZScore(safeWeight, lmsWeight);
    weightPercentile = zScoreToPercentile(weightZ);
  }

  if (lmsHeight) {
    heightZ = calculateZScore(safeHeight, lmsHeight);
    heightPercentile = zScoreToPercentile(heightZ);
  }

  if (lmsBmi) {
    bmiZ = calculateZScore(bmi, lmsBmi);
    bmiPercentile = zScoreToPercentile(bmiZ);
  }

  if (headCircumferenceCm && headCircumferenceCm > 25 && lmsHeadCircumference) {
    headZ = calculateZScore(headCircumferenceCm, lmsHeadCircumference);
    headPercentile = zScoreToPercentile(headZ);
  }

  return {
    bmi,
    ageMonths,
    weightForAgeZScore: weightZ,
    weightForAgePercentile: weightPercentile,
    heightForAgeZScore: heightZ,
    heightForAgePercentile: heightPercentile,
    bmiForAgeZScore: bmiZ,
    bmiForAgePercentile: bmiPercentile,
    ...(headZ !== undefined && { headCircumferenceZScore: headZ }),
    ...(headPercentile !== undefined && {
      headCircumferencePercentile: headPercentile,
    }),
  };
}
