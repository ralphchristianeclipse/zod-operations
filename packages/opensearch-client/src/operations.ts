import { create, zx } from "zod-operations";
import { getClient } from "./client";
import { merge } from "lodash";
import { z } from "zod";
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

export default create(
  {
    query: async (params, context) => {
      const client = await getClient();
      //@ts-ignore
      const index = context?.options(context)?.table?.index();
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
          //@ts-ignore
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
      switch (params.action) {
        case "create":
          break;
        case "update":
          break;
        case "remove":
          break;
      }
      return {
        total: 0,
        records: [],
      };
    },
  },
  (context) => {
    return {
      table: {
        type: "type",
        field: "__typename",
        instance: "mbdev",
        index: () => {
          const tableFieldType: string = zx.getSchemaShapeFieldValue(
            context?.schema!,
            context?.options(context)?.table?.type!
          );
          const tableField: string = zx.getSchemaShapeFieldValue(
            context?.schema!,
            context?.options(context)?.table?.field!
          );
          const index =
            tableField === "GenericModel"
              ? `${
                  context?.options(context)?.table?.instance
                }-gm-${tableFieldType?.toLowerCase()}`
              : `${
                  context?.options(context)?.table?.instance
                }-${tableFieldType.toLowerCase()}`;
          return index;
        },
      },
      esQueryBody: {
        track_total_hits: true,
      },
    };
  }
);
