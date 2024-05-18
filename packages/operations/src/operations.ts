import type { ClientOptions, Paths, PromiseCallback, QueryOptions, StringNumber } from "./types";

import { groupBy, keyBy, mapValues, merge } from "lodash";
export function builder<
  TInput extends object = object,
  TOutput extends object = object,
  TContextCallback extends PromiseCallback = PromiseCallback,
  TClient extends ClientOptions<TInput, TContextCallback> = ClientOptions<TInput, TContextCallback>
>(client: TClient) {
  async function query(params: QueryOptions<Paths<TInput>>, context?: any) {
    const newContext = await client.context(context);
    const result = await client.query(params, newContext);
    const output: TOutput[] = client.transformer.output(
      result?.records! as TInput[],
      newContext
    );
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
      result,
      output,
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
    const ids = records?.map(client.transformer.id);
    const found = await query(
      {
        ids,
      },
      context
    );
    const foundRecordsById = keyBy(found?.output, "id");
    const { create, update } = mapValues(
      groupBy(records, (record) =>
        foundRecordsById?.[client.transformer.id(record)]
          ? "update"
          : "create"
      ),
      (values) =>
        values?.map((record) =>
          merge(
            foundRecordsById?.[client.transformer.id(record)] || {},
            record
          )
        )
    );
    return {
      create,
      update,
    };
  }

  async function save(records: Partial<TInput>[], context?: any) {
    const newContext = await client.context(context);
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

  async function remove(ids: StringNumber[], context) {
    const newContext = await client.context(context);
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
