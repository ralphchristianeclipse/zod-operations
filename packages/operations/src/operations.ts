import { z, ZodEffects, ZodObject } from "zod";
import { ZodOperationsClient } from "./types";
import * as zx from "./zx";

export function initialize<
  TContext extends any = any,
  T extends ZodObject<any> | ZodEffects<ZodObject<any>> =
    | ZodObject<any>
    | ZodEffects<ZodObject<any>>,
  TClient extends ZodOperationsClient<T, TContext> = ZodOperationsClient<
    T,
    TContext
  >
>(schema: T, client: TClient) {
  async function query(
    params: Parameters<TClient["query"]>[0],
    context?: Parameters<TClient["query"]>[1]
  ) {
    const result = await client.query(params, context);
    const output = zx.zodParseValuesFlatten(schema, result?.records!);
    return {
      ...result,
      ...output,
    };
  }

  async function mutation(
    params: Parameters<TClient["mutation"]>[0],
    context?: Parameters<TClient["mutation"]>[1]
  ) {
    const result = await client.mutation(params, context);
    const output = zx.zodParseValuesFlatten(schema, result?.records!);
    return {
      ...result,
      ...output,
    };
  }
  return {
    query,
    mutation,
  };
}
