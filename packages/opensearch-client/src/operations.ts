import { create } from "zod-operations";
import { getClient } from "./client";
import { merge } from "lodash";

export const parseFilters = (value) => [
  ...(value?.terms?.flatMap(
    (term) =>
      Object.entries(term || {})?.map(([key, value]) => ({
        terms: {
          [`${key}.keyword`]: value,
        },
      })) || []
  ) || []),
  ...(value?.exists?.map((field) => ({
    exists: {
      field,
    },
  })) || []),
  ...(value?.ranges?.map((range) => ({
    range: {
      field: range?.field,
      gte: range?.gte,
      lte: range?.lte,
      gt: range?.gt,
      lt: range?.lt,
    },
  })) || []),
  ...(value?.search?.map((search) => ({
    query_string: {
      fields: search?.fields,
      query: `*${search?.value}*`,
    },
  })) || []),
];
export const createOperations = create({
  query: async (params, context) => {
    const client = await getClient();
    const type: string =
      //@ts-expect-error
      context?.schema?.shape?.type?.value ||
      //@ts-expect-error
      context?.schema?.shape?.type?._def?.defaultValue?.() ||
      //@ts-expect-error
      context?.schema?.innerType()?.shape?.type?.value ||
      //@ts-expect-error
      context?.schema?.innerType()?.shape?.type?._def?.defaultValue?.();
    const index = `mbdev-gm-${type?.toLowerCase()}`;
    const payload = {
      index,
      body: merge(
        {
          track_total_hits: true,
          _source: params?.select,
          query: params?.ids
            ? { ids: { values: params?.ids } }
            : {
                bool: {
                  filter: [...parseFilters(params?.filter?.and)],
                  should: [...parseFilters(params?.filter?.or)],
                  must_not: [...parseFilters(params?.filter?.not)],
                },
              },
          from: params?.pagination?.from,
          size: params?.pagination?.limit,
          sort: params?.sort?.map((sort) => ({
            [sort.field]: {
              order: sort.order,
            },
          })),
        },
        context?.options?.esQueryBody
      ),
    };
    const result = await client.search(payload);
    return {
      total: result?.body?.hits?.total?.value,
      records: result?.body?.hits?.hits?.map((item) => item?._source),
    };
  },
  mutation: async (params, context) => {
    console.log({ params });
    return {
      total: 0,
      records: [],
    };
  },
});
