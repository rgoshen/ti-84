import * as React from 'react'; // [G1] required for the React.JSX.Element return type
import { useState } from 'react';

/** Slider defaults, also the reset target. */
const DEFAULTS = { theta: 30, r: 1, beta: 0 };

export default function AngleExplorer(): React.JSX.Element {
  const [theta] = useState(DEFAULTS.theta);
  return (
    <div data-testid="angle-explorer" className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <p className="text-sm text-muted-foreground">Angle: {theta}°</p>
    </div>
  );
}
