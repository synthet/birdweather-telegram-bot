export interface Connection<T> {
  nodes?: T[];
  edges?: Array<{ node: T }>;
}

export function connectionNodes<T>(connection: Connection<T> | T[] | null | undefined): T[] {
  if (!connection) return [];
  if (Array.isArray(connection)) return connection;
  if (connection.nodes?.length) return connection.nodes;
  return connection.edges?.map((e) => e.node) ?? [];
}
