export interface BrunnstromSettings {
  stage: 3 | 4 | 5 | 6;
  antiCheat: boolean;
  thresholds: {
    elbowFlexion: number;
    elbowExtension: number;
    shoulderFlexion: number;
    gripDistance: number;
  };
}

export interface CalibrationData {
  maxElbowFlexion: number;
  maxElbowExtension: number;
  maxShoulderFlexion: number;
  maxGripDistance: number;
  recommendedStage: 3 | 4 | 5 | 6;
}
