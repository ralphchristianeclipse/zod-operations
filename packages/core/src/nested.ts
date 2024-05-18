import { compact } from "lodash";
import { z } from "zod";

const NESTED_FIELD = "NESTED:";
export type ZodNested<T extends z.ZodTypeAny = z.ZodTypeAny> = T;
export const nested = <T extends z.ZodTypeAny>(
  zodType: T,
  field: string = "attributes"
): ZodNested<T> => {
  const key = `${NESTED_FIELD}${field}`;
  const result = zodType.describe(key);
  return result;
};

export function zodSafeParseRecords<
  T extends z.ZodObject<any>,
  Y extends object
>(schema: T, records?: Y[]) {
  const parsed = records?.map((record) => zodSafeParse(schema, record));
  return {
    records: compact(parsed?.map((record) => record?.item)),
    parsed,
  };
}
/**
 * Converts appsync record to zod object safe
 */
export function zodSafeParse<T extends z.ZodObject<any>>(
  zodSchema: T,
  object: object
) {
  const input: any = zodUnpack<T>(zodSchema, object);

  const result = zodSchema.safeParse(input);

  return {
    error: result?.error,
    data: result?.data as z.infer<T>,
    item: input as z.infer<T>,
  };
}

export function zodUnpack<T extends z.ZodObject<any>>(
  zodSchema: T,
  object: object
) {
  const input = structuredClone(object);
  const parsed = {};
  for (const key in zodSchema.shape) {
    const field: z.ZodType = zodSchema.shape[key];
    if (field.description?.startsWith(NESTED_FIELD)) {
      const [, nestedKey] = field.description?.split(NESTED_FIELD);
      if (!parsed[nestedKey])
        parsed[nestedKey] =
          typeof input[nestedKey] === "string"
            ? JSON.parse(input[nestedKey])
            : input[nestedKey];
      input[key] = parsed[key];
    }
  }
  const keys = Object.keys(parsed);
  for (let key of keys) {
    delete input[key];
  }
  return input;
}

export function zodPack<T extends z.ZodObject<any>>(
  zodSchema: T,
  object: object
) {
  const input = structuredClone(object);
  for (const key in zodSchema.shape) {
    const field: z.ZodType = zodSchema.shape[key];
    if (field.description?.startsWith(NESTED_FIELD)) {
      const [, nestedKey] = field.description?.split(NESTED_FIELD);
      if (input[nestedKey]) input[nestedKey] = {};
      input[nestedKey][key] = input[key];
      delete input[key];
    }
  }
  return input;
}
