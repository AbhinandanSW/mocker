// JSON schemas passed to Ollama's `format` option so the model returns
// structured JSON we can parse safely. They mirror NextQuestion / InterviewReport in ./types.

/** The model only writes the question; the code decides everything else (see lib/interviewer.ts). */
export const nextQuestionSchema = {
  type: 'object',
  properties: {
    question: { type: 'string' },
    topic: { type: 'string' },
  },
  required: ['question', 'topic'],
};

export const reportSchema = {
  type: 'object',
  properties: {
    overallScore: { type: 'number' },
    recommendation: { type: 'string' },
    categories: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          score: { type: 'number' },
          weight: { type: 'number' },
          rationale: { type: 'string' },
        },
        required: ['name', 'score', 'weight', 'rationale'],
      },
    },
    strengths: { type: 'array', items: { type: 'string' } },
    improvements: { type: 'array', items: { type: 'string' } },
    questionFeedback: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          answer: { type: 'string' },
          score: { type: 'number' },
          feedback: { type: 'string' },
          idealAnswer: { type: 'string' },
        },
        required: ['question', 'answer', 'score', 'feedback', 'idealAnswer'],
      },
    },
    studyPlan: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
  required: [
    'overallScore',
    'recommendation',
    'categories',
    'strengths',
    'improvements',
    'questionFeedback',
    'studyPlan',
    'summary',
  ],
};
