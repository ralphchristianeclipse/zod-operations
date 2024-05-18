import { z } from "zod";
import { zx } from "../packages/operations";
import { Client } from "@opensearch-project/opensearch";
import builder from "./operations";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import createAwsOpensearchConnector from "aws-opensearch-connector";
const { AWS_REGION = "ap-southeast-2", OPENSEARCH_HOST = "" } = process.env;

let client: Client;
export const getClient = async (
  region = AWS_REGION,
  node = OPENSEARCH_HOST
) => {
  if (client) return client;
  const awsCredentials = await defaultProvider()();
  const connector = createAwsOpensearchConnector({
    credentials: awsCredentials,
    region,
    getCredentials: function (cb) {
      return cb();
    },
  });
  client = new Client({
    ...connector,
    node,
  });
  return client;
};

const main = async () => {
  const GenericModelSchema = z.object({
    __typename: zx.defaultLiteral("GenericModel"),
    id: z.string(),
    code: z.string().nullish(),
    name: z.string().nullish(),
    type: z.string(),
    description: z.string().nullish(),
  });

  const schema = GenericModelSchema.extend({
    type: zx.defaultLiteral("UsageReport"),
    attributes: z.object({
      module: z.string(),
      action: z.string(),
      userId: z.string(),
      meta: z.any(),
      description: z.string().nullish(),
    }),
  });

  const client = builder(schema);
  const res = await client.query({
    pagination: {
      limit: 10,
      from: 20,
    },
  });
  const value = await client.save([
    {
      id: "new",
      code: "test",
    },
    res?.data?.items?.[0],
  ]);
  const output1 = await res.next();

  const output2 = await output1.next();
  const output3 = await output2.next();
};

main();
