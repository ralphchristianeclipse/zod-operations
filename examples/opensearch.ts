import { z } from "zod";
import { zx } from "zod-operations";
import { create } from "zod-operations-opensearch-client";
const main = async () => {
  const GenericModelSchema = z.object({
    __typename: zx.defaultLiteral("GenericModel"),
    id: z.string(),
    code: z.string().nullish(),
    name: z.string().nullish(),
    type: z.string(),
    description: z.string().nullish(),
  });

  const schema = zx.model(
    GenericModelSchema.extend({
      type: zx.defaultLiteral("UsageReport"),
      attributes: z.object({
        module: z.string(),
        action: z.string(),
        userId: z.string(),
        meta: z.any(),
        description: z.string().nullish(),
      }),
    }),
    ["attributes"]
  );

  const client = create(schema);
  const res = await client.query({
    pagination: {
      limit: 10,
      from: 20,
    },
    filter: {},
  });
  const value = await client.save([
    {
      id: "new",
      action: "test",
      code: "test",
    },
    res?.records?.[0],
  ]);
  const output = await res.next();
};

main();
