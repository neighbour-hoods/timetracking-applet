import { consume } from "@lit-labs/context";
import { property } from "lit/decorators.js";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html, css } from "lit";
import { ApolloQueryController } from '@apollo-elements/core';
import { gql } from '@apollo/client/core';
import { EconomicEventConnection } from '@valueflows/vf-graphql';

import { hreaGraphQLContext } from "../contexts";
import { ApolloClient, NormalizedCacheObject } from "../provider-graphql-client";

const EventsQuery = gql`
query {
  economicEvents(last: 10) {
    pageInfo {
      startCursor
      endCursor
    }
    edges {
      cursor

			# Requires \`hrea_observation\` module.
      node {
				# identifiers
        id
				revisionId

				# primary description
        note

				# when was the work done?
        hasBeginning
        hasEnd
        hasPointInTime

				# type of work being done, more freeform / ad-hoc version
        resourceClassifiedAs

				# how much work being done, specified in https://github.com/HajoRijgersberg/OM -compatible format
        effortQuantity {
          hasNumericalValue
          hasUnit {
            id
            label
            symbol
          }
        }

        # :TODO: triggeredBy & event adjustments

				# Requires \`hrea_specification\` module or a simple hardcoded shim resolver.
				# :TODO: link 'core VF Action type resolvers' package once it exists

					# action {
					#   id
					#   label
					# }

				# Requires \`hrea_specification\` module.

					# resourceSpecifiedAs {
					# 	id
					# 	revisionId
					#		name
					# }

				# Requires \`hrea_agent\` module.

					# provider {
					#   id
					#   name
					# }
					# receiver {
					#   id
					#   name
					# }
      }
    }
  }
}
`

export class ProviderComponent extends ScopedElementsMixin(LitElement) {
    // :NOTE: contextProvided has no effect here, is pulled from window.__APOLLO_CLIENT__ and assigned by Apollo controllers.
    //        @see https://github.com/lit/lit/issues/2446#issuecomment-1408143222
		@consume({ context: hreaGraphQLContext, subscribe: true })
    @property({ attribute: false })
    client!: ApolloClient<NormalizedCacheObject>

    entries?: ApolloQueryController<{ economicEvents: EconomicEventConnection }> = new ApolloQueryController(this, EventsQuery)

    render() {
        if (this.entries?.error) {
          return html`
            <div>
              <h3>Error!</h3>
              <p>${this.entries.error.toString()}</p>
            </div>
          `
        }
				if (!this.entries?.data || this.entries?.loading) {
          return html`
            <div>
              <p>Loading...</p>
            </div>
          `
        }
				if ((this.entries?.data?.economicEvents?.edges || []).length == 0) {
          return html`
            <div>
              <p>Nothing tracked yet!</p>
            </div>
          `
        }
        return html`
          <div>
            <p1>this is a provider component!</p1>
          </div>
        `
    }

    static get scopedElements() {
        return {
        };
	}

	static styles = css`
	`
}
