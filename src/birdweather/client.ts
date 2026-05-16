import { GraphQLClient } from 'graphql-request';
import { env } from '../config/env.js';
export const gqlClient = new GraphQLClient(env.BIRDWEATHER_GRAPHQL_ENDPOINT, { timeout: 10000 });
