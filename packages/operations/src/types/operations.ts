import type { ZodEffects, ZodObject, ZodRawShape } from "zod";
import type {
  ArrayValues,
  AsyncResolver,
  DeepPartial,
  ExcludeByType,
  FlattenObject,
  IncludeByType,
  Resolver,
  Unwrap,
} from "./utility";
export type StringNumber = string | number;

export type ZodOperationsFilters<K, V> = {
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
export type ZodObjectModel<T extends ZodRawShape = ZodRawShape> =
  | ZodObject<T>
  | ZodEffects<ZodObject<T>>;

export type ZodOperationsClientQueryParameters<
  V extends object,
  K extends keyof V = keyof V
> = Partial<{
  ids: StringNumber[];
  filter: DeepPartial<{
    not: ZodOperationsFilters<K, V>;
    and: ZodOperationsFilters<K, V>;
    or: ZodOperationsFilters<K, V>;
  }>;
  pagination: Partial<{
    from: number;
    limit: number;
    cursor: StringNumber;
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
export type ContextCallback = (...args: any[]) => object | Promise<object>;
export type ContextType<TNewContext extends object | ContextCallback> =
  TNewContext extends ContextCallback ? Unwrap<TNewContext> : TNewContext;

export type ZodOperationsContext<
  TSchema extends ZodObjectModel<any> = ZodObjectModel<any>,
  TContext extends any = any
> = { schema: TSchema; options?: TContext };

export type ZodOperationsQueryReturn<T> = Partial<{
  total: number;
  records: T[];
  cursor: StringNumber;
  page: number;
  aggregations: any;
}>;

export type ZodOperationsSchemaObjectKeys<
  TSchema extends ZodObjectModel<any> = ZodObjectModel<any>
> = Extract<keyof IncludeByType<TSchema["_input"], object>, string>;

export type ZodOperationsTypes<
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

export namespace ZodOperations {
  export type Model<T extends ZodRawShape = ZodRawShape> =
    | ZodObject<T>
    | ZodEffects<ZodObject<T>>;
  export type Client<
    TSchema extends Model<any> = Model<any>,
    TContext extends object | ContextCallback = object | ContextCallback,
    C extends ContextType<TContext> = ContextType<TContext>,
    Types extends ZodOperationsTypes<TSchema, TContext> = ZodOperationsTypes<
      TSchema,
      TContext
    >
  > = {
    query: AsyncResolver<
      ZodOperationsClientQueryParameters<Types["flattened"]>,
      C,
      Partial<ZodOperationsQueryReturn<Types["output"]>>
    >;
    mutation: AsyncResolver<
      Partial<{
        records: Partial<Types["input"]>[];
        ids?: StringNumber[];
        action: "create" | "update" | "remove";
      }>,
      C,
      Partial<{
        total?: number;
        records?: Types["output"][];
      }>
    >;
  };
}
