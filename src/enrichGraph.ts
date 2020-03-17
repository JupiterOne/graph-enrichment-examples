import { retry } from '@lifeomic/attempt';

const JupiterOneClient = require('@jupiterone/jupiterone-client-nodejs');

const {
  J1_USER_POOL_ID: poolId,
  J1_CLIENT_ID: clientId,
  J1_ACCOUNT_ID: account,
  J1_API_TOKEN: accessToken,
  J1_USERNAME: username,
  J1_PASSWORD: password
} = process.env;

type KeyValuePair = { [key: string]: any };

export interface EnrichmentRule {
  query: string;
  whenFound: KeyValuePair;
  notFound: KeyValuePair;
}

export default async function enrichGraph(
  baseQuery: string, 
  enrichmentRules: EnrichmentRule[]
) {
  const retryOptions = { 
    initialDelay: 1000, 
    delay: 2000, 
    factor: 1.5, 
    maxAttempts: 10,
  };

  const j1Client =
    await (new JupiterOneClient(
      { account, username, password, poolId, clientId, accessToken }
    )).init();

  const entities: any[] = await j1Client.queryV1(baseQuery);
  let count = 0;
  let updated = 0;

  for (const entity of entities || []) {
    count++;
    console.log(`Processing entities ${count} of ${entities.length}:`);
    console.log(`${entity.entity._type} ${entity.entity.displayName}`);

    const entityId = entity.entity._id;
    const entityKey = entity.entity._key;
    
    for (const r of enrichmentRules) {
      const query = r.query
        .replace('{{entityId}}', entityId)
        .replace('{{entityKey}}', entityKey)
        .replace(/\n/g, ' ');

      let result;
      await retry(async () => {
        result = await j1Client.queryV1(query);
      }, retryOptions);
      
      if (result && result.length === 1) {
        if (diff(entity.properties, r.whenFound)) {
          console.log(`>>> updating entity properties`);
          console.log({ ...r.whenFound });
          await retry(async () => {
            await j1Client.updateEntity(entityId, r.whenFound);
          }, retryOptions);
          updated++;
        }
      }
      else {
        if (diff(entity.properties, r.notFound)) {
          console.log(`>>> updating entity properties`);
          console.log({ ...r.notFound });
          await retry(async () => {
            await j1Client.updateEntity(entityId, r.notFound);
          }, retryOptions);
          updated++;
        }
      }
    }
  }

  console.log(`Finished processing. Updated ${updated} of ${entities.length} entities.`);
}

function diff(source: any, properties: any): boolean {
  if (source && properties) {
    for (const [key, value] of Object.entries(properties)) {
      if (value === null && source[key] === undefined) {
        continue;
      }
      else if (source[key] !== value) {
        return true;
      }
    }
  }
  return false;
}