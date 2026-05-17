import { GraphQLClient } from 'graphql-request';
import { env } from '../config/env.js';

export function createGqlClient(token: string): GraphQLClient {
  return new GraphQLClient(env.BIRDWEATHER_GRAPHQL_ENDPOINT, {
    headers: { Authorization: token },
    signal: AbortSignal.timeout(10_000),
  });
}
