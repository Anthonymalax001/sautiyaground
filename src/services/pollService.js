import { requestBackend } from './apiClient.js'

/** Fetch public poll details from a future Firebase Cloud Function. */
export function fetchPublicPollInfo(pollId) {
  return requestBackend('getPublicPollInfo', { pollId })
}

/**
 * Fetch server-provided aggregate results; only confirmed, recorded votes belong here.
 * Expected response: { pollId, question, counts: { WANTAM, TUTAM },
 * totalConfirmedVotes, lastUpdatedAt }.
 */
export function fetchPollResults(pollId) {
  return requestBackend('getPollResults', { pollId })
}
