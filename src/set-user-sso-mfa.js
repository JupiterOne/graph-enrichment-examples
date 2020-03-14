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
 * Name of the SSO provider in all lowercase. Replace as appropriate.
 */
const ssoProvider = 'okta';

/**
 * The starting query to find a set of entities to enrich
 */
const baseQuery = `Find User with _type!='${ssoProvider}_user'`;

/**
 * A collection of enrichment rules. 
 *
 * Based on the query result of each rule, set certain properties when a
 * matching result is found or not found.
 */
const enrichmentRules = [
  {
    query: `Find User with _key='{{entityKey}}' as userA 
that has Account 
  that connects ${ssoProvider}_application
  that assigned ${ssoProvider}_user as userB
where 
  userA.name = userB.name or 
  userA.username = userB.username or
  userA.email = userB.email`,
    whenFound: {
      ssoUser: true
    },
    notFound: {
      ssoUser: false
    },
  },
  {
    query: `Find User with _key='{{entityKey}}' and ssoUser=true as userA 
  that has Account 
  that connects ${ssoProvider}_application
  that assigned ${ssoProvider}_user as userB
  that (assigned|has|uses) mfa_device
where 
  userA.name = userB.name or 
  userA.username = userB.username or
  userA.email = userB.email`,
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
