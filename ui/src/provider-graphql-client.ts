import initGraphQLClient, { ClientOptions } from '@vf-ui/graphql-client-holochain'
import { ApolloClient, NormalizedCacheObject } from '@apollo/client/core'

export const provideGraphQLClient = (opts: ClientOptions): Promise<ApolloClient<NormalizedCacheObject>> =>
  initGraphQLClient(opts)
  .then(client => {
    // :SHONK: Assign window global used by @apollo-elements/core controllers.
    //         Due to https://github.com/lit/lit/issues/2446 such controllers can't be
    //         initialised dynamically after a component's `client` property has been
    //         assigned (which happens *after* the constructor is called).
    window.__APOLLO_CLIENT__ = client
    return client
  })
  .catch(e => {
    console.error('GraphQL client init error ', e)
    throw e
  })

export { ApolloClient, NormalizedCacheObject }
