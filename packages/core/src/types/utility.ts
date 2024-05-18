// Flatten entity
export type PromiseResult<T> = Promise<T> | T;
export type PromiseCallback = (...args: any[]) => PromiseResult<object>;
export type PromiseType<T extends object | PromiseCallback> =
  T extends PromiseCallback ? Unwrap<T> : T;

export type StringNumber = string | number;
export type PathKeys<T extends object, O extends object = object> = Extract<
  keyof IncludeByType<T, O>,
  string
>;
export type Paths<T> = ExcludeByType<FlattenObject<T>, object>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type Flattened<I, K extends keyof I> = Omit<I, K> & I[K];
export type ExcludeByType<T, E> = {
  [K in keyof T as T[K] extends E ? never : K]: T[K];
};
export type IncludeByType<T, E> = {
  [K in keyof T as T[K] extends E ? K : never]: T[K];
};
export type PrefixKeys<T, Prefixes extends string> = {
  [K in keyof T as K | `${Prefixes}${Extract<K, string>}`]: T[K];
};
export type ArrayValues<T> = {
  [K in keyof T]: T[K][];
};
export type FlattenObject<TValue> = CollapseEntries<
  CreateObjectEntries<TValue, TValue>
>;
export type Unwrap<TType> = TType extends (...args: any[]) => infer R
  ? Awaited<R>
  : TType;

export type Resolver<TParams, TContext, TResult> = (
  params: TParams,
  context: TContext
) => Promise<TResult> | TResult;

type Entry = { key: string; value: unknown };
type EmptyEntry<TValue> = { key: ""; value: TValue };
type ExcludedTypes = Date | Set<unknown> | Map<unknown, unknown>;
type ArrayEncoder = `[${bigint}]`;

type EscapeArrayKey<TKey extends string> =
  TKey extends `${infer TKeyBefore}.${ArrayEncoder}${infer TKeyAfter}`
    ? EscapeArrayKey<`${TKeyBefore}${ArrayEncoder}${TKeyAfter}`>
    : TKey;

// Transforms entries to one flattened type
type CollapseEntries<TEntry extends Entry> = {
  [E in TEntry as EscapeArrayKey<E["key"]>]: E["value"];
};

// Transforms array type to object
type CreateArrayEntry<TValue, TValueInitial> = OmitItself<
  TValue extends unknown[] ? { [k: ArrayEncoder]: TValue[number] } : TValue,
  TValueInitial
>;

// Omit the type that references itself
type OmitItself<TValue, TValueInitial> = TValue extends TValueInitial
  ? EmptyEntry<TValue>
  : OmitExcludedTypes<TValue, TValueInitial>;

// Omit the type that is listed in ExcludedTypes union
type OmitExcludedTypes<TValue, TValueInitial> = TValue extends ExcludedTypes
  ? EmptyEntry<TValue>
  : CreateObjectEntries<TValue, TValueInitial>;

type CreateObjectEntries<TValue, TValueInitial> = TValue extends object
  ? {
      // Checks that Key is of type string
      [TKey in keyof TValue]-?: TKey extends string
        ? // Nested key can be an object, run recursively to the bottom
          CreateArrayEntry<
            TValue[TKey],
            TValueInitial
          > extends infer TNestedValue
          ? TNestedValue extends Entry
            ? TNestedValue["key"] extends ""
              ? {
                  key: TKey;
                  value: TNestedValue["value"];
                }
              :
                  | {
                      key: `${TKey}.${TNestedValue["key"]}`;
                      value: TNestedValue["value"];
                    }
                  | {
                      key: TKey;
                      value: TValue[TKey];
                    }
            : never
          : never
        : never;
    }[keyof TValue] // Builds entry for each key
  : EmptyEntry<TValue>;
