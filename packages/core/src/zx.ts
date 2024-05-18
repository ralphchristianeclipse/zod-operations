import { ZodEffects, ZodObject, ZodRawShape, z } from "zod";
import { Flattened, PathKeys } from "./types";
import { compact } from "lodash";

export const schema = <
  T extends z.ZodObject<any> = z.ZodObject<any>,
  I extends T["_input"] = T["_input"],
  K extends PathKeys<T["_input"]> = PathKeys<T["_input"]>
>(
  schema: T,
  options: {
    fields: K[];
  }
) => {
  const transformed = schema.transform<
    Flattened<I, K>
    //@ts-expect-error
  >((data) => {
    let output = {
      ...data,
    };
    options.fields.forEach((field) => {
      output = {
        ...output,
        ...output?.[field],
      };
      delete output[field];
    });
    return output;
  });

  return transformed;
};

export const defaultLiteral = (value: string) =>
  z.literal(value).default(value);

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
    parsed: () => parsed,
    records,
  };
}

export type ZodObjectModel<T extends ZodRawShape = ZodRawShape> =
  | ZodObject<T>
  | ZodEffects<ZodObject<T>>;

export const getSchemaShapeFieldValue = <
  T extends ZodObjectModel<any> = ZodObjectModel<any>
>(
  schema: T,
  field: keyof T["_input"]
) =>
  //@ts-expect-error
  schema?.shape?.[field]?.value ||
  //@ts-expect-error
  schema?.shape?.[field]?._def?.defaultValue?.() ||
  //@ts-expect-error
  schema?.innerType?.()?.shape?.[field]?.value ||
  //@ts-expect-error
  schema?.innerType?.()?.shape?.[field]?._def?.defaultValue?.();
