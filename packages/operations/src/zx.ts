//@ts-nocheck
import { compact } from "lodash";
import { z } from "zod";
import { FlattenObject, Flattened, IncludeByType } from "./utility";
export type ZodNested<T extends z.ZodTypeAny = z.ZodTypeAny> = T;
export const nested = <T extends z.ZodTypeAny>(
  zodType: T,
  field: string = "attributes"
): ZodNested<T> => {
  const key = `NESTED:${field}`;
  const result = zodType.describe(key);
  return result;
};
export const defaultLiteral = (value: string) =>
  z.literal(value).default(value);
export const flatten = <
  T extends z.ZodObject<any> = z.ZodObject<any>,
  I extends T["_input"] = T["_input"],
  K extends Extract<keyof IncludeByType<I, object>, string> = Extract<
    keyof IncludeByType<I, object>,
    string
  >
>(
  zodObject: T,
  fields: K[]
) => {
  const transformedSchema = zodObject.transform<
    Flattened<I, K>
    //@ts-expect-error
  >((data) => {
    let output = {
      ...data,
    };
    fields.forEach((field) => {
      output = {
        ...output,
        ...output?.[field],
      };
      delete output[field];
    });
    return output;
  });

  return transformedSchema;
};
export function zodParseValuesFlatten<
  T extends z.ZodObject<any> | z.ZodEffects<z.ZodObject<any>>,
  Y extends any[]
>(schema: T, values: Y) {
  const parsed = values?.map((record) => {
    return {
      ...schema.safeParse(record),
      input: record,
    };
  });
  const records = compact(parsed?.map((record) => record?.data));
  return {
    parsed,
    records,
  };
}
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
    //FIXME: help
    //@ts-ignore
    error: result?.error,
    //FIXME: help
    //@ts-ignore
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
    if (field.description?.startsWith("nested:")) {
      const [, nestedKey] = field.description?.split("nested:");
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
    if (field.description?.startsWith("nested:")) {
      const [, nestedKey] = field.description?.split("nested:");
      if (input[nestedKey]) input[nestedKey] = {};
      input[nestedKey][key] = input[key];
      delete input[key];
    }
  }
  return input;
}
