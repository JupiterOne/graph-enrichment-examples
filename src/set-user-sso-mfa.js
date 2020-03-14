'use strict';

const sleep = require('sleep');
const JupiterOneClient = require('@jupiterone/jupiterone-client-nodejs');

const {
  J1_USER_POOL_ID: poolId,
  J1_CLIENT_ID: clientId,
  J1_ACCOUNT_ID: account,
  J1_API_TOKEN: accessToken,
  J1_USERNAME: username,
  J1_PASSWORD: password
} = process.env;

/**
 * The starting query to find a set of entities to enrich
 */
const baseQuery = `Find User with _integrationClass!='SSO'`;

/**
 * A collection of enrichment rules. 
 * Based on the query result of each rule, set properties on match or noMatch.
 */
const enrichmentRules = [
  {
    query: `Find * with _key='{{entityKey}}' as userA 
that has Account 
  that connects Application with _integrationClass='SSO'
  that ASSIGNED User as userB
where 
  userA.name = userB.name or userA.username = userB.username`,
    whenFound: {
      ssoUser: true
    },
    notFound: {
      ssoUser: false
    },
  },
  {
    query: `Find * with _key='{{entityKey}}' and ssoUser=true as userA 
  that has Account 
  that connects Application with _integrationClass='SSO'
  that assigned User as userB
  that (assigned|has) mfa_device
where 
  userA.name = userB.name or userA.username = userB.username`,
    whenFound: {
      mfaEnabled: true
    },
    notFound: {
      mfaEnabled: null
    }
  }
]

async function main() {
  const j1Client =
    await (new JupiterOneClient(
      { account, username, password, poolId, clientId, accessToken }
    )).init();

  const entities = await j1Client.queryV1(baseQuery);
  let count = 0;

  for (const entity of entities || []) {
    count++;
    console.log(`Processing entities ${count} of ${entities.length}:`);
    console.log(`${entity.entity._type} ${entity.entity.displayName}`);

    const entityId = entity.entity._id;
    const entityKey = entity.entity._key;
    
    for (const r of enrichmentRules) {
      const query = r.query.replace('{{entityKey}}', entityKey).replace(/\n/g, ' ');
      const result = await j1Client.queryV1(query);
      
      if (result && result.length === 1) {
        await j1Client.updateEntity(entityId, r.whenFound);
      }
      else {
        await j1Client.updateEntity(entityId, r.notFound);
      }
      
      sleep.sleep(2); // to stay within 1 query/sec rate limit
    }
  }
}

main();
