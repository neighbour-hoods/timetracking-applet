import initGraphQLClient, { ClientOptions } from '@vf-ui/graphql-client-holochain'
import { ApolloClient, NormalizedCacheObject } from '@apollo/client/core'

export class GraphQLClientProvider {
  client?: ApolloClient<NormalizedCacheObject>
  error?: Error

  constructor(opts: ClientOptions) {
    initGraphQLClient(opts)
      .then(c => this.client = c)
      .catch(e => this.error = e)
  }
}
