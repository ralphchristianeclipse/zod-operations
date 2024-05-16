import type {
  StringNumber,
  ZodObjectModel,
  ZodOperations,
  ZodOperationsTypes,
} from "./types";
import * as zx from "./zx";
import { groupBy, keyBy, mapValues, merge } from "lodash";

export function create<
  TContext extends any = any,
  T extends ZodObjectModel<any> = ZodObjectModel<any>,
  TClient extends ZodOperations.Client<T> = ZodOperations.Client<T>
>(client: TClient, defaultContext?: TContext) {
  return (schema: T) => {
    type ZO = ZodOperationsTypes<T>;
    const getContext = (context) => ({
      schema,
      options: merge(defaultContext),
    });
    async function query(
      params: Parameters<TClient["query"]>[0],
      context?: Parameters<TClient["query"]>[1]
    ) {
      const result = await client.query(params, getContext(context));
      const output = zx.zodParseValuesFlatten(schema, result?.records!);
      const pageCount = Math.ceil(
        (result?.total || 0) / (params?.pagination?.limit || 1)
      );
      const pageNumber = Math.floor(
        (params?.pagination?.from || 1) / (params?.pagination?.limit || 1)
      );
      const pages = {
        count: pageCount,
        number: pageNumber,
        next:
          Math.min(pageNumber + 1, pageCount) *
          (params?.pagination?.limit || 1),
        previous:
          Math.max(pageNumber - 1, 0) * (params?.pagination?.limit || 1),
      };
      return {
        ...result,
        ...output,
        pages,
        next: () =>
          query(
            merge(params, {
              pagination: {
                from: pages.next,
              },
            }),
            context
          ),
        prev: () =>
          query(
            merge(params, {
              pagination: {
                from: pages.previous,
              },
            }),
            context
          ),
      };
    }

    async function check(records: ZO["input"][]) {
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
    async function save(
      records: ZO["input"][],
      context?: Parameters<TClient["mutation"]>[1]
    ) {
      const recordsByAction = await check(records);
      const resultCreated = recordsByAction?.create?.length
        ? await client.mutation(
            {
              action: "create",
              records: recordsByAction?.create,
            },
            getContext(context)
          )
        : undefined;
      const resultUpdated = recordsByAction?.update?.length
        ? await client.mutation(
            {
              action: "update",
              records: recordsByAction?.update,
            },
            getContext(context)
          )
        : undefined;
      return {
        result: {
          created: resultCreated,
          updated: resultUpdated,
        },
      };
    }

    async function remove(ids: StringNumber[], context) {
      const result = ids?.length
        ? await client.mutation(
            {
              action: "remove",
              ids,
            },
            getContext(context)
          )
        : undefined;
      return result;
    }

    return {
      query,
      save,
      remove,
    };
  };
}
