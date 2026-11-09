import { invokeCloudFunction } from './apiClient.js'

/** Fetch public poll details from a future Firebase Cloud Function. */
export function fetchPublicPollInfo(pollId) {
  return invokeCloudFunction('getPublicPollInfo', { pollId })
}

/** Fetch server-provided results; only confirmed, recorded votes belong here. */
export function fetchPollResults(pollId) {
  return invokeCloudFunction('getPollResults', { pollId })
}
