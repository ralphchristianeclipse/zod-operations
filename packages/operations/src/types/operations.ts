import type { ZodEffects, ZodObject, ZodRawShape } from "zod";
import type {
  ArrayValues,
  DeepPartial,
  ExcludeByType,
  FlattenObject,
  IncludeByType,
} from "./utility";

export type ZodOperationsFilters<K, V> = {
  terms: ArrayValues<V>[];
  ranges: {
    field: K;
    gte: string | number;
    lte: string | number;
    gt: string | number;
    lt: string | number;
  }[];
  exists: K[];
  search: {
    value: string | number;
    fields: K[];
  }[];
};
export type ZodObjectModel<T extends ZodRawShape = ZodRawShape> =
  | ZodObject<T>
  | ZodEffects<ZodObject<T>>;

export type ZodOperationsClientQueryParameters<
  V extends object,
  K extends keyof V = keyof V
> = Partial<{
  ids: (string | number)[];
  filter: DeepPartial<{
    not: ZodOperationsFilters<K, V>;
    and: ZodOperationsFilters<K, V>;
    or: ZodOperationsFilters<K, V>;
  }>;
  pagination: Partial<{
    from: number;
    limit: number;
    cursor: string | number;
  }>;
  select: K[];
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

export type ZodOperationsContext<
  TSchema extends ZodObjectModel<any> = ZodObjectModel<any>,
  TContext extends any = any
> = { schema: TSchema; options?: TContext };

export type ZodOperationsQueryReturn<T> = Partial<{
  total: number;
  records: T[];
  cursor: string | number;
  page: number;
  aggregations: any;
}>;
export type ZodOperationsSchemaObjectKeys<
  TSchema extends ZodObjectModel<any> = ZodObjectModel<any>
> = Extract<keyof IncludeByType<TSchema["_input"], object>, string>;
export type ZodOperationsInputOutputFlattened<
  TSchema extends ZodObjectModel<any> = ZodObjectModel<any>,
  TInput extends TSchema["_input"] = TSchema["_input"],
  TOutput extends TSchema["_output"] = TSchema["_output"],
  TFlattened extends ExcludeByType<
    FlattenObject<TInput>,
    object
  > = ExcludeByType<FlattenObject<TInput>, object>
> = {
  input: TInput;
  output: TOutput;
  flattened: TFlattened;
  schema: TSchema;
};

export type ZodOperationsClient<
  TSchema extends ZodObjectModel<any> = ZodObjectModel<any>,
  TContext extends any = any,
  TOptions extends ZodOperationsInputOutputFlattened<TSchema> = ZodOperationsInputOutputFlattened<TSchema>,
  C extends ZodOperationsContext<TSchema, TContext> = ZodOperationsContext<
    TSchema,
    TContext
  >
> = {
  query: (
    params: ZodOperationsClientQueryParameters<TOptions["flattened"]>,
    context?: C
  ) => Promise<Partial<ZodOperationsQueryReturn<TOptions["output"]>>>;
  mutation: (
    params: Partial<{
      records: Partial<TOptions["input"]>[];
      action: "create" | "update" | "remove";
    }>,
    context?: C
  ) => Promise<
    Partial<{
      total?: number;
      records?: TOptions["output"][];
    }>
  >;
};
