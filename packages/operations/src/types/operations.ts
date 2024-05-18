import type {
  ArrayValues,
  DeepPartial,
  Paths,
  StringNumber,
  PromiseResult,
  PromiseType,
  PromiseCallback,
} from "./utility";

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

export type QueryReturn<T extends object[]> = {
  total: number;
  records: T;
  cursor: StringNumber;
  page: number;
  aggregations: any;
};

export type Actions = "create" | "update" | "remove";
export type Transformer<TInput, TContext> = {
  input?: <T extends object[]>(records: TInput[], context: TContext) => T;
  output: <T extends object[]>(records: TInput[], context: TContext) => T;
  id: (record: TInput) => StringNumber;
};
export type ClientOptions<
  TInput extends object,
  TContextCallback extends PromiseCallback = PromiseCallback,
  TContext extends PromiseType<TContextCallback> = PromiseType<TContextCallback>,
  TTransformer extends Transformer<TInput, TContext> = Transformer<
    TInput,
    TContext
  >
> = {
  query: (
    params: QueryOptions<Paths<TInput>>,
    context: TContext
  ) => PromiseResult<Partial<QueryReturn<ReturnType<TTransformer["output"]>>>>;
  mutation: (
    params: Partial<{
      records: Partial<TInput>[];
      ids: StringNumber[];
      action: Actions;
    }>,
    context: TContext
  ) => PromiseResult<
    Partial<{
      total?: number;
      records?: ReturnType<TTransformer["output"]>;
    }>
  >;
  transformer: TTransformer;
  context: TContextCallback;
};
