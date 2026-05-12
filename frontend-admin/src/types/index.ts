export type AnyEntity = Record<string, any>;
export type PagedResponse = { items: AnyEntity[]; total: number; pages: number };
