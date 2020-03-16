import enrichGraph, { EnrichmentRule } from './enrichGraph';

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
 * 
 * The condition query in each rule should have either `_key='{{entityKey}}'` or 
 * `_id='{{entityId}}'` filter.
 */
const enrichmentRules: EnrichmentRule[] = [
  {
    query: `Find User with _key='{{entityKey}}' as userA 
that has Account 
  that connects ${ssoProvider}_application
  that assigned ${ssoProvider}_user as userB
where 
  userA.name = userB.name or 
  userA.username = userB.username or
  userA.email = userB.email or
  userA.email = userB.login`,
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
  userA.email = userB.email or
  userA.email = userB.login`,
    whenFound: {
      mfaEnabled: true
    },
    notFound: {
      mfaEnabled: null
    }
  }
]

async function main() {
  await enrichGraph(baseQuery, enrichmentRules);
}

main().catch((err) =>
  console.error(err, 'Error running enrichGraph'));
