import { builder, zx } from "@zod-operations/core";
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

export default <T extends z.ZodObject<any>>(schema: T, instance: string) => {
  const transformedSchema = zx.schema(schema, {
    //@ts-expect-error
    fields: ["attributes"],
  });
  const createContext = async () => {
    const table = {
      type: "type",
      field: "__typename",
      instance,
    };
    const tableFieldType: string = zx.getSchemaShapeFieldValue(
      schema!,
      table.type
    );
    const tableField: string = zx.getSchemaShapeFieldValue(
      schema!,
      table.field
    );
    const index =
      tableField === "GenericModel"
        ? `${table.instance}-gm-${tableFieldType?.toLowerCase()}`
        : `${table.instance}-${tableField?.toLowerCase()}`;
    const client = await getClient();
    return {
      table: {
        ...table,
        index,
      },
      query: {
        body: { track_total_hits: true },
      },
      client: client as Readonly<typeof client>,
    };
  };
  return builder<
    T["_input"],
    (typeof transformedSchema)["_output"],
    Awaited<ReturnType<typeof createContext>>
  >(
    {
      query: async (params, context) => {
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
        const result = await context.client.search(payload);
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
        //@ts-expect-error
        validate: (record) => {
          const result = transformedSchema.safeParse(record);
          return {
            error: result.error,
            success: result.success,
            data: result?.data,
          };
        },
        id: (record) => record?.id,
      },
    },
    createContext
  );
};
