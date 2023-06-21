import initGraphQLClient, { ClientOptions } from '@vf-ui/graphql-client-holochain'
import { VfModule } from '@valueflows/vf-graphql-holochain'
import { ApolloClient } from '@apollo/client/core'
import type { NormalizedCacheObject } from '@apollo/client/core'

import { ApolloClientElement } from '@apollo-elements/components/apollo-client'

export const provideGraphQLClient = (opts: ClientOptions): Promise<ApolloClient<NormalizedCacheObject>> =>
  initGraphQLClient({
    ...opts,
    enabledVFModules: [
      VfModule.Observation,
      VfModule.Measurement,
      VfModule.Agent,
      VfModule.Action,
      VfModule.ResourceSpecification,
      VfModule.ProcessSpecification,
    ],
  })
  .catch(e => {
    console.error('GraphQL client init error ', e)
    throw e
  })

export { ApolloClientElement, ApolloClient, NormalizedCacheObject }
