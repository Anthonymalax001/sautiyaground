import { apiRequest } from './apiClient.js'

export async function fetchPublicPollInfo() {
  const { poll } = await apiRequest('/api/polls/active')
  return poll
}

export async function fetchPollResults(pollId) {
  return apiRequest(`/api/polls/${encodeURIComponent(pollId)}/results`)
}
