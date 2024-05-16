import { Client } from "@opensearch-project/opensearch";
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
