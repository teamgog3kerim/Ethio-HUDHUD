export function gradeAnswers(answers: number[], keys: { correctIndex: number; explanation: string }[]) {
  if (!keys.length || answers.length !== keys.length) throw new Error("Incomplete exercise submission");
  const feedback = keys.map((k, i) => ({ ...k, correct: answers[i] === k.correctIndex }));
  const score = Math.round(100 * feedback.filter(f => f.correct).length / feedback.length);
  return { feedback, score, passed: score >= 75 };
}
export function nextReviewInterval(remembered: boolean, previous: number) {
  return remembered ? Math.min(90, Math.max(1, previous * 2)) : 0;
}
export function boundedActiveSeconds(reported: number, startedAt?: Date) {
  const elapsed = startedAt ? Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000)) : 0;
  return Math.max(0, Math.min(reported, elapsed, 3600));
}
