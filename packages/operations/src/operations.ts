import { ZodObjectFlattened, ZodOperationsClient } from "./types/operations";
import * as zx from "./zx";
import { groupBy, keyBy, mapValues, merge } from "lodash";

export function create<
  TContext extends unknown,
  T extends ZodObjectFlattened<any> = ZodObjectFlattened<any>,
  TClient extends ZodOperationsClient<T> = ZodOperationsClient<T>
>(client: TClient, defaultContext?: TContext) {
  return (schema: T) => {
    const mergeOptions = (context) => merge(defaultContext, context);
    async function query(
      params: Parameters<TClient["query"]>[0],
      context?: Parameters<TClient["query"]>[1]
    ) {
      const result = await client.query(params, {
        schema,
        options: mergeOptions(context),
      });
      const output = zx.zodParseValuesFlatten(schema, result?.records!);
      return {
        ...result,
        ...output,
      };
    }

    async function check(records?: any[]) {
      const ids = records?.map((record) => record?.id);
      const found = await query({
        ids,
      });
      const foundRecordsById = keyBy(found?.records, "id");
      const { create, update } = mapValues(
        groupBy(records, (record) =>
          foundRecordsById?.[record?.id] ? "update" : "create"
        ),
        (values) =>
          values?.map((record) =>
            merge(foundRecordsById?.[record?.id] || {}, record)
          )
      );
      return {
        create,
        update,
      };
    }
    async function mutation(
      params: Parameters<TClient["mutation"]>[0],
      context?: Parameters<TClient["mutation"]>[1]
    ) {
      const recordsByAction = await check(params?.records);
      const result = await client.mutation(params, {
        schema,
        options: mergeOptions(context),
      });
      const output = zx.zodParseValuesFlatten(schema, result?.records!);
      return {
        items: {
          update: recordsByAction?.update,
          create: recordsByAction?.create,
        },
        ...result,
        ...output,
      };
    }
    return {
      query,
      mutation,
    };
  };
}
