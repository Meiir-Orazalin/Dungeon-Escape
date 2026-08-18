export interface PresentationTokens {
  readonly panelStroke: number;
  readonly textStrokeThickness: number;
  readonly markerLineWidth: number;
  readonly healthBarOutline: number;
}

export function derivePresentationTokens(highContrast: boolean): PresentationTokens {
  return Object.freeze({
    panelStroke: highContrast ? 3 : 1,
    textStrokeThickness: highContrast ? 4 : 2,
    markerLineWidth: highContrast ? 3 : 1,
    healthBarOutline: highContrast ? 3 : 1,
  });
}
