# graph-enrichment-examples

This repo contains a script to "enrich" the graph entity in your JupiterOne
account and a set of examples.

Each example contains two main elements:

* `baseQuery` -- the query to obtain a list of entities to be enriched.

* `enrichmentRules` -- a set of rules, where each rule contains a condition
  query and one or more properties to set when a match is found or not found.

  The condition query in each rule should has either `_key='{{entityKey}}'` or
  `_id='{{entityId}}'` filter.

## Examples

The following examples are included:

### `setUserSSOandMFA`

For each `User` entity in your JupiterOne graph that is not a user of your
primiary SSO provider, do the following:

1. Check if an application is configured in the SSO account that connects it to
   the corresponding account of the originating user, and if there is a matching
   SSO user that is assigned the SSO application.

   If so, set `ssoUser` to `true` on the originating `User` entity.

1. Check if the matching user in the SSO account has MFA configured/assigned.

   If so, set `mfaEnabled` to `true` on the originating `User` entity.

## Run locally

1. Create a `.env` file in your local workspace with the following content:

   ```bash
   J1_ACCOUNT_ID=<your_jupiterone_account_id>
   J1_API_TOKEN=<your_jupiterone_api_token>
   ```

1. Update the query and enrichment rules as needed.

1. Run `yarn run:setUserSSOandMFA`
