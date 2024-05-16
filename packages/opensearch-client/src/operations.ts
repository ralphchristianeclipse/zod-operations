import { initialize, ZodObjectFlattened } from "zod-operations";
import { getClient } from "./client";
import { merge } from "lodash";

export const createOperations = <T extends ZodObjectFlattened>(
  schema: T,
  instance = "mbdev"
) => {
  return initialize(schema, {
    query: async (params, context) => {
      const client = await getClient();
      const type: string =
        //@ts-expect-error
        schema?.shape?.type?.value ||
        //@ts-expect-error
        schema?.shape?.type?._def?.defaultValue?.() ||
        //@ts-expect-error
        schema?.innerType()?.shape?.type?.value ||
        //@ts-expect-error
        schema?.innerType()?.shape?.type?._def?.defaultValue?.();
      const index = `${instance}-gm-${type?.toLowerCase()}`;
      const getConditions = (value) => [
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
      const result = await client.search({
        index,
        body: merge(
          {
            track_total_hits: true,
            query: {
              bool: {
                filter: [...getConditions(params?.filter?.not)],
                should: [...getConditions(params?.filter?.not)],
                must_not: [...getConditions(params?.filter?.not)],
              },
            },
          },
          context?.esQueryBody
        ),
      });
      return {
        total: result?.body?.hits?.total?.value,
        records: result?.body?.hits?.hits?.map((item) => item?._source),
      };
    },
    mutation: () => {
      throw new Error("Function not implemented.");
    },
  });
};
