import { builder, zx } from "../packages/operations";
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

const createContext = (context) => {
  const table = {
    type: "type",
    field: "__typename",
    instance: "mbdev",
  };
  const tableFieldType: string = zx.getSchemaShapeFieldValue(
    context?.schema!,
    table.type
  );
  const tableField: string = zx.getSchemaShapeFieldValue(
    context?.schema!,
    table.field
  );
  const index =
    tableField === "GenericModel"
      ? `${table.instance}-gm-${tableFieldType?.toLowerCase()}`
      : `${table.instance}-${tableFieldType.toLowerCase()}`;
  return {
    table: {
      ...table,
      index,
    },
    esQueryBody: {
      track_total_hits: true,
    },
  };
};
export default <T extends z.ZodObject<any>>(schema: T) => {
  return builder<T["_input"], T["_output"]>({
    query: async (params, context) => {
      const client = await getClient();
      const index = context?.table?.index;
      const transformedParams = {
        _source: params?.fields,
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
      };
      const payload = {
        index,
        body: merge(transformedParams, context?.query?.body),
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
    transformer: {
      output: (records) => {
        const results = records.map((record) => schema.parse(record));
        return results;
      },
      id: (record) => record?.id,
    },
    context: createContext,
  });
};
