import { Redirect } from 'wouter';

// /premium is kept for old inbound links; /choose-plan is the canonical subscription and billing screen.
export default function Premium() {
  return <Redirect to={`/choose-plan${window.location.search}`} replace />;
}
