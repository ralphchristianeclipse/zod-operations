import type { ZodEffects, ZodObject, ZodRawShape } from "zod";
import type {
  ArrayValues,
  Resolver,
  DeepPartial,
  Paths,
  StringNumber,
  Unwrap,
} from "./utility";

export type ZodObjectModel<T extends ZodRawShape = ZodRawShape> =
  | ZodObject<T>
  | ZodEffects<ZodObject<T>>;

export type ContextCallback = (...args: any[]) => object | Promise<object>;
export type ContextType<T extends object | ContextCallback> =
  T extends ContextCallback ? Unwrap<T> : T;

export type Model<T extends ZodRawShape = ZodRawShape> =
  | ZodObject<T>
  | ZodEffects<ZodObject<T>>;

export type Filters<K, V> = {
  terms: ArrayValues<V>[];
  ranges: {
    field: K;
    gte: StringNumber;
    lte: StringNumber;
    gt: StringNumber;
    lt: StringNumber;
  }[];
  exists: K[];
  search: {
    value: StringNumber;
    fields: K[];
  }[];
};

export type QueryOptions<
  V extends object,
  K extends keyof V = keyof V
> = Partial<{
  ids: StringNumber[];
  filter: DeepPartial<{
    not: Filters<K, V>;
    and: Filters<K, V>;
    or: Filters<K, V>;
  }>;
  pagination: Partial<{
    from: number;
    limit: number;
    cursor: StringNumber;
  }>;
  fields: K[];
  sort: {
    field: K;
    order: "asc" | "desc";
  }[];
  aggregations: Partial<
    Record<
      string,
      {
        type: "sum" | "terms";
        field: K;
      }
    >
  >;
}>;

export type QueryReturn<T extends object> = {
  total: number;
  records: T[];
  cursor: StringNumber;
  page: number;
  aggregations: any;
};

export type Actions = "create" | "update" | "remove";

export type Client<
  TInput extends object,
  TOutput extends object,
  TContext extends object
> = {
  query: Resolver<
    QueryOptions<Paths<TInput>>,
    TContext,
    Partial<QueryReturn<TOutput>>
  >;
  mutation: Resolver<
    Partial<{
      records: Partial<TInput>[];
      ids: StringNumber[];
      action: Actions;
    }>,
    TContext,
    Partial<{
      total?: number;
      records?: TOutput[];
    }>
  >;
};
