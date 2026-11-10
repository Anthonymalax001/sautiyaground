import { apiRequest } from './apiClient.js'

/** GET /api/polls/active returns { poll } from the backend. */
export async function fetchPublicPollInfo() {
  const { poll } = await apiRequest('/api/polls/active')
  return poll
}

/** GET /api/polls/:pollId/results returns backend-confirmed vote counts. */
export function fetchPollResults(pollId) {
  return apiRequest(`/api/polls/${encodeURIComponent(pollId)}/results`)
}
