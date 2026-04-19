// ============================================================================
// SIMPLE RUN SCREEN — Direct run tracking without AI
// ============================================================================

import { useRunStore } from '../../../src/stores/runStore';
import { RunTracker } from '../../../src/components/run/RunTracker';
import { RunSummary } from '../../../src/components/run/RunSummary';

export default function SimpleRunScreen() {
  const status = useRunStore(s => s.status);

  if (status === 'finished') {
    return <RunSummary />;
  }

  return <RunTracker mode="simple" />;
}
