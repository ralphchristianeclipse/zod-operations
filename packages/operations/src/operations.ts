import type {
  ClientOptions,
  DeepPartial,
  Paths,
  PromiseCallback,
  QueryOptions,
  StringNumber,
} from "./types";

import { groupBy, keyBy, mapValues, merge } from "lodash";

export function builder<
  TInput extends object = object,
  TOutput extends object = object,
  TContext extends object = object,
  TContextCallback extends PromiseCallback = PromiseCallback,
  TClient extends ClientOptions<TInput, TOutput, TContext> = ClientOptions<
    TInput,
    TOutput,
    TContext
  >
>(client: TClient, contextCallback: TContextCallback) {
  async function query(params: QueryOptions<Paths<TInput>>, context?: DeepPartial<TContext>) {
    const newContext = (await contextCallback(context)) as TContext;
    const result = await client.query(params, newContext);
    const validated = result?.records!?.map((record) => ({
      ...client.transformer.validate(record, newContext),
      input: record as TInput,
    }));
    const items = validated
      ?.filter((item) => item?.success)
      ?.map((item) => item?.data);
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
        Math.min(pageNumber + 1, pageCount) * (params?.pagination?.limit || 1),
      previous: Math.max(pageNumber - 1, 0) * (params?.pagination?.limit || 1),
    };
    return {
      data: {
        result,
        validated,
        items,
      },
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

  async function check(records: TInput[], context?: DeepPartial<TContext>) {
    const ids = records?.map(client.transformer.id);
    const found = await query(
      {
        ids,
      },
      context
    );
    const foundRecordsById = keyBy(found?.data?.items, "id");
    const { create, update } = mapValues(
      groupBy(records, (record) =>
        foundRecordsById?.[client.transformer.id(record)] ? "update" : "create"
      ),
      (values) =>
        values?.map((record) =>
          merge(foundRecordsById?.[client.transformer.id(record)] || {}, record)
        )
    );
    return {
      create,
      update,
    };
  }

  async function save(records: Partial<TInput>[], context?: DeepPartial<TContext>) {
    const newContext = (await contextCallback(context)) as TContext;
    //@ts-expect-error
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

  async function remove(ids: StringNumber[], context?: DeepPartial<TContext>) {
    const newContext = (await contextCallback(context)) as TContext;
    const result = ids?.length
      ? await client.mutation(
          {
            action: "remove",
            ids,
          },
          newContext
        )
      : undefined;
    return result;
  }

  return {
    query,
    save,
    remove,
  };
}
