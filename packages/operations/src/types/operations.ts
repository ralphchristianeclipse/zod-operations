//@ts-nocheck
import type { ZodEffects, ZodObject, ZodRawShape } from "zod";
import { conditionPrefixes } from "../constants";
import {
  ArrayValues,
  DeepPartial,
  ExcludeByType,
  FlattenObject,
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
export type ZodObjectFlattened<T extends ZodRawShape = ZodRawShape> =
  | ZodObject<T>
  | ZodEffects<ZodObject<T>>;
export type ZodOperationConditionPrefix = (typeof conditionPrefixes)[number];
type ZodOperationsClientQueryParameters<
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

export type ZodOperationsQueryReturn<T> = Partial<{
  total: number;
  records: T[];
  cursor: string | number;
  page: number;
  aggregations: any;
}>;
export type ZodOperationsClient<
  TSchema extends ZodObjectFlattened<any> = ZodObjectFlattened<any>,
  TContext extends any = any,
  TOutput extends TSchema["_output"] = TSchema["_output"],
  TFlattened extends ExcludeByType<
    FlattenObject<TOutput>,
    object
  > = ExcludeByType<FlattenObject<TOutput>, object>
> = {
  query: (
    params: ZodOperationsClientQueryParameters<TFlattened>,
    context?: TContext
  ) => Promise<Partial<ZodOperationsQueryReturn<TOutput>>>;

  mutation: (
    records: Partial<TOutput>[],
    context?: TContext
  ) => {
    total?: number;
    records?: TOutput[];
  };
};
