import { z } from "zod";
import { zx } from "zod-operations/src";
import { createOperations } from "zod-operations-opensearch-client/src";
const main = async () => {
  const GenericModelSchema = z.object({
    __typename: zx.defaultLiteral("GenericModel"),
    id: z.string(),
    code: z.string().nullish(),
    name: z.string().nullish(),
    type: z.string(),
    description: z.string().nullish(),
  });

  const schema = zx.flatten(
    GenericModelSchema.extend({
      type: zx.defaultLiteral("MailingEvent"),
      attributes: z.object({
        mailingListIds: z.array(z.string()),
        emailTemplateId: z.string().nullish(),
      }),
    }),
    ["attributes"]
  );

  const client = createOperations(schema);
  const res = await client.query({
    filter: {
      or: {
        terms: [
          {
            __typename: ["1"],
          },
          {
            code: ["1"],
          },
        ],
        exists: ["__typename"],
        ranges: [
          {
            field: "__typename",
            gte: 1,
          },
        ],
        search: [
          {
            fields: ["__typename"],
            value: "",
          },
        ],
      },
    },
  });
  console.log([res]);
};

main();
