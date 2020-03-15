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
  enrichGraph(baseQuery, enrichmentRules);
}

main();
