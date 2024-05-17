import type {
  Client,
  ContextCallback,
  ContextType,
  StringNumber,
  ZodObjectModel,
} from "./types";
import * as zx from "./zx";
import { groupBy, keyBy, mapValues, merge } from "lodash";

export function builder<
  TContext extends ContextCallback = ContextCallback,
  TSchema extends ZodObjectModel<any> = ZodObjectModel<any>,
  TInput extends TSchema["_input"] = TSchema["_input"],
  TOutput extends TSchema["_output"] = TSchema["_output"],
  TContextType extends ContextType<TContext> = ContextType<TContext>,
  TClient extends Client<
    TInput,
    TOutput,
    TContextType & { schema: TSchema }
  > = Client<TInput, TOutput, TContextType & { schema: TSchema }>
>(client: TClient, contextCallback?: TContext) {
  const getContext = async (
    schema: TSchema,
    context?: Omit<TContextType, "schema">
  ): Promise<TContextType & { schema: TSchema }> => {
    const baseContext = contextCallback
      ? await contextCallback(merge({ schema }, context))
      : {};
    return {
      schema,
      ...baseContext,
    } as TContextType & { schema: TSchema };
  };
  return {
    create(schema: TSchema) {
      async function query(
        params: Parameters<TClient["query"]>[0],
        context?: any
      ) {
        const newContext = await getContext(schema, context);
        const result = await client.query(params, newContext);
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

      async function check(records: TInput[], context?: any) {
        const ids = records?.map((record) => record?.id);
        const found = await query(
          {
            ids,
          },
          context
        );
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

      async function save(records: TInput[], context?: any) {
        const newContext = await getContext(schema, context);
        const recordsByAction = await check(records, newContext);
        const resultCreated = recordsByAction?.create?.length
          ? await client.mutation(
              {
                action: "create",
                records: recordsByAction?.create,
              },
              newContext
            )
          : undefined;
        const resultUpdated = recordsByAction?.update?.length
          ? await client.mutation(
              {
                action: "update",
                records: recordsByAction?.update,
              },
              newContext
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
              await getContext(context)
            )
          : undefined;
        return result;
      }

      return {
        query,
        save,
        remove,
      };
    },
  };
}
